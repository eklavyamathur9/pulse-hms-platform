from datetime import datetime, timedelta

from audit import log_action
from auth_utils import current_hospital_id, current_user, require_hospital_context, require_roles, user_claims
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from models import Hospital, RefreshToken, User, db
from pagination import get_pagination_params, paginate, paginated_response
from rate_limit import limiter
from superadmin_routes import PLAN_FEATURES
from validation import int_field, json_body, require_fields, safe_commit, validate_password_strength
from werkzeug.security import check_password_hash, generate_password_hash

auth_bp = Blueprint("auth", __name__)

MAX_LOGIN_ATTEMPTS = 5
ACCOUNT_LOCKOUT_MINUTES = 30


def make_tokens(user):
    access = create_access_token(identity=str(user.id), additional_claims=user_claims(user))
    refresh = create_refresh_token(identity=str(user.id), additional_claims=user_claims(user))
    store_refresh_token(user.id, refresh)
    return access, refresh


def store_refresh_token(user_id, raw_token):
    expires_at = datetime.utcnow() + timedelta(seconds=30 * 24 * 60 * 60)
    token = RefreshToken(
        user_id=user_id,
        token_hash=generate_password_hash(raw_token),
        expires_at=expires_at,
    )
    db.session.add(token)
    safe_commit()


def revoke_refresh_token(raw_token):
    tokens = RefreshToken.query.filter_by(is_revoked=False).all()
    for token in tokens:
        if check_password_hash(token.token_hash, raw_token):
            token.is_revoked = True
            safe_commit()
            return token
    return None


def user_json(user):
    return {
        "id": user.id,
        "role": user.role,
        "hospital_id": user.hospital_id,
        "name": user.name,
        "email": user.email,
        "contact": user.contact,
    }


@auth_bp.route("/register-hospital", methods=["POST"])
@limiter.limit("3 per hour")
def register_hospital():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "hospital_name", "subdomain", "admin_name", "email", "password")
    if error:
        return error, status
    password = data.get("password")
    pw_errors = validate_password_strength(password)
    if pw_errors:
        return jsonify({"error": "; ".join(pw_errors)}), 400
    hospital_name = data.get("hospital_name")
    subdomain = data.get("subdomain")
    admin_name = data.get("admin_name")
    email = data.get("email")

    existing_hospital = Hospital.query.filter_by(subdomain=subdomain).first()
    if existing_hospital:
        return jsonify({"error": "Subdomain already taken"}), 409

    new_hospital = Hospital(
        name=hospital_name,
        subdomain=subdomain,
        plan="trial",
        feature_flags=PLAN_FEATURES.get("trial", {}),
    )
    db.session.add(new_hospital)
    safe_commit()

    admin_user = User(
        hospital_id=new_hospital.id,
        role="admin",
        name=admin_name,
        email=email,
        password=generate_password_hash(password),
    )
    db.session.add(admin_user)
    safe_commit()

    return jsonify({"message": "Hospital registered successfully", "hospital_id": new_hospital.id}), 201


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per hour")
def register():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "name", "password", "hospital_id")
    if error:
        return error, status
    password = data.get("password")
    pw_errors = validate_password_strength(password)
    if pw_errors:
        return jsonify({"error": "; ".join(pw_errors)}), 400
    hospital_id, error, status = int_field(data, "hospital_id", minimum=1, required=True)
    if error:
        return error, status
    name = data.get("name")
    contact = data.get("contact")
    email = data.get("email")

    if not contact and not email:
        return jsonify({"error": "Contact number or email is required"}), 400

    user_filters = []
    if contact:
        user_filters.append(User.contact == contact)
    if email:
        user_filters.append(User.email == email)

    existing = (
        User.query.filter(User.hospital_id == hospital_id, db.or_(*user_filters)).first() if user_filters else None
    )

    if existing:
        return jsonify({"error": "An account with this contact/email already exists in this hospital"}), 409

    new_user = User(
        hospital_id=hospital_id,
        role="patient",
        name=name,
        contact=contact,
        email=email,
        password=generate_password_hash(password),
    )
    db.session.add(new_user)
    safe_commit()

    access, refresh = make_tokens(new_user)

    return jsonify(
        {
            "message": "Registration successful",
            "token": access,
            "refresh_token": refresh,
            "user": user_json(new_user),
        }
    ), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("20 per minute")
def login():
    """
    Authenticate a user
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - identifier
            - password
          properties:
            identifier:
              type: string
              example: doctor@hospital.test
            password:
              type: string
              example: pass123
            type:
              type: string
              example: staff
            hospital_id:
              type: integer
              example: 1
    responses:
      200:
        description: Login successful
        schema:
          type: object
          properties:
            message:
              type: string
            token:
              type: string
            refresh_token:
              type: string
            user:
              type: object
      400:
        description: Missing required fields
      401:
        description: Invalid credentials
    """
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "identifier", "password")
    if error:
        return error, status
    email_or_contact = data.get("identifier")
    password = data.get("password")
    role_type = data.get("type")
    hospital_id = data.get("hospital_id")

    if email_or_contact == "superadmin@pulsehms.com":
        user = User.query.filter_by(email=email_or_contact, role="superadmin").first()
    else:
        if not hospital_id:
            return jsonify({"error": "Hospital ID required"}), 400
        hospital_id, error, status = int_field(data, "hospital_id", minimum=1, required=True)
        if error:
            return error, status
        user = User.query.filter(
            User.hospital_id == hospital_id, db.or_(User.email == email_or_contact, User.contact == email_or_contact)
        ).first()

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds() // 60)
        return jsonify({"error": f"Account locked. Try again in {remaining} minute(s)."}), 429

    if not user.password or not check_password_hash(user.password, password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=ACCOUNT_LOCKOUT_MINUTES)
        safe_commit()
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 401

    if user.role != "superadmin":
        if role_type == "patient" and user.role != "patient":
            return jsonify({"error": "Invalid role type selected"}), 401
        if role_type == "staff" and user.role == "patient":
            return jsonify({"error": "Invalid role type selected"}), 401

    user.failed_login_attempts = 0
    user.locked_until = None
    safe_commit()

    access, refresh = make_tokens(user)

    return jsonify(
        {
            "message": "Login successful",
            "token": access,
            "refresh_token": refresh,
            "user": user_json(user),
        }
    )


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = int(get_jwt_identity())
    raw_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not raw_token:
        return jsonify({"error": "Refresh token required"}), 401

    stored = revoke_refresh_token(raw_token)
    if not stored:
        return jsonify({"error": "Invalid or revoked refresh token"}), 401

    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return jsonify({"error": "User not found or inactive"}), 401

    access, refresh = make_tokens(user)

    return jsonify({"token": access, "refresh_token": refresh})


@auth_bp.route("/logout", methods=["POST"])
@jwt_required(refresh=True)
def logout():
    raw_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if raw_token:
        revoke_refresh_token(raw_token)
    return jsonify({"message": "Logged out successfully"})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user_json(user)})


@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "current_password", "new_password")
    if error:
        return error, status
    user = current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not user.password or not check_password_hash(user.password, data["current_password"]):
        return jsonify({"error": "Current password is incorrect"}), 401
    pw_errors = validate_password_strength(data["new_password"])
    if pw_errors:
        return jsonify({"error": "; ".join(pw_errors)}), 400
    user.password = generate_password_hash(data["new_password"])
    user.password_changed_at = datetime.utcnow()
    safe_commit()
    RefreshToken.query.filter_by(user_id=user.id, is_revoked=False).update({"is_revoked": True})
    safe_commit()
    return jsonify({"message": "Password changed successfully. Please log in again."})


@auth_bp.route("/doctors", methods=["GET"])
@jwt_required()
def get_doctors():
    from models import Rating

    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    page, per_page = get_pagination_params()
    query = User.query.filter_by(hospital_id=hospital_id, role="doctor", is_active=True, is_available=True)
    doctors, total, p, pp, pages = paginate(query, page, per_page)
    result = []
    for doc in doctors:
        avg = db.session.query(db.func.avg(Rating.stars)).filter(Rating.doctor_id == doc.id).scalar()
        count = Rating.query.filter_by(doctor_id=doc.id).count()
        result.append(
            {
                "id": doc.id,
                "name": doc.name,
                "specialization": doc.specialization,
                "qualification": doc.qualification,
                "experience_years": doc.experience_years,
                "consultation_fee": doc.consultation_fee,
                "bio": doc.bio,
                "avg_rating": round(avg, 1) if avg else None,
                "rating_count": count,
            }
        )
    return paginated_response(result, total, p, pp, pages)


@auth_bp.route("/doctors/all", methods=["GET"])
@jwt_required()
def get_all_doctors():
    from models import Rating

    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    page, per_page = get_pagination_params()
    query = User.query.filter_by(hospital_id=hospital_id, role="doctor", is_active=True)
    doctors, total, p, pp, pages = paginate(query, page, per_page)
    result = []
    for doc in doctors:
        avg = db.session.query(db.func.avg(Rating.stars)).filter(Rating.doctor_id == doc.id).scalar()
        count = Rating.query.filter_by(doctor_id=doc.id).count()
        result.append(
            {
                "id": doc.id,
                "name": doc.name,
                "specialization": doc.specialization,
                "qualification": doc.qualification,
                "experience_years": doc.experience_years,
                "consultation_fee": doc.consultation_fee,
                "bio": doc.bio,
                "is_available": doc.is_available,
                "avg_rating": round(avg, 1) if avg else None,
                "rating_count": count,
            }
        )
    return paginated_response(result, total, p, pp, pages)


@auth_bp.route("/admin/users", methods=["GET"])
@require_roles("admin", "doctor", "superadmin")
def get_all_users():
    user = current_user()
    page, per_page = get_pagination_params()
    if user.role == "superadmin":
        query = User.query
    elif user.role == "doctor":
        query = User.query.filter_by(id=user.id, hospital_id=user.hospital_id)
    else:
        query = User.query.filter_by(hospital_id=user.hospital_id)
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


@auth_bp.route("/admin/users", methods=["POST"])
@require_roles("admin", "superadmin")
def create_user():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "name")
    if error:
        return error, status
    password = data.get("password", "changeme")
    if password != "changeme":  # noqa: S105
        pw_errors = validate_password_strength(password)
        if pw_errors:
            return jsonify({"error": "; ".join(pw_errors)}), 400
    hospital_id = current_hospital_id()
    if current_user().role == "superadmin" and data.get("hospital_id"):
        hospital_id, error, status = int_field(data, "hospital_id", minimum=1, required=True)
        if error:
            return error, status
    if hospital_id is None:
        return jsonify({"error": "hospital_id is required to create a user"}), 400
    existing = User.query.filter(
        User.hospital_id == hospital_id,
        db.or_(
            User.email == data.get("email") if data.get("email") else False,
            User.contact == data.get("contact") if data.get("contact") else False,
        ),
    ).first()
    if existing:
        return jsonify({"error": "User with this email/contact already exists"}), 409

    new_user = User(
        hospital_id=hospital_id,
        role=data.get("role", "staff"),
        name=data["name"],
        email=data.get("email"),
        contact=data.get("contact"),
        password=generate_password_hash(password),
        specialization=data.get("specialization"),
    )
    db.session.add(new_user)
    safe_commit()
    log_action(
        hospital_id=hospital_id,
        user_id=current_user().id,
        action="create_user",
        resource_type="user",
        resource_id=new_user.id,
        details={"role": new_user.role, "name": new_user.name},
    )
    return jsonify({"message": "User created", "id": new_user.id}), 201


@auth_bp.route("/admin/users/<int:user_id>", methods=["PUT"])
@require_roles("admin", "superadmin")
def update_user(user_id):
    data, error, status = json_body()
    if error:
        return error, status
    user = (
        User.query.get(user_id)
        if current_user().role == "superadmin"
        else User.query.filter_by(id=user_id, hospital_id=current_hospital_id()).first()
    )
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role == "superadmin" and current_user().id != user.id:
        return jsonify({"error": "Superadmin accounts cannot be managed from tenant user screens"}), 403
    user.name = data.get("name", user.name)
    user.email = data.get("email", user.email)
    user.contact = data.get("contact", user.contact)
    user.specialization = data.get("specialization", user.specialization)
    user.role = data.get("role", user.role)
    user.is_available = data.get("is_available", user.is_available)
    user.is_active = data.get("is_active", user.is_active)
    safe_commit()
    log_action(
        hospital_id=user.hospital_id,
        user_id=current_user().id,
        action="update_user",
        resource_type="user",
        resource_id=user.id,
        details={k: data.get(k) for k in ("name", "email", "role", "is_active") if k in data},
    )
    return jsonify({"message": "User updated"})


@auth_bp.route("/admin/users/<int:user_id>/deactivate", methods=["PUT"])
@require_roles("admin", "superadmin")
def deactivate_user(user_id):
    user = (
        User.query.get(user_id)
        if current_user().role == "superadmin"
        else User.query.filter_by(id=user_id, hospital_id=current_hospital_id()).first()
    )
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role == "superadmin":
        return jsonify({"error": "Superadmin accounts cannot be deactivated from tenant user screens"}), 403
    user.is_active = not user.is_active
    safe_commit()
    RefreshToken.query.filter_by(user_id=user.id, is_revoked=False).update({"is_revoked": True})
    safe_commit()
    log_action(
        hospital_id=user.hospital_id,
        user_id=current_user().id,
        action="deactivate_user",
        resource_type="user",
        resource_id=user.id,
        details={"is_active": user.is_active},
    )
    return jsonify({"message": f"User {'activated' if user.is_active else 'deactivated'}"})
