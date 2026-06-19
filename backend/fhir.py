import logging

logger = logging.getLogger(__name__)


def parse_observation(obs: dict, hospital_id: int, patient_id: int, appointment_id: int = None):
    """Convert a FHIR Observation resource to a LabTest-compatible dict."""
    code_coding = (obs.get("code") or {}).get("coding") or [{}]
    display = code_coding[0].get("display", obs.get("code", {}).get("text", "Unknown Test"))
    code = code_coding[0].get("code", "unknown")

    value_quantity = obs.get("valueQuantity") or {}
    value = value_quantity.get("value")
    unit = value_quantity.get("unit", "")

    result = f"{value} {unit}" if value else obs.get("valueString", "")

    status = obs.get("status", "unknown")
    lab_status = "Completed" if status == "final" else "Pending"

    return {
        "hospital_id": hospital_id,
        "patient_id": patient_id,
        "appointment_id": appointment_id,
        "test_name": f"{display} ({code})",
        "status": lab_status,
        "result_text": result,
        "fhir_observation_id": obs.get("id"),
        "fhir_resource": obs,
    }


def parse_bundle(bundle: dict, hospital_id: int, patient_id: int, appointment_id: int = None):
    """Parse a FHIR Bundle of Observation resources into LabTest dicts."""
    entries = bundle.get("entry") or []
    results = []
    for entry in entries:
        resource = entry.get("resource") or {}
        if resource.get("resourceType") == "Observation":
            results.append(parse_observation(resource, hospital_id, patient_id, appointment_id))
    return results
