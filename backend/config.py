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
    SQLALCHEMY_DATABASE_URI = _env("DATABASE_URL", DEFAULT_DATABASE_URL)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    AUTO_CREATE_TABLES = _env("AUTO_CREATE_TABLES", "true").lower() == "true"
    SOCKET_ASYNC_MODE = _env("SOCKET_ASYNC_MODE", "threading")
    CORS_ORIGINS = [
        origin.strip()
        for origin in _env("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]

    @classmethod
    def validate(cls):
        if cls.ENV == "production":
            missing = []
            if cls.SECRET_KEY == DEV_SECRET:
                missing.append("SECRET_KEY")
            if cls.JWT_SECRET_KEY == DEV_JWT_SECRET:
                missing.append("JWT_SECRET_KEY")
            if cls.AUTO_CREATE_TABLES:
                missing.append("AUTO_CREATE_TABLES=false")
            if missing:
                raise RuntimeError(
                    "Production startup requires secure values/settings for: "
                    + ", ".join(missing)
                )
