"""PII encryption using Fernet symmetric encryption.

Usage:
    from encryption import encrypt_value, decrypt_value, EncryptedField

    # For transparent SQLAlchemy encryption:
    class User(db.Model):
        contact = db.Column(EncryptedField, nullable=True)

    # For explicit encryption:
    encrypted = encrypt_value("sensitive-data")
    plaintext = decrypt_value(encrypted)
"""

import os
from base64 import urlsafe_b64encode

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from sqlalchemy import Text, TypeDecorator

SALT = b"pulse-hms-pii-salt-2026"


def _derive_key(secret: str) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=SALT, iterations=600_000)
    return urlsafe_b64encode(kdf.derive(secret.encode()))


_fernet_cache: Fernet | None = None


def _get_fernet(secret: str | None = None) -> Fernet:
    global _fernet_cache
    if _fernet_cache is None:
        key = secret or os.environ.get("ENCRYPTION_KEY", "")
        if not key:
            raise RuntimeError("ENCRYPTION_KEY environment variable is not set")
        _fernet_cache = Fernet(_derive_key(key))
    return _fernet_cache


def encrypt_value(value: str, secret: str | None = None) -> str:
    f = _get_fernet(secret)
    return f.encrypt(value.encode()).decode()


def decrypt_value(token: str, secret: str | None = None) -> str:
    f = _get_fernet(secret)
    return f.decrypt(token.encode()).decode()


class EncryptedField(TypeDecorator):
    """Transparent SQLAlchemy type that encrypts/decrypts string columns."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_value(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return decrypt_value(value)
        except Exception:
            return value
