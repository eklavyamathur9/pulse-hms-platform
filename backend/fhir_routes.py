from auth_utils import current_hospital_id, require_roles
from fhir import parse_bundle
from flask import Blueprint, jsonify
from models import LabTest, db
from validation import int_field, json_body, safe_commit

fhir_bp = Blueprint("fhir", __name__)


@fhir_bp.route("/fhir/observations", methods=["POST"])
@require_roles("admin", "superadmin", "staff")
def ingest_observations():
    hospital_id = current_hospital_id()
    if not hospital_id:
        return jsonify({"error": "hospital_id is required"}), 400

    data, error, status = json_body()
    if error:
        return error, status

    resource_type = data.get("resourceType", "Bundle")
    if resource_type != "Bundle":
        return jsonify({"error": "Expected a FHIR Bundle resource"}), 400

    patient_id, error, status = int_field(data, "patient_id", minimum=1, required=True)
    if error:
        return error, status

    appointment_id = None
    if "appointment_id" in data:
        appointment_id, error, status = int_field(data, "appointment_id", minimum=1)
        if error:
            return error, status

    lab_tests = parse_bundle(data, hospital_id, patient_id, appointment_id)
    if not lab_tests:
        return jsonify({"error": "No Observation resources found in bundle"}), 400

    created = []
    for lt in lab_tests:
        lab = LabTest(
            hospital_id=lt["hospital_id"],
            patient_id=lt["patient_id"],
            appointment_id=lt["appointment_id"] or 0,
            test_name=lt["test_name"],
            status=lt["status"],
            result_text=lt["result_text"],
        )
        db.session.add(lab)
        created.append({"id": lab.id, "test_name": lab.test_name, "status": lab.status})

    safe_commit()

    return jsonify({"message": f"{len(created)} lab test(s) created", "lab_tests": created}), 201


@fhir_bp.route("/fhir/metadata", methods=["GET"])
def get_metadata():
    return jsonify(
        {
            "resourceType": "CapabilityStatement",
            "status": "active",
            "date": "2026-06-19",
            "publisher": "Pulse HMS",
            "kind": "instance",
            "fhirVersion": "4.0.1",
            "acceptUnknown": "no",
            "format": ["json"],
            "rest": [
                {
                    "mode": "server",
                    "resource": [
                        {
                            "type": "Observation",
                            "profile": ["http://hl7.org/fhir/StructureDefinition/Observation"],
                            "interaction": [{"code": "create"}, {"code": "search-type"}],
                        }
                    ],
                }
            ],
        }
    )
