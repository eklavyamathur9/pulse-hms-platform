from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import emit, join_room
from models import Appointment, LabTest, Prescription, User, db

socket_sessions = {}


def tenant_room(hospital_id):
    return f"hospital:{hospital_id}"


def socket_context():
    return socket_sessions.get(request.sid)


def require_socket_roles(*roles):
    ctx = socket_context()
    if not ctx or ctx.get("role") not in roles:
        emit("auth_error", {"error": "Unauthorized socket action"})
        return None
    return ctx


def socket_payload(data):
    if not isinstance(data, dict):
        emit("action_error", {"error": "Valid event payload is required"})
        return None
    return data


def tenant_appointment(appt_id, hospital_id):
    return Appointment.query.filter_by(id=appt_id, hospital_id=hospital_id).first()


def tenant_lab_test(test_id, hospital_id):
    return LabTest.query.filter_by(id=test_id, hospital_id=hospital_id).first()


def tenant_prescription(rx_id, hospital_id):
    return Prescription.query.filter_by(id=rx_id, hospital_id=hospital_id).first()


def handle_connect(auth=None):
    token = (auth or {}).get("token")
    if not token:
        return False
    try:
        decoded = decode_token(token)
        user_id = int(decoded["sub"])
        user = db.session.get(User, user_id)
        if not user or not user.is_active:
            return False
        ctx = {"user_id": user.id, "role": user.role, "hospital_id": user.hospital_id}
        socket_sessions[request.sid] = ctx
        join_room(tenant_room(user.hospital_id))
        print(f"Client connected: user={user.id} role={user.role} hospital={user.hospital_id}")
    except Exception:
        return False


def handle_disconnect():
    socket_sessions.pop(request.sid, None)
