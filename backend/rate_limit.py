from flask import request
from flask_jwt_extended import decode_token
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

try:
    from jwt.exceptions import DecodeError, ExpiredSignatureError
except ImportError:
    DecodeError = Exception
    ExpiredSignatureError = Exception


def _get_jwt_hospital_id():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        token = auth.split(" ", 1)[1]
        claims = decode_token(token)
        return claims.get("hospital_id")
    except (DecodeError, ExpiredSignatureError, Exception):
        return None


def tenant_key():
    """Rate limit key: per-tenant when JWT available, per-IP otherwise."""
    hid = _get_jwt_hospital_id()
    if hid is not None:
        return f"tenant:{hid}"
    return f"ip:{get_remote_address()}"


def user_key():
    """Rate limit key: per-user when JWT available, per-IP otherwise."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return f"ip:{get_remote_address()}"
    try:
        token = auth.split(" ", 1)[1]
        claims = decode_token(token)
        uid = claims.get("sub")
        return f"user:{uid}" if uid else f"ip:{get_remote_address()}"
    except Exception:
        return f"ip:{get_remote_address()}"


# Initialize without storage — Redis is wired in app.py if REDIS_URL is set
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
)
