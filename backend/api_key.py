import hashlib
import secrets
from datetime import datetime
from functools import wraps

from flask import jsonify, request
from models import ApiKey, db


def generate_api_key():
    raw = f"pk_{secrets.token_urlsafe(32)}"
    prefix = raw[:7]
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    return raw, key_hash, prefix


def hash_key(raw_key):
    return hashlib.sha256(raw_key.encode()).hexdigest()


def verify_api_key(raw_key):
    key_hash = hash_key(raw_key)
    return db.session.query(ApiKey).filter_by(key_hash=key_hash, is_active=True).first()


def require_api_key(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid API key"}), 401
        raw_key = auth[len("Bearer ") :]
        api_key = verify_api_key(raw_key)
        if not api_key:
            return jsonify({"error": "Invalid or inactive API key"}), 401
        if api_key.expires_at and api_key.expires_at < datetime.utcnow():
            return jsonify({"error": "API key has expired"}), 401
        api_key.last_used_at = datetime.utcnow()
        db.session.commit()
        request.api_key = api_key
        return fn(*args, **kwargs)

    return wrapper
