from datetime import datetime, timedelta

from api_key import generate_api_key
from auth_utils import current_hospital_id, current_user, require_roles, tenant_get
from flask import Blueprint, jsonify
from models import ApiKey, db
from validation import int_field, json_body, require_fields, safe_commit

api_key_bp = Blueprint("api_keys", __name__)


@api_key_bp.route("/admin/api-keys", methods=["GET"])
@require_roles("superadmin", "admin")
def list_api_keys():
    hospital_id = current_hospital_id()
    query = ApiKey.query
    if hospital_id:
        query = query.filter(ApiKey.hospital_id == hospital_id)
    keys = query.order_by(ApiKey.created_at.desc()).all()
    return jsonify(
        {
            "api_keys": [
                {
                    "id": k.id,
                    "name": k.name,
                    "key_prefix": k.key_prefix,
                    "scopes": k.scopes,
                    "is_active": k.is_active,
                    "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                    "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                    "created_at": k.created_at.isoformat(),
                }
                for k in keys
            ]
        }
    )


@api_key_bp.route("/admin/api-keys", methods=["POST"])
@require_roles("superadmin", "admin")
def create_api_key():
    hospital_id = current_hospital_id()
    if not hospital_id:
        return jsonify({"error": "hospital_id is required"}), 400

    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "name")
    if error:
        return error, status

    name = data.get("name", "").strip()
    scopes = data.get("scopes") or []

    raw, key_hash, prefix = generate_api_key()
    api_key = ApiKey(
        hospital_id=hospital_id,
        user_id=current_user().id,
        name=name,
        key_hash=key_hash,
        key_prefix=prefix,
        scopes=scopes,
    )

    if data.get("expires_in_days"):
        days, error, status = int_field(data, "expires_in_days", minimum=1, maximum=365)
        if error:
            return error, status
        api_key.expires_at = datetime.utcnow() + timedelta(days=days)

    db.session.add(api_key)
    safe_commit()

    return jsonify(
        {
            "message": "API key created",
            "api_key": {
                "id": api_key.id,
                "name": api_key.name,
                "raw_key": raw,
                "key_prefix": api_key.key_prefix,
                "scopes": api_key.scopes,
                "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
            },
        }
    ), 201


@api_key_bp.route("/admin/api-keys/<int:key_id>", methods=["PUT"])
@require_roles("superadmin", "admin")
def update_api_key(key_id):
    hospital_id = current_hospital_id()
    api_key = tenant_get(ApiKey, key_id)
    if not api_key or (hospital_id and api_key.hospital_id != hospital_id):
        return jsonify({"error": "API key not found"}), 404

    data, error, status = json_body()
    if error:
        return error, status

    if "name" in data:
        api_key.name = data["name"]
    if "scopes" in data:
        api_key.scopes = data["scopes"]
    if "is_active" in data:
        api_key.is_active = bool(data["is_active"])

    safe_commit()
    return jsonify({"message": "API key updated"})


@api_key_bp.route("/admin/api-keys/<int:key_id>", methods=["DELETE"])
@require_roles("superadmin", "admin")
def delete_api_key(key_id):
    hospital_id = current_hospital_id()
    api_key = tenant_get(ApiKey, key_id)
    if not api_key or (hospital_id and api_key.hospital_id != hospital_id):
        return jsonify({"error": "API key not found"}), 404

    db.session.delete(api_key)
    safe_commit()
    return jsonify({"message": "API key deleted"})
