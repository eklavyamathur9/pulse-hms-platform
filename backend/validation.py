import re

from flask import jsonify, request


def error_response(message, status_code=400, code=None):
    body = {"error": message}
    if code:
        body["code"] = code
    return jsonify(body), status_code


def success_response(data=None, message=None, status_code=200):
    body = {}
    if data is not None:
        body["data"] = data
    if message:
        body["message"] = message
    return jsonify(body), status_code


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, jsonify({"error": "Valid JSON body is required"}), 400
    return data, None, None


def require_fields(data, *fields):
    missing = [field for field in fields if data.get(field) in (None, "")]
    if missing:
        return jsonify({"error": f"Missing required field(s): {', '.join(missing)}"}), 400
    return None, None


def int_field(data, field, *, minimum=None, maximum=None, required=False):
    value = data.get(field)
    if value in (None, ""):
        if required:
            return None, jsonify({"error": f"{field} is required"}), 400
        return None, None, None
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None, jsonify({"error": f"{field} must be an integer"}), 400
    if minimum is not None and value < minimum:
        return None, jsonify({"error": f"{field} must be at least {minimum}"}), 400
    if maximum is not None and value > maximum:
        return None, jsonify({"error": f"{field} must be at most {maximum}"}), 400
    return value, None, None


def validate_password_strength(password):
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain an uppercase letter")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain a lowercase letter")
    if not re.search(r"\d", password):
        errors.append("Password must contain a digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-]", password):
        errors.append("Password must contain a special character")
    return errors
