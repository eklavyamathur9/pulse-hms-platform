from auth_utils import current_hospital_id, current_user, forbidden, require_hospital_context, require_roles
from flask import Blueprint, jsonify
from models import Appointment, User, db
from pagination import get_pagination_params, paginate, paginated_response
from sqlalchemy.orm import joinedload
from validation import int_field, json_body, safe_commit

patient_bp = Blueprint("patient", __name__)


def can_access_patient(patient_id):
    user = current_user()
    if user.role in ("admin", "staff", "superadmin") or user.id == patient_id:
        return True
    if user.role == "doctor":
        return (
            Appointment.query.filter_by(
                hospital_id=current_hospital_id(), patient_id=patient_id, doctor_id=user.id
            ).first()
            is not None
        )
    return False


@patient_bp.route("/<int:patient_id>/appointments", methods=["GET"])
@require_roles("patient", "admin", "staff", "doctor", "superadmin")
def get_patient_appointments(patient_id):
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    if not can_access_patient(patient_id):
        return forbidden("You can only access your own appointments")
    query = Appointment.query.filter_by(patient_id=patient_id, hospital_id=hospital_id)
    user = current_user()
    if user.role == "doctor":
        query = query.filter_by(doctor_id=user.id)
    page, per_page = get_pagination_params()
    appts, total, p, pp, pages = paginate(query.order_by(Appointment.id.desc()), page, per_page)
    result = [
        {
            "id": a.id,
            "doctor_id": a.doctor_id,
            "date": a.date_str,
            "time": a.time_str,
            "status": a.status,
            "symptoms": a.symptoms,
            "pain_level": a.pain_level,
            "followup_days": a.followup_days,
        }
        for a in appts
    ]
    return paginated_response(result, total, p, pp, pages)


@patient_bp.route("/<int:patient_id>/prescriptions", methods=["GET"])
@require_roles("patient", "admin", "staff", "doctor", "superadmin")
def get_patient_prescriptions(patient_id):
    from models import Prescription, User

    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    if not can_access_patient(patient_id):
        return forbidden("You can only access your own prescriptions")
    query = Prescription.query.filter_by(patient_id=patient_id, hospital_id=hospital_id).options(
        joinedload(Prescription.doctor_rx)
    )
    user = current_user()
    if user.role == "doctor":
        query = query.filter_by(doctor_id=user.id)
    page, per_page = get_pagination_params()
    prescriptions, total, p, pp, pages = paginate(query.order_by(Prescription.id.desc()), page, per_page)
    result = []
    for rx in prescriptions:
        doc = rx.doctor_rx
        result.append(
            {
                "id": rx.id,
                "appointment_id": rx.appointment_id,
                "medication_details": rx.medication,
                "digital_signature": f"Dr. {doc.name}" if doc else "Signature Verify Failed",
                "issued_at": rx.created_at,
            }
        )
    return paginated_response(result, total, p, pp, pages)


@patient_bp.route("/<int:patient_id>/profile", methods=["PUT"])
@require_roles("patient", "admin", "superadmin")
def update_patient_profile(patient_id):
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    if not can_access_patient(patient_id):
        return forbidden("You can only update your own profile")
    data, error, status = json_body()
    if error:
        return error, status
    user = User.query.filter_by(id=patient_id, hospital_id=hospital_id).first()
    if not user or user.role != "patient":
        return jsonify({"error": "Patient not found"}), 404

    user.name = data.get("name", user.name)
    user.contact = data.get("contact", user.contact)
    age, error, status = int_field(data, "age", minimum=0, maximum=130)
    if error:
        return error, status
    user.age = age if age is not None else user.age
    user.gender = data.get("gender", user.gender)
    user.blood_type = data.get("blood_type", user.blood_type)
    user.height = data.get("height", user.height)
    user.weight_baseline = data.get("weight_baseline", user.weight_baseline)
    user.allergies = data.get("allergies", user.allergies)

    safe_commit()

    return jsonify(
        {
            "status": "success",
            "user": {
                "id": user.id,
                "role": user.role,
                "name": user.name,
                "email": user.email,
                "contact": user.contact,
                "age": user.age,
                "gender": user.gender,
                "blood_type": user.blood_type,
                "height": user.height,
                "weight_baseline": user.weight_baseline,
                "allergies": user.allergies,
            },
        }
    )
