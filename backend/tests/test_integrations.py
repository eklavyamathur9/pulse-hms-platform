import os

from app import app
from conftest import API, auth_header, login
from models import ApiKey, Document, LabTest, Teleconsultation, Webhook, db


def test_api_key_crud(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    # Create
    response = client.post(
        f"{API}/auth/admin/api-keys",
        json={"name": "Test Integration"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["api_key"]["name"] == "Test Integration"
    assert data["api_key"]["raw_key"].startswith("pk_")
    key_id = data["api_key"]["id"]

    # List
    response = client.get(f"{API}/auth/admin/api-keys", headers=auth_header(admin_token))
    assert response.status_code == 200
    ids = [k["id"] for k in response.get_json()["api_keys"]]
    assert key_id in ids

    # Update (deactivate)
    response = client.put(
        f"{API}/auth/admin/api-keys/{key_id}",
        json={"is_active": False},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200

    key = db.session.get(ApiKey, key_id)
    assert key.is_active is False

    # Delete
    response = client.delete(
        f"{API}/auth/admin/api-keys/{key_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert db.session.get(ApiKey, key_id) is None


def test_api_key_role_authorization(client, seeded):
    staff_token = login(client, "staff@one.test", "staffpass", seeded["hospital_one_id"])
    response = client.post(
        f"{API}/auth/admin/api-keys",
        json={"name": "Should Fail"},
        headers=auth_header(staff_token),
    )
    assert response.status_code == 403


def test_api_key_tenant_isolation(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])
    staff_token = login(client, "staff@one.test", "staffpass", seeded["hospital_one_id"])

    # Admin creates a key in hospital_one
    response = client.post(
        f"{API}/auth/admin/api-keys",
        json={"name": "H1 Key"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201

    # Staff (non-admin) should not be able to list keys
    response = client.get(f"{API}/auth/admin/api-keys", headers=auth_header(staff_token))
    assert response.status_code == 403


def test_api_key_expiration(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])
    response = client.post(
        f"{API}/auth/admin/api-keys",
        json={"name": "Temp Key", "expires_in_days": 1},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    assert response.get_json()["api_key"]["expires_at"] is not None


def test_webhook_crud(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    # List events
    response = client.get(f"{API}/auth/admin/webhooks/events")
    assert response.status_code == 200
    events = response.get_json()["events"]
    assert "appointment.created" in events

    # Create
    response = client.post(
        f"{API}/auth/admin/webhooks",
        json={
            "name": "Test Webhook",
            "url": "https://example.com/hook",
            "events": ["appointment.created", "lab.completed"],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["webhook"]["secret"] is not None
    wh_id = data["webhook"]["id"]

    # List
    response = client.get(f"{API}/auth/admin/webhooks", headers=auth_header(admin_token))
    assert response.status_code == 200
    ids = [w["id"] for w in response.get_json()["webhooks"]]
    assert wh_id in ids

    # Update
    response = client.put(
        f"{API}/auth/admin/webhooks/{wh_id}",
        json={"is_active": False},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert db.session.get(Webhook, wh_id).is_active is False

    # Delete
    response = client.delete(
        f"{API}/auth/admin/webhooks/{wh_id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200


def test_webhook_invalid_event_rejected(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])
    response = client.post(
        f"{API}/auth/admin/webhooks",
        json={
            "name": "Bad Webhook",
            "url": "https://example.com/hook",
            "events": ["nonexistent.event"],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 400


def test_telemedicine_create_and_lifecycle(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])
    doctor_token = login(client, "doctor@one.test", "doctorpass", seeded["hospital_one_id"])

    # Create room
    response = client.post(
        f"{API}/hospital/telemedicine/rooms",
        json={
            "appointment_id": seeded["scheduled_appointment_id"],
            "patient_id": seeded["patient_id"],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["teleconsultation"]["meeting_url"].startswith("https://meet.jit.si/")
    room_id = data["teleconsultation"]["id"]

    # Start consultation
    response = client.post(
        f"{API}/hospital/telemedicine/rooms/{room_id}/start",
        headers=auth_header(doctor_token),
    )
    assert response.status_code == 200
    assert db.session.get(Teleconsultation, room_id).status == "in_progress"

    # End consultation
    response = client.post(
        f"{API}/hospital/telemedicine/rooms/{room_id}/end",
        headers=auth_header(doctor_token),
    )
    assert response.status_code == 200
    assert db.session.get(Teleconsultation, room_id).status == "completed"

    # Duplicate room creation returns existing
    response = client.post(
        f"{API}/hospital/telemedicine/rooms",
        json={
            "appointment_id": seeded["scheduled_appointment_id"],
            "patient_id": seeded["patient_id"],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.get_json()["teleconsultation"]["id"] == room_id


def test_telemedicine_role_authorization(client, seeded):
    staff_token = login(client, "staff@one.test", "staffpass", seeded["hospital_one_id"])
    response = client.post(
        f"{API}/hospital/telemedicine/rooms",
        json={
            "appointment_id": seeded["scheduled_appointment_id"],
            "patient_id": seeded["patient_id"],
        },
        headers=auth_header(staff_token),
    )
    assert response.status_code == 403


def test_fhir_ingestion(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "patient_id": seeded["patient_id"],
        "appointment_id": seeded["scheduled_appointment_id"],
        "entry": [
            {
                "resource": {
                    "resourceType": "Observation",
                    "id": "obs-001",
                    "status": "final",
                    "code": {
                        "coding": [{"system": "http://loinc.org", "code": "718-7", "display": "Hemoglobin"}],
                        "text": "Hemoglobin",
                    },
                    "valueQuantity": {"value": 14.5, "unit": "g/dL"},
                }
            }
        ],
    }

    response = client.post(
        f"{API}/hospital/fhir/observations",
        json=bundle,
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    data = response.get_json()
    assert len(data["lab_tests"]) == 1
    assert "Hemoglobin" in data["lab_tests"][0]["test_name"]


def test_fhir_metadata_endpoint(client):
    response = client.get(f"{API}/hospital/fhir/metadata")
    assert response.status_code == 200
    data = response.get_json()
    assert data["resourceType"] == "CapabilityStatement"
    assert data["fhirVersion"] == "4.0.1"


def test_stripe_payment_intent_endpoint(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    response = client.post(
        f"{API}/hospital/invoice/{seeded['invoice_id']}/create-payment-intent",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["client_secret"] is not None


def test_stripe_confirm_online_payment(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    # First get a payment intent (mock mode)
    pi_resp = client.post(
        f"{API}/hospital/invoice/{seeded['invoice_id']}/create-payment-intent",
        headers=auth_header(admin_token),
    )
    pi_id = pi_resp.get_json()["payment_intent_id"]

    # Confirm (mock mode returns succeeded automatically via retrieve)
    response = client.post(
        f"{API}/hospital/invoice/{seeded['invoice_id']}/confirm-online-payment",
        json={"payment_intent_id": pi_id},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200


def test_stripe_paid_invoice_rejects_duplicate(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    # Pay via cash first
    client.put(
        f"{API}/hospital/invoice/{seeded['invoice_id']}/pay",
        headers=auth_header(admin_token),
    )

    # Now try to create payment intent — should reject
    response = client.post(
        f"{API}/hospital/invoice/{seeded['invoice_id']}/create-payment-intent",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 409


def test_usage_analytics_endpoint(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    # Make a few requests to generate usage data
    client.get(f"{API}/auth/doctors/all", headers=auth_header(admin_token))
    client.get(f"{API}/hospital/admin/analytics", headers=auth_header(admin_token))

    response = client.get(f"{API}/admin/usage?days=7", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.get_json()
    assert data["hospital_id"] == seeded["hospital_one_id"]
    assert data["total_requests"] >= 0


def test_usage_live_endpoint(client, seeded):
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    response = client.get(f"{API}/admin/usage/live", headers=auth_header(admin_token))
    assert response.status_code == 200
    data = response.get_json()
    assert "hospital_id" in data


def test_swagger_docs_endpoint(client):
    response = client.get(f"{API}/docs/")
    assert response.status_code == 200
    assert "swagger" in response.get_data(as_text=True).lower()


def test_swagger_json_endpoint(client):
    response = client.get(f"{API}/swagger.json")
    assert response.status_code == 200
    data = response.get_json()
    assert data["swagger"] == "2.0"
    assert "Pulse HMS" in data["info"]["title"]


def test_legacy_api_redirect(client, seeded):
    # /api/auth/doctors/all -> 301 to /api/v1/auth/doctors/all
    response = client.get(
        "/api/auth/doctors/all",
        follow_redirects=False,
    )
    assert response.status_code == 301
    assert "/api/v1/auth/doctors/all" in response.location


def test_legacy_api_root_redirect(client):
    response = client.get("/api", follow_redirects=False)
    assert response.status_code == 301
    assert response.location.endswith("/api/v1/")


def test_notification_task_mock(client, seeded):
    from tasks import send_notification

    result = send_notification("sms", "+1234567890", {"message": "Test SMS"})
    assert result["sent"] is False
    assert result["provider"] == "twilio"


def test_usage_analytics_requires_auth(client, seeded):
    response = client.get(f"{API}/admin/usage?days=7")
    assert response.status_code == 401


def test_jitsi_domain_configurable(monkeypatch, client, seeded):
    from config import Config
    monkeypatch.setattr(Config, "JITSI_DOMAIN", "meet.example.com")
    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    response = client.post(
        f"{API}/hospital/telemedicine/rooms",
        json={
            "appointment_id": seeded["scheduled_appointment_id"],
            "patient_id": seeded["patient_id"],
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 201
    url = response.get_json()["teleconsultation"]["meeting_url"]
    assert url.startswith("https://meet.example.com/")


def test_document_download_tenant_isolation(client, seeded):
    from config import Config

    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    doc = Document(
        hospital_id=seeded["hospital_one_id"],
        patient_id=seeded["patient_id"],
        uploaded_by=seeded["admin_id"],
        filename="test.txt",
        original_name="test.txt",
        content_type="text/plain",
        file_size=4,
    )
    db.session.add(doc)
    db.session.flush()
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    with open(os.path.join(Config.UPLOAD_FOLDER, doc.filename), "w") as f:
        f.write("test")
    db.session.commit()

    # Same tenant — should succeed
    response = client.get(
        f"{API}/hospital/lab/documents/{doc.id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200

    # Different tenant — should 404
    login(client, "staff@one.test", "staffpass", seeded["hospital_one_id"])
    doc2 = Document(
        hospital_id=seeded["hospital_two_id"],
        patient_id=seeded["other_patient_id"],
        uploaded_by=seeded["admin_id"],
        filename="other.txt",
        original_name="other.txt",
        content_type="text/plain",
        file_size=5,
    )
    db.session.add(doc2)
    db.session.flush()
    with open(os.path.join(Config.UPLOAD_FOLDER, doc2.filename), "w") as f:
        f.write("other")
    db.session.commit()

    # Fetch doc from other hospital — should 404
    response = client.get(
        f"{API}/hospital/lab/documents/{doc2.id}",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404


def test_lab_test_documents_tenant_isolation(client, seeded):
    lab_test = LabTest(
        hospital_id=seeded["hospital_two_id"],
        appointment_id=seeded["other_appointment_id"],
        patient_id=seeded["other_patient_id"],
        test_name="X-Ray",
    )
    db.session.add(lab_test)
    db.session.commit()

    admin_token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    # Fetch lab test from different tenant — should 404
    response = client.get(
        f"{API}/hospital/lab/test/{lab_test.id}/documents",
        headers=auth_header(admin_token),
    )
    assert response.status_code == 404


def test_safe_commit_propagates_exception(client, seeded):
    import pytest
    from sqlalchemy.exc import IntegrityError
    from validation import safe_commit

    with pytest.raises(IntegrityError):
        with app.app_context():
            from models import Hospital

            h = Hospital(name="Test", subdomain="pulse-one")  # duplicate subdomain
            db.session.add(h)
            safe_commit()
