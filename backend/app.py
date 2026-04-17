import os
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from models import db, User, Appointment, Vitals, LabTest, Prescription
from auth_routes import auth_bp
from patient_routes import patient_bp
from hospital_routes import hospital_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = 'pulse_secret!'

# Ensure db path
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pulse_hms.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, resources={r"/*": {"origins": "*"}})
db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Create tables
with app.app_context():
    db.create_all()

@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok", "message": "Pulse HMS Backend is running"})

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(patient_bp, url_prefix='/api/patients')
app.register_blueprint(hospital_bp, url_prefix='/api/hospital')

# -- Socket.IO Real-time Logic --
@socketio.on('connect')
def handle_connect():
    print("Client connected")

@socketio.on('action_book_appointment')
def handle_book_appointment(data):
    from datetime import datetime
    
    new_appt = Appointment(
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
    
    # Auto-generate invoice for this appointment
    from models import Invoice
    doctor = User.query.get(new_appt.doctor_id)
    consult_fee = doctor.consultation_fee if doctor else 0
    invoice = Invoice(
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
    }, broadcast=True)

@socketio.on('action_arrive')
def handle_action_arrive(data):
    appt_id = data.get('appointmentId')
    appt = Appointment.query.get(appt_id)
    if appt:
        appt.status = 'Arrived'
        db.session.commit()
        emit('queue_updated', {'id': appt.id, 'status': 'Arrived'}, broadcast=True)

@socketio.on('action_cancel_appointment')
def handle_action_cancel(data):
    appt_id = data.get('appointmentId')
    appt = Appointment.query.get(appt_id)
    if appt and appt.status == 'Scheduled':
        appt.status = 'Cancelled'
        db.session.commit()
        emit('queue_updated', {'id': appt.id, 'status': 'Cancelled'}, broadcast=True)

@socketio.on('action_submit_vitals')
def handle_submit_vitals(data):
    appt_id = data.get('appointmentId')
    appt = Appointment.query.get(appt_id)
    if appt:
        vitals = Vitals(
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
        emit('queue_updated', {'id': appt.id, 'status': 'Vitals_Taken'}, broadcast=True)

@socketio.on('action_prescribe_test')
def handle_prescribe_test(data):
    appt_id = data.get('appointmentId')
    appt = Appointment.query.get(appt_id)
    if appt:
        lab_test = LabTest(
            appointment_id=appt.id,
            patient_id=appt.patient_id,
            test_name=data.get('test_name'),
            status='Pending Payment'
        )
        db.session.add(lab_test)
        appt.status = 'Lab_Pending'
        db.session.commit()
        emit('queue_updated', {'id': appt.id, 'status': 'Lab_Pending'}, broadcast=True)

@socketio.on('action_pay_test')
def handle_pay_test(data):
    test_id = data.get('testId')
    lab_test = LabTest.query.get(test_id)
    if lab_test:
        lab_test.status = 'Paid - Needs Sample'
        db.session.commit()
        emit('queue_updated', {'id': lab_test.appointment_id, 'status': 'Paid'}, broadcast=True)

@socketio.on('action_upload_test_report')
def handle_upload_test_report(data):
    test_id = data.get('testId')
    lab_test = LabTest.query.get(test_id)
    if lab_test:
        lab_test.status = 'Completed'
        lab_test.result_text = data.get('result_text')
        
        # Move appointment back to Doctor for final review
        appt = Appointment.query.get(lab_test.appointment_id)
        if appt:
            appt.status = 'Consult_Pending_Review'
        
        db.session.commit()
        emit('queue_updated', {'id': lab_test.appointment_id, 'status': 'Completed'}, broadcast=True)

@socketio.on('action_prescribe_meds')
def handle_prescribe_meds(data):
    appt_id = data.get('appointmentId')
    appt = Appointment.query.get(appt_id)
    if appt:
        prescription = Prescription(
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
        from hospital_routes import generate_invoice
        try:
            generate_invoice(appt.id) 
        except:
            pass # Already exists or other handled error
            
        emit('queue_updated', {'id': appt.id, 'status': 'Completed'}, broadcast=True)

@socketio.on('action_dispense_meds')
def handle_dispense_meds(data):
    rx_id = data.get('prescriptionId')
    from models import Prescription, db
    rx = Prescription.query.get(rx_id)
    if rx:
        rx.status = 'Dispensed'
        db.session.commit()
        emit('queue_updated', {'rx_id': rx.id, 'action': 'dispensed'}, broadcast=True)

if __name__ == '__main__':
    print("Starting Pulse HMS Backend with SQLite on ws://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
