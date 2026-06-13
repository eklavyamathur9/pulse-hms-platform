import os

os.environ.setdefault("AUTO_CREATE_TABLES", "false")
os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-enough-length")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-with-enough-length")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("SOCKET_ASYNC_MODE", "threading")

import pytest
from werkzeug.security import generate_password_hash

from app import app, socketio
from services import socket_sessions
from models import Appointment, Hospital, Invoice, User, db


@pytest.fixture()
def client(tmp_path):
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{tmp_path / 'pulse_test.db'}",
        AUTO_CREATE_TABLES=False,
    )

    with app.app_context():
        db.drop_all()
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def seeded(client):
    with app.app_context():
        hospital_one = Hospital(name="Pulse One", subdomain="pulse-one", plan="trial")
        hospital_two = Hospital(name="Pulse Two", subdomain="pulse-two", plan="trial")
        db.session.add_all([hospital_one, hospital_two])
        db.session.flush()

        admin = make_user(hospital_one.id, "admin", "Admin One", email="admin@one.test", password="adminpass")
        staff = make_user(hospital_one.id, "staff", "Staff One", email="staff@one.test", password="staffpass")
        patient = make_user(hospital_one.id, "patient", "Patient One", contact="1111111111", password="patientpass")
        doctor = make_user(
            hospital_one.id,
            "doctor",
            "Doctor One",
            email="doctor@one.test",
            password="doctorpass",
            specialization="Cardiology",
            consultation_fee=500,
        )
        other_patient = make_user(hospital_two.id, "patient", "Patient Two", contact="2222222222", password="patientpass")
        other_doctor = make_user(hospital_two.id, "doctor", "Doctor Two", email="doctor@two.test", password="doctorpass")

        appointment = Appointment(
            hospital_id=hospital_one.id,
            patient_id=patient.id,
            doctor_id=doctor.id,
            date_str="2026-05-21",
            time_str="09:00 AM",
            status="Completed",
            symptoms="Routine follow-up",
        )
        other_appointment = Appointment(
            hospital_id=hospital_two.id,
            patient_id=other_patient.id,
            doctor_id=other_doctor.id,
            date_str="2026-05-21",
            time_str="09:00 AM",
            status="Completed",
        )
        scheduled_appointment = Appointment(
            hospital_id=hospital_one.id,
            patient_id=patient.id,
            doctor_id=doctor.id,
            date_str="2026-05-22",
            time_str="10:00 AM",
            status="Scheduled",
        )
        db.session.add_all([appointment, other_appointment, scheduled_appointment])
        db.session.flush()

        invoice = Invoice(
            hospital_id=hospital_one.id,
            appointment_id=appointment.id,
            patient_id=patient.id,
            consultation_fee=500,
            total=500,
        )
        other_invoice = Invoice(
            hospital_id=hospital_two.id,
            appointment_id=other_appointment.id,
            patient_id=other_patient.id,
            consultation_fee=300,
            total=300,
        )
        db.session.add_all([invoice, other_invoice])
        db.session.commit()

        return {
            "hospital_one_id": hospital_one.id,
            "hospital_two_id": hospital_two.id,
            "admin_id": admin.id,
            "staff_id": staff.id,
            "patient_id": patient.id,
            "doctor_id": doctor.id,
            "other_patient_id": other_patient.id,
            "other_doctor_id": other_doctor.id,
            "appointment_id": appointment.id,
            "other_appointment_id": other_appointment.id,
            "scheduled_appointment_id": scheduled_appointment.id,
            "invoice_id": invoice.id,
            "other_invoice_id": other_invoice.id,
        }


def make_user(hospital_id, role, name, *, password, email=None, contact=None, **extra):
    user = User(
        hospital_id=hospital_id,
        role=role,
        name=name,
        email=email,
        contact=contact,
        password=generate_password_hash(password),
        **extra,
    )
    db.session.add(user)
    db.session.flush()
    return user


def login(client, identifier, password, hospital_id, role_type="staff"):
    response = client.post(
        "/api/auth/login",
        json={
            "identifier": identifier,
            "password": password,
            "hospital_id": hospital_id,
            "type": role_type,
        },
    )
    assert response.status_code == 200, response.get_json()
    return response.get_json()["token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def socket_client(token=None):
    auth = {"token": token} if token else None
    return socketio.test_client(app, auth=auth)


@pytest.fixture(autouse=True)
def clear_socket_sessions():
    socket_sessions.clear()
    yield
    socket_sessions.clear()
