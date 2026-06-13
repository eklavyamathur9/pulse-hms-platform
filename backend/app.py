from flask import Flask, g, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from models import db
from auth_routes import auth_bp
from patient_routes import patient_bp
from hospital_routes import hospital_bp
from config import Config
from logging_config import setup_logging, request_id_middleware, log_request_response
from services import handle_connect, handle_disconnect
from services.appointment import register as register_appointment
from services.vitals import register as register_vitals
from services.lab import register as register_lab
from services.pharmacy import register as register_pharmacy

app = Flask(__name__)
app.config.from_object(Config)
Config.validate()

setup_logging(app)

CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS}})
db.init_app(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)
socketio = SocketIO(app, cors_allowed_origins=Config.CORS_ORIGINS, async_mode=Config.SOCKET_ASYNC_MODE)

# Auto-create tables for dev convenience when no migration system is used
if Config.AUTO_CREATE_TABLES:
    with app.app_context():
        db.create_all()

# Register domain socket handlers
register_appointment(socketio)
register_vitals(socketio)
register_lab(socketio)
register_pharmacy(socketio)


@app.before_request
def before_request():
    request_id_middleware()


@app.after_request
def after_request(response):
    return log_request_response(response)


@app.route('/api/ping', methods=['GET'])
def ping():
    app.logger.info("Ping endpoint called")
    return jsonify({"status": "ok", "message": "Pulse HMS Backend is running"})


@app.route('/api/health', methods=['GET'])
def health():
    status = "healthy"
    db_ok = True
    try:
        with app.app_context():
            db.session.execute(db.text("SELECT 1"))
    except Exception:
        db_ok = False
        status = "degraded"
    return jsonify({
        "status": status,
        "database": "connected" if db_ok else "disconnected",
        "version": "1.0.0",
    })


@app.route('/api/health/db', methods=['GET'])
def health_db():
    try:
        with app.app_context():
            db.session.execute(db.text("SELECT 1"))
        return jsonify({"status": "healthy", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "degraded", "database": "disconnected", "error": str(e)}), 503


app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(patient_bp, url_prefix='/api/patients')
app.register_blueprint(hospital_bp, url_prefix='/api/hospital')


@socketio.on('connect')
def handle_connect_wrapper(auth=None):
    return handle_connect(auth)


@socketio.on('disconnect')
def handle_disconnect_wrapper():
    handle_disconnect()


if __name__ == '__main__':
    app.logger.info("Starting Pulse HMS Backend on ws://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
