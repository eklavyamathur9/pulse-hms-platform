import time

from auth_routes import auth_bp
from cache import cache
from config import Config
from flask import Flask, g, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_socketio import SocketIO
from hospital_routes import hospital_bp
from logging_config import log_request_response, request_id_middleware, setup_logging
from models import db
from patient_routes import patient_bp
from prometheus_flask_exporter import PrometheusMetrics
from rate_limit import limiter, tenant_key
from services import handle_connect, handle_disconnect
from services.appointment import register as register_appointment
from services.lab import register as register_lab
from services.pharmacy import register as register_pharmacy
from services.vitals import register as register_vitals
from superadmin_routes import superadmin_bp
from werkzeug.exceptions import HTTPException

app = Flask(__name__)
app.config.from_object(Config)
Config.validate()

app.config["SQLALCHEMY_ENGINE_OPTIONS"] = Config.engine_options()

setup_logging(app)

CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS}})

app.config["RATELIMIT_DEFAULT"] = Config.RATELIMIT_DEFAULT
app.config["RATELIMIT_ENABLED"] = Config.RATELIMIT_ENABLED
if Config.REDIS_URL:
    app.config["RATELIMIT_STORAGE_URI"] = Config.REDIS_URL
limiter.init_app(app)

cache_config = {"CACHE_TYPE": "SimpleCache"}
if Config.REDIS_URL:
    cache_config = {
        "CACHE_TYPE": "RedisCache",
        "CACHE_REDIS_URL": Config.REDIS_URL,
        "CACHE_DEFAULT_TIMEOUT": 60,
    }
cache.init_app(app, cache_config)

if Config.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=Config.SENTRY_DSN,
        enable_tracing=True,
        traces_sample_rate=0.2,
    )

metrics = PrometheusMetrics(app, group_by="endpoint")
metrics.info("app_info", "Pulse HMS", version="1.0.0")

db.init_app(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)
socketio_kwargs = {
    "cors_allowed_origins": Config.CORS_ORIGINS,
    "async_mode": Config.SOCKET_ASYNC_MODE,
}
if Config.SOCKET_MESSAGE_QUEUE:
    socketio_kwargs["message_queue"] = Config.SOCKET_MESSAGE_QUEUE
socketio = SocketIO(app, **socketio_kwargs)

if Config.AUTO_CREATE_TABLES:
    with app.app_context():
        db.create_all()

register_appointment(socketio)
register_vitals(socketio)
register_lab(socketio)
register_pharmacy(socketio)


@app.before_request
def before_request():
    request_id_middleware()
    g.start_time = time.time()


@app.after_request
def after_request(response):
    if hasattr(g, "start_time"):
        elapsed = time.time() - g.start_time
        response.headers["X-Response-Time"] = f"{elapsed:.3f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Cache-Control"] = "no-store"
    return log_request_response(response)


@app.errorhandler(HTTPException)
def handle_http_exception(e):
    return jsonify({"error": e.description or e.name, "code": e.code}), e.code


@app.errorhandler(500)
def handle_500(e):
    return jsonify({"error": "Internal server error", "code": 500}), 500


@app.errorhandler(404)
def handle_404(e):
    return jsonify({"error": "Not found", "code": 404}), 404


@app.errorhandler(405)
def handle_405(e):
    return jsonify({"error": "Method not allowed", "code": 405}), 405


@app.route("/api/ping", methods=["GET"])
def ping():
    app.logger.info("Ping endpoint called")
    return jsonify({"status": "ok", "message": "Pulse HMS Backend is running"})


@app.route("/api/health", methods=["GET"])
def health():
    status = "healthy"
    db_ok = True
    try:
        with app.app_context():
            db.session.execute(db.text("SELECT 1"))
    except Exception:
        db_ok = False
        status = "degraded"
    return jsonify(
        {
            "status": status,
            "database": "connected" if db_ok else "disconnected",
            "version": "1.0.0",
        }
    )


@app.route("/api/health/db", methods=["GET"])
def health_db():
    try:
        with app.app_context():
            db.session.execute(db.text("SELECT 1"))
        return jsonify({"status": "healthy", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "degraded", "database": "disconnected", "error": str(e)}), 503


app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(patient_bp, url_prefix="/api/patients")
app.register_blueprint(hospital_bp, url_prefix="/api/hospital")
app.register_blueprint(superadmin_bp, url_prefix="/api/superadmin")

# Per-tenant rate limits for data endpoints (blueprint-level safety net)
limiter.limit("100 per minute", key_func=tenant_key)(patient_bp)
limiter.limit("100 per minute", key_func=tenant_key)(hospital_bp)
limiter.limit("60 per minute", key_func=tenant_key)(superadmin_bp)


@socketio.on("connect")
def handle_connect_wrapper(auth=None):
    return handle_connect(auth)


@socketio.on("disconnect")
def handle_disconnect_wrapper():
    handle_disconnect()


if __name__ == "__main__":
    app.logger.info("Starting Pulse HMS Backend on ws://localhost:5000")
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)
