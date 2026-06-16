import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'pulse_hms.db')}"
DEV_SECRET = "pulse-dev-secret"
DEV_JWT_SECRET = "pulse-dev-jwt-secret"


def _env(name, default=None):
    value = os.environ.get(name)
    return value if value not in (None, "") else default


class Config:
    ENV = _env("FLASK_ENV", "development")
    SECRET_KEY = _env("SECRET_KEY", DEV_SECRET)
    JWT_SECRET_KEY = _env("JWT_SECRET_KEY", DEV_JWT_SECRET)
    JWT_ACCESS_TOKEN_EXPIRES = 30 * 60  # 30 minutes
    JWT_REFRESH_TOKEN_EXPIRES = 30 * 24 * 60 * 60  # 30 days
    SQLALCHEMY_DATABASE_URI = _env("DATABASE_URL", DEFAULT_DATABASE_URL)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    AUTO_CREATE_TABLES = _env("AUTO_CREATE_TABLES", "true").lower() == "true"
    SOCKET_ASYNC_MODE = _env("SOCKET_ASYNC_MODE", "threading")
    CORS_ORIGINS = [
        origin.strip() for origin in _env("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()
    ]
    RATELIMIT_ENABLED = _env("RATELIMIT_ENABLED", "true").lower() == "true"
    RATELIMIT_DEFAULT = _env("RATELIMIT_DEFAULT", "200 per day;50 per hour")
    REDIS_URL = _env("REDIS_URL", None)
    GUNICORN_WORKERS = int(_env("GUNICORN_WORKERS", "4"))
    SERVER_NAME = _env("SERVER_NAME", None)
    SOCKET_MESSAGE_QUEUE = _env("SOCKET_MESSAGE_QUEUE", REDIS_URL)

    @classmethod
    def validate(cls):
        missing = []
        if cls.ENV == "production":
            if cls.SECRET_KEY == DEV_SECRET:
                missing.append("SECRET_KEY")
            if cls.JWT_SECRET_KEY == DEV_JWT_SECRET:
                missing.append("JWT_SECRET_KEY")
            if cls.AUTO_CREATE_TABLES:
                missing.append("AUTO_CREATE_TABLES=false")
            if "sqlite" in cls.SQLALCHEMY_DATABASE_URI:
                missing.append("DATABASE_URL (must use PostgreSQL in production)")
        else:
            if not cls.SQLALCHEMY_DATABASE_URI:
                missing.append("DATABASE_URL")
        if missing:
            raise RuntimeError(
                f"Server misconfiguration — set the following environment variables:\n  "
                + "\n  ".join(missing)
            )
