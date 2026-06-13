from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Hospital(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    subdomain = db.Column(db.String(50), unique=True, nullable=False)
    plan = db.Column(db.String(50), default="trial")  # trial, basic, pro, enterprise
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class User(db.Model):
    __table_args__ = (
        db.UniqueConstraint("hospital_id", "email", name="uq_user_hospital_email"),
        db.UniqueConstraint("hospital_id", "contact", name="uq_user_hospital_contact"),
        db.Index("ix_user_hospital_role", "hospital_id", "role"),
        db.Index("ix_user_hospital_active", "hospital_id", "is_active"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'patient', 'doctor', 'staff', 'superadmin'
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=True)  # Unique per hospital handled in app logic
    contact = db.Column(db.String(20), nullable=True)  # Unique per hospital handled in app logic
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
    qualification = db.Column(db.String(200), nullable=True)  # e.g. "MBBS, MD"
    experience_years = db.Column(db.Integer, nullable=True)  # e.g. 12
    consultation_fee = db.Column(db.Float, default=0.0)  # e.g. 500.00
    bio = db.Column(db.Text, nullable=True)  # short doctor bio
    is_available = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)  # soft-delete


class Appointment(db.Model):
    __table_args__ = (
        db.Index("ix_appointment_doctor_slot", "hospital_id", "doctor_id", "date_str", "time_str"),
        db.Index("ix_appointment_hospital_status", "hospital_id", "status"),
        db.Index("ix_appointment_patient", "hospital_id", "patient_id"),
        db.Index("ix_appointment_doctor", "hospital_id", "doctor_id"),
        db.Index("ix_appointment_date", "hospital_id", "date_str"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    date_str = db.Column(db.String(20), nullable=False)
    time_str = db.Column(db.String(20), nullable=False)
    status = db.Column(
        db.String(50), default="Scheduled"
    )  # Scheduled, Arrived, Vitals_Taken, Consult_Done, Lab_Pending, Completed

    symptoms = db.Column(db.Text, nullable=True)
    pain_level = db.Column(db.Integer, nullable=True)
    followup_days = db.Column(db.Integer, nullable=True)  # doctor recommends follow-up
    clinical_notes = db.Column(db.Text, nullable=True)  # private doctor notes


class Vitals(db.Model):
    __table_args__ = (
        db.UniqueConstraint("hospital_id", "appointment_id", name="uq_vitals_appointment"),
        db.Index("ix_vitals_patient", "hospital_id", "patient_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointment.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    weight = db.Column(db.String(20), nullable=True)
    heart_rate = db.Column(db.String(20), nullable=True)
    blood_pressure = db.Column(db.String(20), nullable=True)
    temperature = db.Column(db.String(20), nullable=True)
    taken_at = db.Column(db.DateTime, default=datetime.utcnow)


class LabTest(db.Model):
    __table_args__ = (
        db.Index("ix_lab_test_hospital_status", "hospital_id", "status"),
        db.Index("ix_lab_test_patient", "hospital_id", "patient_id"),
        db.Index("ix_lab_test_appointment", "hospital_id", "appointment_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointment.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    test_name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default="Pending Payment")  # Pending Payment, Paid, Sample Collected, Completed
    result_text = db.Column(db.Text, nullable=True)
    ordered_at = db.Column(db.DateTime, default=datetime.utcnow)


class Prescription(db.Model):
    __table_args__ = (
        db.Index("ix_prescription_hospital_status", "hospital_id", "status"),
        db.Index("ix_prescription_patient", "hospital_id", "patient_id"),
        db.Index("ix_prescription_doctor", "hospital_id", "doctor_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointment.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    medication = db.Column(db.Text, nullable=False)
    instructions = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default="Pending Dispense")  # Pending Dispense, Dispensed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Rating(db.Model):
    __table_args__ = (
        db.UniqueConstraint("hospital_id", "appointment_id", name="uq_rating_appointment"),
        db.Index("ix_rating_doctor", "hospital_id", "doctor_id"),
        db.Index("ix_rating_patient", "hospital_id", "patient_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointment.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    stars = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Invoice(db.Model):
    __table_args__ = (
        db.UniqueConstraint("hospital_id", "appointment_id", name="uq_invoice_appointment"),
        db.Index("ix_invoice_patient", "hospital_id", "patient_id"),
        db.Index("ix_invoice_status", "hospital_id", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointment.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    consultation_fee = db.Column(db.Float, default=0.0)
    lab_charges = db.Column(db.Float, default=0.0)
    pharmacy_charges = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(30), default="Unpaid")  # Unpaid, Paid
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AuditLog(db.Model):
    __table_args__ = (
        db.Index("ix_audit_log_hospital", "hospital_id"),
        db.Index("ix_audit_log_user", "user_id"),
        db.Index("ix_audit_log_resource", "resource_type", "resource_id"),
        db.Index("ix_audit_log_created", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)
    resource_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    request_id = db.Column(db.String(36), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
