from datetime import datetime

from audit import log_action
from flask import g
from flask_socketio import emit
from models import Appointment, Invoice, User, db

from services import (
    require_socket_roles,
    socket_payload,
    tenant_appointment,
    tenant_room,
)


def register(socketio):
    @socketio.on("action_book_appointment")
    def handle_book_appointment(data):
        ctx = require_socket_roles("patient")
        if not ctx:
            return
        data = socket_payload(data)
        if data is None:
            return
        if not data.get("patientId") or not data.get("doctorId"):
            emit("action_error", {"error": "patientId and doctorId are required"})
            return
        if data.get("patientId") != ctx["user_id"]:
            emit("auth_error", {"error": "Patients can only book for themselves"})
            return

        patient = User.query.filter_by(id=data["patientId"], hospital_id=ctx["hospital_id"], role="patient").first()
        if not patient:
            return
        doctor = User.query.filter_by(
            id=data["doctorId"], hospital_id=ctx["hospital_id"], role="doctor", is_active=True
        ).first()
        if not doctor:
            emit("action_error", {"error": "Doctor not found"})
            return

        new_appt = Appointment(
            hospital_id=patient.hospital_id,
            patient_id=data["patientId"],
            doctor_id=data["doctorId"],
            date_str=data.get("date", datetime.now().strftime("%Y-%m-%d")),
            time_str=data.get("time_slot", "09:00 AM"),
            status="Scheduled",
            symptoms=data.get("symptoms", ""),
            pain_level=data.get("pain_level", 0),
        )
        db.session.add(new_appt)
        db.session.commit()

        consult_fee = doctor.consultation_fee if doctor else 0
        invoice = Invoice(
            hospital_id=patient.hospital_id,
            appointment_id=new_appt.id,
            patient_id=new_appt.patient_id,
            consultation_fee=consult_fee,
            total=consult_fee,
        )
        db.session.add(invoice)
        db.session.commit()

        log_action(
            hospital_id=ctx["hospital_id"],
            user_id=ctx["user_id"],
            action="book_appointment",
            resource_type="appointment",
            resource_id=new_appt.id,
            details={"doctor_id": doctor.id, "date": new_appt.date_str},
            ip_address=getattr(g, "ip_address", None),
        )

        emit(
            "appointment_booked",
            {
                "id": new_appt.id,
                "patient_id": new_appt.patient_id,
                "status": new_appt.status,
                "time": new_appt.time_str,
            },
            room=tenant_room(ctx["hospital_id"]),
        )

    @socketio.on("action_arrive")
    def handle_action_arrive(data):
        ctx = require_socket_roles("patient", "staff", "admin")
        if not ctx:
            return
        data = socket_payload(data)
        if data is None:
            return
        appt_id = data.get("appointmentId")
        appt = tenant_appointment(appt_id, ctx["hospital_id"])
        if appt:
            if ctx["role"] == "patient" and appt.patient_id != ctx["user_id"]:
                emit("auth_error", {"error": "Patients can only mark their own appointment arrived"})
                return
            appt.status = "Arrived"
            db.session.commit()
            emit("queue_updated", {"id": appt.id, "status": "Arrived"}, room=tenant_room(ctx["hospital_id"]))

    @socketio.on("action_cancel_appointment")
    def handle_action_cancel(data):
        ctx = require_socket_roles("patient", "staff", "admin")
        if not ctx:
            return
        data = socket_payload(data)
        if data is None:
            return
        appt_id = data.get("appointmentId")
        appt = tenant_appointment(appt_id, ctx["hospital_id"])
        if appt and appt.status == "Scheduled":
            if ctx["role"] == "patient" and appt.patient_id != ctx["user_id"]:
                emit("auth_error", {"error": "Patients can only cancel their own appointment"})
                return
            appt.status = "Cancelled"
            db.session.commit()
            log_action(
                hospital_id=ctx["hospital_id"],
                user_id=ctx["user_id"],
                action="cancel_appointment",
                resource_type="appointment",
                resource_id=appt.id,
                ip_address=getattr(g, "ip_address", None),
            )
            emit("queue_updated", {"id": appt.id, "status": "Cancelled"}, room=tenant_room(ctx["hospital_id"]))
