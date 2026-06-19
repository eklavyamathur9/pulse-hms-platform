from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


# ── Status Constants ──────────────────────────────────────────────

class AppointmentStatus:
    SCHEDULED = "Scheduled"
    ARRIVED = "Arrived"
    VITALS_TAKEN = "Vitals_Taken"
    CONSULT_DONE = "Consult_Done"
    LAB_PENDING = "Lab_Pending"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    ALL = {SCHEDULED, ARRIVED, VITALS_TAKEN, CONSULT_DONE, LAB_PENDING, COMPLETED, CANCELLED}


class LabTestStatus:
    PENDING_PAYMENT = "Pending Payment"
    PAID = "Paid"
    SAMPLE_COLLECTED = "Sample Collected"
    COMPLETED = "Completed"
    ALL = {PENDING_PAYMENT, PAID, SAMPLE_COLLECTED, COMPLETED}


class PrescriptionStatus:
    PENDING_DISPENSE = "Pending Dispense"
    DISPENSED = "Dispensed"
    ALL = {PENDING_DISPENSE, DISPENSED}


class InvoiceStatus:
    UNPAID = "Unpaid"
    PAID = "Paid"
    ALL = {UNPAID, PAID}


class PaymentStatus:
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    ALL = {PENDING, COMPLETED, FAILED, REFUNDED}


class TeleconsultationStatus:
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ALL = {SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED}


class WebhookDeliveryStatus:
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    ALL = {PENDING, DELIVERED, FAILED}


class PaymentMethod:
    CASH = "cash"
    CARD = "card"
    ONLINE = "online"
    INSURANCE = "insurance"
    ALL = {CASH, CARD, ONLINE, INSURANCE}


class UserRole:
    PATIENT = "patient"
    DOCTOR = "doctor"
    STAFF = "staff"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"
    ALL = {PATIENT, DOCTOR, STAFF, ADMIN, SUPERADMIN}


class HospitalPlan:
    TRIAL = "trial"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    ALL = {TRIAL, BASIC, PRO, ENTERPRISE}


class Hospital(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    subdomain = db.Column(db.String(50), unique=True, nullable=False)
    plan = db.Column(db.String(50), default="trial")  # trial, basic, pro, enterprise
    is_active = db.Column(db.Boolean, default=True)
    feature_flags = db.Column(db.JSON, default=dict)
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
    password_changed_at = db.Column(db.DateTime, nullable=True)


class RefreshToken(db.Model):
    __table_args__ = (
        db.Index("ix_refresh_token_user", "user_id"),
        db.Index("ix_refresh_token_expires", "expires_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    token_hash = db.Column(db.String(200), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_revoked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


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


class Payment(db.Model):
    __table_args__ = (
        db.Index("ix_payment_invoice", "hospital_id", "invoice_id"),
        db.Index("ix_payment_patient", "hospital_id", "patient_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoice.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(30), default="cash")  # cash, card, online, insurance
    transaction_id = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), default="completed")  # pending, completed, failed, refunded
    paid_at = db.Column(db.DateTime, default=datetime.utcnow)


class Document(db.Model):
    __table_args__ = (
        db.Index("ix_document_hospital", "hospital_id"),
        db.Index("ix_document_lab_test", "hospital_id", "lab_test_id"),
        db.Index("ix_document_patient", "hospital_id", "patient_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    lab_test_id = db.Column(db.Integer, db.ForeignKey("lab_test.id"), nullable=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    filename = db.Column(db.String(256), nullable=False)
    original_name = db.Column(db.String(256), nullable=False)
    content_type = db.Column(db.String(100), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, nullable=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)


class ApiKey(db.Model):
    __table_args__ = (
        db.Index("ix_api_key_hospital", "hospital_id"),
        db.Index("ix_api_key_key_hash", "key_hash"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    key_hash = db.Column(db.String(200), nullable=False, unique=True)
    key_prefix = db.Column(db.String(20), nullable=False)
    scopes = db.Column(db.JSON, default=list)
    is_active = db.Column(db.Boolean, default=True)
    last_used_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Webhook(db.Model):
    __table_args__ = (db.Index("ix_webhook_hospital", "hospital_id"),)

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    secret = db.Column(db.String(200), nullable=False)
    events = db.Column(db.JSON, default=list)
    is_active = db.Column(db.Boolean, default=True)
    retry_count = db.Column(db.Integer, default=3)
    timeout_seconds = db.Column(db.Integer, default=10)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class WebhookDelivery(db.Model):
    __table_args__ = (
        db.Index("ix_webhook_delivery_webhook", "webhook_id"),
        db.Index("ix_webhook_delivery_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    webhook_id = db.Column(db.Integer, db.ForeignKey("webhook.id"), nullable=False)
    event = db.Column(db.String(50), nullable=False)
    payload = db.Column(db.JSON, nullable=False)
    status = db.Column(db.String(20), default="pending")
    response_code = db.Column(db.Integer, nullable=True)
    response_body = db.Column(db.Text, nullable=True)
    attempts = db.Column(db.Integer, default=0)
    next_retry_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Teleconsultation(db.Model):
    __table_args__ = (
        db.Index("ix_teleconsultation_appointment", "appointment_id"),
        db.Index("ix_teleconsultation_hospital_status", "hospital_id", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospital.id"), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointment.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    room_name = db.Column(db.String(100), nullable=False, unique=True)
    provider = db.Column(db.String(50), default="jitsi")
    status = db.Column(db.String(30), default="scheduled")
    scheduled_at = db.Column(db.DateTime, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)
    meeting_url = db.Column(db.String(500), nullable=True)
    recording_url = db.Column(db.String(500), nullable=True)
    notes = db.Column(db.Text, nullable=True)
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
