import secrets
from datetime import datetime

from auth_utils import current_hospital_id, current_user, require_roles, tenant_get
from flask import Blueprint, jsonify, request
from models import Teleconsultation, db
from validation import int_field, json_body, require_fields

telemedicine_bp = Blueprint("telemedicine", __name__)


def _room_name():
    return f"pulse-{secrets.token_hex(12)}"


@telemedicine_bp.route("/telemedicine/rooms", methods=["POST"])
@require_roles("doctor", "admin", "superadmin")
def create_room():
    hospital_id = current_hospital_id()
    if not hospital_id:
        return jsonify({"error": "hospital_id is required"}), 400

    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "appointment_id", "patient_id")
    if error:
        return error, status

    appointment_id, error, status = int_field(data, "appointment_id", minimum=1, required=True)
    if error:
        return error, status
    patient_id, error, status = int_field(data, "patient_id", minimum=1, required=True)
    if error:
        return error, status

    existing = Teleconsultation.query.filter_by(appointment_id=appointment_id, hospital_id=hospital_id).first()
    if existing:
        return jsonify(
            {
                "message": "Room already exists",
                "teleconsultation": {
                    "id": existing.id,
                    "room_name": existing.room_name,
                    "status": existing.status,
                    "meeting_url": existing.meeting_url,
                },
            }
        )

    room_name = _room_name()
    provider = data.get("provider", "jitsi")

    tc = Teleconsultation(
        hospital_id=hospital_id,
        appointment_id=appointment_id,
        doctor_id=current_user().id,
        patient_id=patient_id,
        room_name=room_name,
        provider=provider,
        scheduled_at=datetime.fromisoformat(data["scheduled_at"]) if data.get("scheduled_at") else None,
    )

    if provider == "jitsi":
        tc.meeting_url = f"https://meet.jit.si/{room_name}"

    db.session.add(tc)
    db.session.commit()

    return jsonify(
        {
            "message": "Teleconsultation room created",
            "teleconsultation": {
                "id": tc.id,
                "room_name": tc.room_name,
                "provider": tc.provider,
                "status": tc.status,
                "meeting_url": tc.meeting_url,
                "scheduled_at": tc.scheduled_at.isoformat() if tc.scheduled_at else None,
            },
        }
    ), 201


@telemedicine_bp.route("/telemedicine/rooms", methods=["GET"])
@require_roles("doctor", "patient", "admin", "superadmin")
def list_rooms():
    hospital_id = current_hospital_id()
    user = current_user()
    query = Teleconsultation.query.filter_by(hospital_id=hospital_id)

    if user.role == "doctor":
        query = query.filter_by(doctor_id=user.id)
    elif user.role == "patient":
        query = query.filter_by(patient_id=user.id)

    status_filter = request.args.get("status")
    if status_filter:
        query = query.filter_by(status=status_filter)

    rooms = query.order_by(Teleconsultation.scheduled_at.desc().nullslast()).all()

    return jsonify(
        {
            "teleconsultations": [
                {
                    "id": r.id,
                    "appointment_id": r.appointment_id,
                    "room_name": r.room_name,
                    "provider": r.provider,
                    "status": r.status,
                    "meeting_url": r.meeting_url,
                    "scheduled_at": r.scheduled_at.isoformat() if r.scheduled_at else None,
                    "started_at": r.started_at.isoformat() if r.started_at else None,
                    "ended_at": r.ended_at.isoformat() if r.ended_at else None,
                }
                for r in rooms
            ]
        }
    )


@telemedicine_bp.route("/telemedicine/rooms/<int:room_id>/start", methods=["POST"])
@require_roles("doctor", "admin")
def start_consultation(room_id):
    hospital_id = current_hospital_id()
    tc = tenant_get(Teleconsultation, room_id)
    if not tc or tc.hospital_id != hospital_id:
        return jsonify({"error": "Room not found"}), 404

    if tc.status != "scheduled":
        return jsonify({"error": f"Room is already {tc.status}"}), 400

    tc.status = "in_progress"
    tc.started_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Consultation started"})


@telemedicine_bp.route("/telemedicine/rooms/<int:room_id>/end", methods=["POST"])
@require_roles("doctor", "admin")
def end_consultation(room_id):
    hospital_id = current_hospital_id()
    tc = tenant_get(Teleconsultation, room_id)
    if not tc or tc.hospital_id != hospital_id:
        return jsonify({"error": "Room not found"}), 404

    tc.status = "completed"
    tc.ended_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Consultation ended"})


@telemedicine_bp.route("/telemedicine/rooms/<int:room_id>/notes", methods=["PUT"])
@require_roles("doctor", "admin")
def update_notes(room_id):
    hospital_id = current_hospital_id()
    tc = tenant_get(Teleconsultation, room_id)
    if not tc or tc.hospital_id != hospital_id:
        return jsonify({"error": "Room not found"}), 404

    data, error, status = json_body()
    if error:
        return error, status
    tc.notes = data.get("notes", tc.notes)
    db.session.commit()

    return jsonify({"message": "Notes updated"})
