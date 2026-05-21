from conftest import login, socket_client
from models import Appointment, Invoice, Vitals, db


def received_names(client):
    return [packet["name"] for packet in client.get_received()]


def received_payload(client, event_name):
    for packet in client.get_received():
        if packet["name"] == event_name:
            return packet["args"][0]
    return None


def test_socket_rejects_missing_token(client, seeded):
    unauthenticated = socket_client()

    assert not unauthenticated.is_connected()


def test_patient_booking_emits_only_to_same_tenant_and_creates_invoice(client, seeded):
    patient_token = login(
        client,
        "1111111111",
        "patientpass",
        seeded["hospital_one_id"],
        role_type="patient",
    )
    other_patient_token = login(
        client,
        "2222222222",
        "patientpass",
        seeded["hospital_two_id"],
        role_type="patient",
    )
    patient_socket = socket_client(patient_token)
    other_socket = socket_client(other_patient_token)

    patient_socket.emit(
        "action_book_appointment",
        {
            "patientId": seeded["patient_id"],
            "doctorId": seeded["doctor_id"],
            "date": "2026-05-23",
            "time_slot": "11:00 AM",
            "symptoms": "Mild fever",
        },
    )

    payload = received_payload(patient_socket, "appointment_booked")
    assert payload["patient_id"] == seeded["patient_id"]
    assert "appointment_booked" not in received_names(other_socket)

    appointment = db.session.get(Appointment, payload["id"])
    invoice = Invoice.query.filter_by(appointment_id=payload["id"]).first()
    assert appointment.hospital_id == seeded["hospital_one_id"]
    assert invoice is not None


def test_patient_cannot_submit_vitals(client, seeded):
    patient_token = login(
        client,
        "1111111111",
        "patientpass",
        seeded["hospital_one_id"],
        role_type="patient",
    )
    patient_socket = socket_client(patient_token)

    patient_socket.emit(
        "action_submit_vitals",
        {"appointmentId": seeded["scheduled_appointment_id"], "weight": "70"},
    )

    payload = received_payload(patient_socket, "auth_error")
    assert payload["error"] == "Unauthorized socket action"


def test_staff_can_submit_vitals_for_same_tenant_only(client, seeded):
    staff_token = login(client, "staff@one.test", "staffpass", seeded["hospital_one_id"])
    staff_socket = socket_client(staff_token)

    staff_socket.emit(
        "action_submit_vitals",
        {
            "appointmentId": seeded["scheduled_appointment_id"],
            "weight": "70",
            "hr": "75",
            "bp": "120/80",
            "temp": "98.6",
        },
    )

    payload = received_payload(staff_socket, "queue_updated")
    assert payload["status"] == "Vitals_Taken"

    vitals = Vitals.query.filter_by(appointment_id=seeded["scheduled_appointment_id"]).first()
    assert vitals is not None
    assert vitals.hospital_id == seeded["hospital_one_id"]

    staff_socket.emit(
        "action_submit_vitals",
        {"appointmentId": seeded["other_appointment_id"], "weight": "90"},
    )

    assert "queue_updated" not in received_names(staff_socket)


def test_socket_payload_validation(client, seeded):
    patient_token = login(
        client,
        "1111111111",
        "patientpass",
        seeded["hospital_one_id"],
        role_type="patient",
    )
    patient_socket = socket_client(patient_token)

    patient_socket.emit("action_arrive", None)

    payload = received_payload(patient_socket, "action_error")
    assert payload["error"] == "Valid event payload is required"
