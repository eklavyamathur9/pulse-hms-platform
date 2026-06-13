from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from flask_jwt_extended import JWTManager, decode_token
from flask_migrate import Migrate
from models import db, User, Appointment, Vitals, LabTest, Prescription
from auth_routes import auth_bp
from patient_routes import patient_bp
from hospital_routes import hospital_bp
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
Config.validate()

CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS}})
db.init_app(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)
socketio = SocketIO(app, cors_allowed_origins=Config.CORS_ORIGINS, async_mode=Config.SOCKET_ASYNC_MODE)
socket_sessions = {}

# Auto-create tables for dev convenience when no migration system is used
if Config.AUTO_CREATE_TABLES:
    with app.app_context():
        db.create_all()

@app.route('/api/ping', methods=['GET'])
def ping():
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

# -- Socket.IO Real-time Logic --
def tenant_room(hospital_id):
    return f"hospital:{hospital_id}"

def socket_context():
    return socket_sessions.get(request.sid)

def require_socket_roles(*roles):
    ctx = socket_context()
    if not ctx or ctx.get('role') not in roles:
        emit('auth_error', {'error': 'Unauthorized socket action'})
        return None
    return ctx

def socket_payload(data):
    if not isinstance(data, dict):
        emit('action_error', {'error': 'Valid event payload is required'})
        return None
    return data

def tenant_appointment(appt_id, hospital_id):
    return Appointment.query.filter_by(id=appt_id, hospital_id=hospital_id).first()

def tenant_lab_test(test_id, hospital_id):
    return LabTest.query.filter_by(id=test_id, hospital_id=hospital_id).first()

def tenant_prescription(rx_id, hospital_id):
    return Prescription.query.filter_by(id=rx_id, hospital_id=hospital_id).first()

@socketio.on('connect')
def handle_connect(auth=None):
    token = (auth or {}).get('token')
    if not token:
        return False
    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
        user = db.session.get(User, user_id)
        if not user or not user.is_active:
            return False
        ctx = {
            'user_id': user.id,
            'role': user.role,
            'hospital_id': user.hospital_id
        }
        socket_sessions[request.sid] = ctx
        join_room(tenant_room(user.hospital_id))
        print(f"Client connected: user={user.id} role={user.role} hospital={user.hospital_id}")
    except Exception:
        return False

@socketio.on('disconnect')
def handle_disconnect():
    socket_sessions.pop(request.sid, None)

@socketio.on('action_book_appointment')
def handle_book_appointment(data):
    from datetime import datetime
    from models import Invoice
    ctx = require_socket_roles('patient')
    if not ctx:
        return
    data = socket_payload(data)
    if data is None:
        return
    if not data.get('patientId') or not data.get('doctorId'):
        emit('action_error', {'error': 'patientId and doctorId are required'})
        return
    if data.get('patientId') != ctx['user_id']:
        emit('auth_error', {'error': 'Patients can only book for themselves'})
        return
    
    patient = User.query.filter_by(id=data['patientId'], hospital_id=ctx['hospital_id'], role='patient').first()
    if not patient: return
    doctor = User.query.filter_by(id=data['doctorId'], hospital_id=ctx['hospital_id'], role='doctor', is_active=True).first()
    if not doctor:
        emit('action_error', {'error': 'Doctor not found'})
        return
    
    new_appt = Appointment(
        hospital_id=patient.hospital_id,
        patient_id=data['patientId'],
        doctor_id=data['doctorId'],
        date_str=data.get('date', datetime.now().strftime('%Y-%m-%d')),
        time_str=data.get('time_slot', '09:00 AM'),
        status='Scheduled',
        symptoms=data.get('symptoms', ''),
        pain_level=data.get('pain_level', 0)
    )
    db.session.add(new_appt)
    db.session.commit()
    
    consult_fee = doctor.consultation_fee if doctor else 0
    invoice = Invoice(
        hospital_id=patient.hospital_id,
        appointment_id=new_appt.id,
        patient_id=new_appt.patient_id,
        consultation_fee=consult_fee,
        total=consult_fee
    )
    db.session.add(invoice)
    db.session.commit()
    
    emit('appointment_booked', {
        'id': new_appt.id,
        'patient_id': new_appt.patient_id,
        'status': new_appt.status,
        'time': new_appt.time_str
    }, room=tenant_room(ctx['hospital_id']))

@socketio.on('action_arrive')
def handle_action_arrive(data):
    ctx = require_socket_roles('patient', 'staff', 'admin')
    if not ctx:
        return
    data = socket_payload(data)
    if data is None:
        return
    appt_id = data.get('appointmentId')
    appt = tenant_appointment(appt_id, ctx['hospital_id'])
    if appt:
        if ctx['role'] == 'patient' and appt.patient_id != ctx['user_id']:
            emit('auth_error', {'error': 'Patients can only mark their own appointment arrived'})
            return
        appt.status = 'Arrived'
        db.session.commit()
        emit('queue_updated', {'id': appt.id, 'status': 'Arrived'}, room=tenant_room(ctx['hospital_id']))

@socketio.on('action_cancel_appointment')
def handle_action_cancel(data):
    ctx = require_socket_roles('patient', 'staff', 'admin')
    if not ctx:
        return
    data = socket_payload(data)
    if data is None:
        return
    appt_id = data.get('appointmentId')
    appt = tenant_appointment(appt_id, ctx['hospital_id'])
    if appt and appt.status == 'Scheduled':
        if ctx['role'] == 'patient' and appt.patient_id != ctx['user_id']:
            emit('auth_error', {'error': 'Patients can only cancel their own appointment'})
            return
        appt.status = 'Cancelled'
        db.session.commit()
        emit('queue_updated', {'id': appt.id, 'status': 'Cancelled'}, room=tenant_room(ctx['hospital_id']))

@socketio.on('action_submit_vitals')
def handle_submit_vitals(data):
    ctx = require_socket_roles('staff', 'admin')
    if not ctx:
        return
    data = socket_payload(data)
    if data is None:
        return
    appt_id = data.get('appointmentId')
    appt = tenant_appointment(appt_id, ctx['hospital_id'])
    if appt:
        vitals = Vitals(
            hospital_id=appt.hospital_id,
            appointment_id=appt.id,
            patient_id=appt.patient_id,
            weight=data.get('weight'),
            heart_rate=data.get('hr'),
            blood_pressure=data.get('bp'),
            temperature=data.get('temp')
        )
        db.session.add(vitals)
        appt.status = 'Vitals_Taken'
        db.session.commit()
        emit('queue_updated', {'id': appt.id, 'status': 'Vitals_Taken'}, room=tenant_room(ctx['hospital_id']))

@socketio.on('action_prescribe_test')
def handle_prescribe_test(data):
    ctx = require_socket_roles('doctor', 'admin')
    if not ctx:
        return
    data = socket_payload(data)
    if data is None:
        return
    if not data.get('appointmentId') or not data.get('test_name'):
        emit('action_error', {'error': 'appointmentId and test_name are required'})
        return
    appt_id = data.get('appointmentId')
    appt = tenant_appointment(appt_id, ctx['hospital_id'])
    if appt:
        if ctx['role'] == 'doctor' and appt.doctor_id != ctx['user_id']:
            emit('auth_error', {'error': 'Doctors can only order tests for their own appointments'})
            return
        lab_test = LabTest(
            hospital_id=appt.hospital_id,
            appointment_id=appt.id,
            patient_id=appt.patient_id,
            test_name=data.get('test_name'),
            status='Pending Payment'
        )
        db.session.add(lab_test)
        appt.status = 'Lab_Pending'
        db.session.commit()
        emit('queue_updated', {'id': appt.id, 'status': 'Lab_Pending'}, room=tenant_room(ctx['hospital_id']))

@socketio.on('action_pay_test')
def handle_pay_test(data):
    ctx = require_socket_roles('patient', 'staff', 'admin')
    if not ctx:
        return
    data = socket_payload(data)
    if data is None:
        return
    test_id = data.get('testId')
    lab_test = tenant_lab_test(test_id, ctx['hospital_id'])
    if lab_test:
        if ctx['role'] == 'patient' and lab_test.patient_id != ctx['user_id']:
            emit('auth_error', {'error': 'Patients can only pay their own lab tests'})
            return
        lab_test.status = 'Paid - Needs Sample'
        db.session.commit()
        emit('queue_updated', {'id': lab_test.appointment_id, 'status': 'Paid'}, room=tenant_room(ctx['hospital_id']))

@socketio.on('action_upload_test_report')
def handle_upload_test_report(data):
    ctx = require_socket_roles('staff', 'admin')
    if not ctx:
        return
    data = socket_payload(data)
    if data is None:
        return
    test_id = data.get('testId')
    lab_test = tenant_lab_test(test_id, ctx['hospital_id'])
    if lab_test:
        lab_test.status = 'Completed'
        lab_test.result_text = data.get('result_text')
        
        # Move appointment back to Doctor for final review
        appt = tenant_appointment(lab_test.appointment_id, ctx['hospital_id'])
        if appt:
            appt.status = 'Consult_Pending_Review'
        
        db.session.commit()
        emit('queue_updated', {'id': lab_test.appointment_id, 'status': 'Consult_Pending_Review'}, room=tenant_room(ctx['hospital_id']))

@socketio.on('action_prescribe_meds')
def handle_prescribe_meds(data):
    ctx = require_socket_roles('doctor', 'admin')
    if not ctx:
        return
    data = socket_payload(data)
    if data is None:
        return
    if not data.get('appointmentId') or not data.get('medication_details'):
        emit('action_error', {'error': 'appointmentId and medication_details are required'})
        return
    appt_id = data.get('appointmentId')
    appt = tenant_appointment(appt_id, ctx['hospital_id'])
    if appt:
        if ctx['role'] == 'doctor' and appt.doctor_id != ctx['user_id']:
            emit('auth_error', {'error': 'Doctors can only prescribe for their own appointments'})
            return
        prescription = Prescription(
            hospital_id=appt.hospital_id,
            appointment_id=appt.id,
            patient_id=appt.patient_id,
            doctor_id=appt.doctor_id,
            medication=data.get('medication_details')
        )
        db.session.add(prescription)
        followup = data.get('followup_days')
        if followup:
            appt.followup_days = int(followup)
        appt.status = 'Completed'
        db.session.commit()
        
        # Automatically generate invoice if it doesn't exist
        from hospital_routes import create_invoice_for_appointment
        try:
            create_invoice_for_appointment(appt)
        except:
            pass # Already exists or other handled error
            
        emit('queue_updated', {'id': appt.id, 'status': 'Completed'}, room=tenant_room(ctx['hospital_id']))

@socketio.on('action_dispense_meds')
def handle_dispense_meds(data):
    ctx = require_socket_roles('staff', 'admin')
    if not ctx:
        return
    data = socket_payload(data)
    if data is None:
        return
    rx_id = data.get('prescriptionId')
    from models import db
    rx = tenant_prescription(rx_id, ctx['hospital_id'])
    if rx:
        rx.status = 'Dispensed'
        db.session.commit()
        emit('queue_updated', {'rx_id': rx.id, 'action': 'dispensed'}, room=tenant_room(ctx['hospital_id']))

if __name__ == '__main__':
    print("Starting Pulse HMS Backend with SQLite on ws://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
