from audit import log_action
from auth_utils import current_user, require_roles
from cache import cache
from flask import Blueprint, jsonify
from middleware import query_timeout
from models import Appointment, Hospital, Invoice, Payment, User, db
from pagination import get_pagination_params, paginate, paginated_response
from validation import json_body, require_fields, safe_commit, validate_password_strength
from werkzeug.security import generate_password_hash

superadmin_bp = Blueprint("superadmin", __name__)

PLAN_FEATURES = {
    "trial": {
        "max_users": 10,
        "max_doctors": 3,
        "analytics": False,
        "billing_module": False,
        "export_data": False,
        "custom_branding": False,
        "api_access": False,
    },
    "basic": {
        "max_users": 50,
        "max_doctors": 10,
        "analytics": True,
        "billing_module": True,
        "export_data": False,
        "custom_branding": False,
        "api_access": False,
    },
    "pro": {
        "max_users": 200,
        "max_doctors": 50,
        "analytics": True,
        "billing_module": True,
        "export_data": True,
        "custom_branding": True,
        "api_access": False,
    },
    "enterprise": {
        "max_users": 1000,
        "max_doctors": 200,
        "analytics": True,
        "billing_module": True,
        "export_data": True,
        "custom_branding": True,
        "api_access": True,
    },
}


def hospital_stats(hospital):
    user_counts = {}
    for role in ("patient", "doctor", "staff", "admin"):
        user_counts[role] = User.query.filter_by(hospital_id=hospital.id, role=role, is_active=True).count()
    total_users = User.query.filter_by(hospital_id=hospital.id, is_active=True).count()
    appointment_count = Appointment.query.filter_by(hospital_id=hospital.id).count()
    paid_invoices = Invoice.query.filter_by(hospital_id=hospital.id, status="Paid").count()
    total_revenue = (
        db.session.query(db.func.coalesce(db.func.sum(Payment.amount), 0))
        .filter(Payment.hospital_id == hospital.id, Payment.status == "completed")
        .scalar()
    )
    return {
        "doctors": user_counts.get("doctor", 0),
        "patients": user_counts.get("patient", 0),
        "staff": user_counts.get("staff", 0),
        "total_users": total_users,
        "appointments": appointment_count,
        "paid_invoices": paid_invoices,
        "revenue": float(total_revenue),
    }


@superadmin_bp.route("/stats", methods=["GET"])
@require_roles("superadmin")
@query_timeout(15)
@cache.cached(timeout=60, query_string=True)
def platform_stats():
    hospitals = Hospital.query.all()
    total_hospitals = len(hospitals)
    active_hospitals = sum(1 for h in hospitals if h.is_active)
    total_users = User.query.filter_by(is_active=True).count()
    users_by_role = {}
    for role in ("patient", "doctor", "staff", "admin", "superadmin"):
        users_by_role[role] = User.query.filter_by(role=role, is_active=True).count()
    total_appointments = Appointment.query.count()
    total_revenue = (
        db.session.query(db.func.coalesce(db.func.sum(Payment.amount), 0))
        .filter(Payment.status == "completed")
        .scalar()
    )
    total_invoices = Invoice.query.count()
    paid_invoices = Invoice.query.filter_by(status="Paid").count()
    return jsonify(
        {
            "hospitals": {
                "total": total_hospitals,
                "active": active_hospitals,
                "inactive": total_hospitals - active_hospitals,
            },
            "users": {
                "total": total_users,
                **users_by_role,
            },
            "appointments": {
                "total": total_appointments,
            },
            "revenue": {
                "total": float(total_revenue),
                "total_invoices": total_invoices,
                "paid_invoices": paid_invoices,
            },
        }
    )


@superadmin_bp.route("/hospitals", methods=["GET"])
@require_roles("superadmin")
def list_hospitals():
    page, per_page = get_pagination_params()
    query = Hospital.query.order_by(Hospital.created_at.desc())
    hospitals, total, p, pp, pages = paginate(query, page, per_page)
    result = []
    for h in hospitals:
        stats = hospital_stats(h)
        result.append(
            {
                "id": h.id,
                "name": h.name,
                "subdomain": h.subdomain,
                "plan": h.plan,
                "is_active": h.is_active,
                "feature_flags": h.feature_flags or PLAN_FEATURES.get(h.plan, {}),
                "created_at": h.created_at.isoformat() if h.created_at else None,
                "stats": stats,
            }
        )
    return paginated_response(result, total, p, pp, pages)


@superadmin_bp.route("/hospitals/<int:hospital_id>", methods=["GET"])
@require_roles("superadmin")
def get_hospital(hospital_id):
    hospital = db.session.get(Hospital, hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found"}), 404
    stats = hospital_stats(hospital)
    return jsonify(
        {
            "id": hospital.id,
            "name": hospital.name,
            "subdomain": hospital.subdomain,
            "plan": hospital.plan,
            "is_active": hospital.is_active,
            "feature_flags": hospital.feature_flags or PLAN_FEATURES.get(hospital.plan, {}),
            "created_at": hospital.created_at.isoformat() if hospital.created_at else None,
            "stats": stats,
        }
    )


@superadmin_bp.route("/hospitals", methods=["POST"])
@require_roles("superadmin")
def create_hospital():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "name", "subdomain", "admin_name", "admin_email", "admin_password")
    if error:
        return error, status
    pw_errors = validate_password_strength(data["admin_password"])
    if pw_errors:
        return jsonify({"error": "; ".join(pw_errors)}), 400
    existing = Hospital.query.filter_by(subdomain=data["subdomain"]).first()
    if existing:
        return jsonify({"error": "Subdomain already taken"}), 409
    plan = data.get("plan", "trial")
    if plan not in PLAN_FEATURES:
        return jsonify({"error": f"Invalid plan. Choose from: {', '.join(PLAN_FEATURES.keys())}"}), 400
    features = PLAN_FEATURES[plan]
    hospital = Hospital(
        name=data["name"],
        subdomain=data["subdomain"],
        plan=plan,
        is_active=True,
        feature_flags=features,
    )
    db.session.add(hospital)
    db.session.flush()
    admin_user = User(
        hospital_id=hospital.id,
        role="admin",
        name=data["admin_name"],
        email=data["admin_email"],
        password=generate_password_hash(data["admin_password"]),
    )
    db.session.add(admin_user)
    safe_commit()
    log_action(
        hospital_id=hospital.id,
        user_id=current_user().id,
        action="create_hospital",
        resource_type="hospital",
        resource_id=hospital.id,
        details={"name": hospital.name, "plan": hospital.plan, "admin": data["admin_name"]},
    )
    return jsonify(
        {
            "message": "Hospital created successfully",
            "hospital": {
                "id": hospital.id,
                "name": hospital.name,
                "subdomain": hospital.subdomain,
                "plan": hospital.plan,
                "is_active": hospital.is_active,
            },
        }
    ), 201


@superadmin_bp.route("/hospitals/<int:hospital_id>", methods=["PUT"])
@require_roles("superadmin")
def update_hospital(hospital_id):
    hospital = db.session.get(Hospital, hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found"}), 404
    data, error, status = json_body()
    if error:
        return error, status
    if "name" in data:
        hospital.name = data["name"]
    if "subdomain" in data:
        existing = Hospital.query.filter(Hospital.subdomain == data["subdomain"], Hospital.id != hospital_id).first()
        if existing:
            return jsonify({"error": "Subdomain already taken"}), 409
        hospital.subdomain = data["subdomain"]
    if "plan" in data:
        if data["plan"] not in PLAN_FEATURES:
            return jsonify({"error": f"Invalid plan. Choose from: {', '.join(PLAN_FEATURES.keys())}"}), 400
        hospital.plan = data["plan"]
        hospital.feature_flags = PLAN_FEATURES[data["plan"]]
    if "is_active" in data:
        hospital.is_active = bool(data["is_active"])
    safe_commit()
    log_action(
        hospital_id=hospital.id,
        user_id=current_user().id,
        action="update_hospital",
        resource_type="hospital",
        resource_id=hospital.id,
        details={k: data.get(k) for k in ("name", "plan", "is_active", "subdomain") if k in data},
    )
    stats = hospital_stats(hospital)
    return jsonify(
        {
            "message": "Hospital updated",
            "hospital": {
                "id": hospital.id,
                "name": hospital.name,
                "subdomain": hospital.subdomain,
                "plan": hospital.plan,
                "is_active": hospital.is_active,
                "feature_flags": hospital.feature_flags or PLAN_FEATURES.get(hospital.plan, {}),
                "stats": stats,
            },
        }
    )


@superadmin_bp.route("/hospitals/<int:hospital_id>/users", methods=["GET"])
@require_roles("superadmin")
def get_hospital_users(hospital_id):
    hospital = db.session.get(Hospital, hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found"}), 404
    page, per_page = get_pagination_params()
    query = User.query.filter_by(hospital_id=hospital_id).order_by(User.role, User.name)
    users, total, p, pp, pages = paginate(query, page, per_page)
    result = [
        {
            "id": u.id,
            "role": u.role,
            "name": u.name,
            "email": u.email,
            "contact": u.contact,
            "specialization": u.specialization,
            "is_available": u.is_available,
            "is_active": u.is_active,
        }
        for u in users
    ]
    return paginated_response(result, total, p, pp, pages)
