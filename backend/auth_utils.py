from functools import wraps

from flask import jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models import db, User


def user_claims(user):
    return {
        "role": user.role,
        "hospital_id": user.hospital_id,
    }


def current_user():
    user_id = get_jwt_identity()
    if user_id is None:
        return None
    try:
        return db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None


def current_role():
    return get_jwt().get("role")


def current_hospital_id():
    hospital_id = get_jwt().get("hospital_id")
    if hospital_id is not None:
        return hospital_id
    if current_role() == "superadmin":
        requested = request.args.get("hospital_id")
        if not requested and request.is_json:
            requested = (request.get_json(silent=True) or {}).get("hospital_id")
        if requested not in (None, ""):
            try:
                return int(requested)
            except (TypeError, ValueError):
                return None
    return None


def is_superadmin():
    return current_role() == "superadmin"


def forbidden(message="Forbidden"):
    return jsonify({"error": message}), 403


def not_found(message="Not found"):
    return jsonify({"error": message}), 404


def require_roles(*roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user or not user.is_active:
                return jsonify({"error": "Invalid or inactive user"}), 401
            if user.role not in roles:
                return forbidden("You do not have permission to access this resource")
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def tenant_filter(query, model):
    if is_superadmin():
        return query
    return query.filter(model.hospital_id == current_hospital_id())


def tenant_get(model, record_id):
    query = model.query.filter(model.id == record_id)
    return tenant_filter(query, model).first()


def same_tenant(record):
    return is_superadmin() or getattr(record, "hospital_id", None) == current_hospital_id()


def require_hospital_context():
    hospital_id = current_hospital_id()
    if hospital_id is None:
        return None, jsonify({"error": "hospital_id is required for this tenant-scoped request"}), 400
    return hospital_id, None, None
