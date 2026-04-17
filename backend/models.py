from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), nullable=False) # 'patient', 'doctor', 'staff'
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    contact = db.Column(db.String(20), unique=True, nullable=True)
    password = db.Column(db.String(200), nullable=True)
    
    # Patient specifics
    age = db.Column(db.Integer, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    blood_type = db.Column(db.String(10), nullable=True)
    height = db.Column(db.String(20), nullable=True)
    weight_baseline = db.Column(db.String(20), nullable=True)
    allergies = db.Column(db.Text, nullable=True)
    
    # Doctor specifics
    specialization = db.Column(db.String(100), nullable=True)
    qualification = db.Column(db.String(200), nullable=True)       # e.g. "MBBS, MD"
    experience_years = db.Column(db.Integer, nullable=True)        # e.g. 12
    consultation_fee = db.Column(db.Float, default=0.0)            # e.g. 500.00
    bio = db.Column(db.Text, nullable=True)                        # short doctor bio
    is_available = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)  # soft-delete
    
class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date_str = db.Column(db.String(20), nullable=False)
    time_str = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(50), default='Scheduled') # Scheduled, Arrived, Vitals_Taken, Consult_Done, Lab_Pending, Completed

    symptoms = db.Column(db.Text, nullable=True)
    pain_level = db.Column(db.Integer, nullable=True)
    followup_days = db.Column(db.Integer, nullable=True)  # doctor recommends follow-up
    clinical_notes = db.Column(db.Text, nullable=True)    # private doctor notes

class Vitals(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    weight = db.Column(db.String(20), nullable=True)
    heart_rate = db.Column(db.String(20), nullable=True)
    blood_pressure = db.Column(db.String(20), nullable=True)
    temperature = db.Column(db.String(20), nullable=True)
    taken_at = db.Column(db.DateTime, default=datetime.utcnow)

class LabTest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    test_name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default='Pending Payment') # Pending Payment, Paid, Sample Collected, Completed
    result_text = db.Column(db.Text, nullable=True)
    ordered_at = db.Column(db.DateTime, default=datetime.utcnow)

class Prescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    medication = db.Column(db.Text, nullable=False)
    instructions = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='Pending Dispense') # Pending Dispense, Dispensed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Rating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    stars = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    consultation_fee = db.Column(db.Float, default=0.0)
    lab_charges = db.Column(db.Float, default=0.0)
    pharmacy_charges = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(30), default='Unpaid')  # Unpaid, Paid
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
