from conftest import auth_header, login


def test_register_hospital_requires_json(client):
    response = client.post("/api/auth/register-hospital", data="not-json")

    assert response.status_code == 400
    assert "JSON" in response.get_json()["error"]


def test_login_is_tenant_scoped(client, seeded):
    good = client.post(
        "/api/auth/login",
        json={
            "identifier": "admin@one.test",
            "password": "adminpass",
            "hospital_id": seeded["hospital_one_id"],
            "type": "staff",
        },
    )
    wrong_tenant = client.post(
        "/api/auth/login",
        json={
            "identifier": "admin@one.test",
            "password": "adminpass",
            "hospital_id": seeded["hospital_two_id"],
            "type": "staff",
        },
    )

    assert good.status_code == 200
    assert "token" in good.get_json()
    assert wrong_tenant.status_code == 401


def test_doctor_list_is_tenant_scoped(client, seeded):
    token = login(
        client,
        "1111111111",
        "patientpass",
        seeded["hospital_one_id"],
        role_type="patient",
    )

    response = client.get("/api/auth/doctors/all", headers=auth_header(token))

    assert response.status_code == 200
    names = {doctor["name"] for doctor in response.get_json()}
    assert names == {"Doctor One"}


def test_patient_cannot_read_other_tenant_patient_appointments(client, seeded):
    token = login(
        client,
        "1111111111",
        "patientpass",
        seeded["hospital_one_id"],
        role_type="patient",
    )

    response = client.get(
        f"/api/patients/{seeded['other_patient_id']}/appointments",
        headers=auth_header(token),
    )

    assert response.status_code == 403


def test_admin_user_creation_validates_required_name(client, seeded):
    token = login(client, "admin@one.test", "adminpass", seeded["hospital_one_id"])

    response = client.post(
        "/api/auth/admin/users",
        json={"role": "staff", "email": "newstaff@one.test", "password": "pass123"},
        headers=auth_header(token),
    )

    assert response.status_code == 400
    assert "name" in response.get_json()["error"]


def test_rating_validation_and_success(client, seeded):
    token = login(
        client,
        "1111111111",
        "patientpass",
        seeded["hospital_one_id"],
        role_type="patient",
    )

    invalid = client.post(
        "/api/hospital/rating",
        json={
            "appointment_id": seeded["appointment_id"],
            "patient_id": seeded["patient_id"],
            "doctor_id": seeded["doctor_id"],
            "stars": 6,
        },
        headers=auth_header(token),
    )
    valid = client.post(
        "/api/hospital/rating",
        json={
            "appointment_id": seeded["appointment_id"],
            "patient_id": seeded["patient_id"],
            "doctor_id": seeded["doctor_id"],
            "stars": 5,
            "comment": "Helpful visit",
        },
        headers=auth_header(token),
    )

    assert invalid.status_code == 400
    assert valid.status_code == 201


def test_patient_cannot_pay_other_tenant_invoice(client, seeded):
    token = login(
        client,
        "1111111111",
        "patientpass",
        seeded["hospital_one_id"],
        role_type="patient",
    )

    response = client.put(
        f"/api/hospital/invoice/{seeded['other_invoice_id']}/pay",
        headers=auth_header(token),
    )

    assert response.status_code == 404
