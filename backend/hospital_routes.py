import logging
import os

from audit import log_action
from auth_utils import (
    current_hospital_id,
    current_user,
    forbidden,
    is_superadmin,
    require_hospital_context,
    require_roles,
    tenant_get,
)
from cache import cache
from config import Config
from flask import Blueprint, g, jsonify, request, send_file
from middleware import query_timeout
from models import Appointment, Document, Invoice, LabTest, Payment, Prescription, Rating, User, Vitals, db
from pagination import get_pagination_params, paginate, paginated_response
from rate_limit import limiter, tenant_key
from sqlalchemy.orm import joinedload, selectinload
from upload_service import save_upload
from validation import int_field, json_body, require_fields

logger = logging.getLogger(__name__)

hospital_bp = Blueprint("hospital", __name__)


def create_invoice_for_appointment(appt):
    existing = Invoice.query.filter_by(hospital_id=appt.hospital_id, appointment_id=appt.id).first()
    if existing:
        return existing, False

    doctor = User.query.get(appt.doctor_id)
    consult_fee = doctor.consultation_fee if doctor else 0
    lab_count = LabTest.query.filter_by(
        hospital_id=appt.hospital_id, appointment_id=appt.id, status="Completed"
    ).count()
    lab_charges = lab_count * 50.0
    pharmacy_charges = 0
    total = consult_fee + lab_charges + pharmacy_charges
    invoice = Invoice(
        hospital_id=appt.hospital_id,
        appointment_id=appt.id,
        patient_id=appt.patient_id,
        consultation_fee=consult_fee,
        lab_charges=lab_charges,
        pharmacy_charges=pharmacy_charges,
        total=total,
    )
    db.session.add(invoice)
    db.session.commit()
    return invoice, True


@hospital_bp.route("/admin/analytics", methods=["GET"])
@require_roles("admin", "superadmin")
@query_timeout(15)
@cache.cached(timeout=30, query_string=True)
def get_admin_analytics():
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    total_patients = User.query.filter_by(hospital_id=hospital_id, role="patient").count()
    total_doctors = User.query.filter_by(hospital_id=hospital_id, role="doctor").count()
    total_staff = User.query.filter_by(hospital_id=hospital_id, role="staff").count()

    total_appointments = Appointment.query.filter_by(hospital_id=hospital_id).count()
    active_appointments = (
        Appointment.query.filter_by(hospital_id=hospital_id)
        .filter(Appointment.status.notin_(["Completed", "Cancelled"]))
        .count()
    )
    completed_appointments = Appointment.query.filter_by(hospital_id=hospital_id, status="Completed").count()
    cancelled_appointments = Appointment.query.filter_by(hospital_id=hospital_id, status="Cancelled").count()

    total_lab_tests = LabTest.query.filter_by(hospital_id=hospital_id).count()
    completed_labs = LabTest.query.filter_by(hospital_id=hospital_id, status="Completed").count()
    pending_payment_labs = LabTest.query.filter_by(hospital_id=hospital_id, status="Pending Payment").count()

    total_prescriptions = Prescription.query.filter_by(hospital_id=hospital_id).count()
    dispensed = Prescription.query.filter_by(hospital_id=hospital_id, status="Dispensed").count()
    pending_dispense = Prescription.query.filter_by(hospital_id=hospital_id, status="Pending Dispense").count()

    actual_revenue = (
        db.session.query(db.func.sum(Invoice.total))
        .filter(Invoice.hospital_id == hospital_id, Invoice.status == "Paid")
        .scalar()
        or 0
    )

    # Status breakdown for pie chart
    status_counts = {}
    for a in Appointment.query.filter_by(hospital_id=hospital_id).all():
        status_counts[a.status] = status_counts.get(a.status, 0) + 1

    status_breakdown = [{"name": k, "value": v} for k, v in status_counts.items()]

    return jsonify(
        {
            "users": {"patients": total_patients, "doctors": total_doctors, "staff": total_staff},
            "appointments": {
                "total": total_appointments,
                "active": active_appointments,
                "completed": completed_appointments,
                "cancelled": cancelled_appointments,
            },
            "lab_tests": {
                "total": total_lab_tests,
                "completed": completed_labs,
                "pending_payment": pending_payment_labs,
            },
            "prescriptions": {
                "total": total_prescriptions,
                "dispensed": dispensed,
                "pending_dispense": pending_dispense,
            },
            "revenue": actual_revenue,
            "status_breakdown": status_breakdown,
            "avg_rating": round(
                db.session.query(db.func.avg(Rating.stars)).filter(Rating.hospital_id == hospital_id).scalar() or 0, 1
            ),
            "total_ratings": Rating.query.filter_by(hospital_id=hospital_id).count(),
        }
    )


@hospital_bp.route("/queue", methods=["GET"])
@require_roles("staff", "admin", "superadmin")
def get_hospital_queue():
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    # Admin/Staff can see everyone Arrived but not Consult_Done
    # For now, let's just fetch Scheduled, Arrived, Vitals_Taken
    page, per_page = get_pagination_params()
    query = Appointment.query.filter_by(hospital_id=hospital_id).filter(
        Appointment.status.in_(["Scheduled", "Arrived", "Vitals_Taken"])
    ).options(joinedload(Appointment.patient), joinedload(Appointment.doctor))
    appts, total, p, pp, pages = paginate(query, page, per_page)

    result = []
    for a in appts:
        result.append(
            {
                "id": a.id,
                "patient_name": a.patient.name if a.patient else "Unknown",
                "doctor_name": a.doctor.name if a.doctor else "Unknown",
                "date": a.date_str,
                "time": a.time_str,
                "status": a.status,
                "pain_level": a.pain_level,
                "symptoms": a.symptoms,
            }
        )
    return paginated_response(result, total, p, pp, pages)


@hospital_bp.route("/doctor/<int:doc_id>/queue", methods=["GET"])
@require_roles("doctor", "admin", "superadmin")
def get_doctor_queue(doc_id):
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    user = current_user()
    if user.role == "doctor" and user.id != doc_id:
        return forbidden("Doctors can only access their own queue")
    doctor = User.query.filter_by(id=doc_id, hospital_id=hospital_id, role="doctor", is_active=True).first()
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404
    # Doctor sees patients ready, arrived, or returning from lab
    page, per_page = get_pagination_params()
    query = Appointment.query.filter_by(hospital_id=hospital_id, doctor_id=doc_id).filter(
        Appointment.status.in_(["Arrived", "Vitals_Taken", "Lab_Pending", "Consult_Pending_Review"])
    ).options(
        joinedload(Appointment.patient),
        selectinload(Appointment.vitals_rel),
        selectinload(Appointment.lab_tests_rel),
    )
    appts, total, p, pp, pages = paginate(query, page, per_page)

    result = []
    for a in appts:
        p = a.patient
        vitals_entry = a.vitals_rel
        result.append(
            {
                "id": a.id,
                "patient_id": p.id,
                "patient_name": p.name if p else "Unknown",
                "patient_age": p.age if p else "N/A",
                "patient_height": p.height if p else "N/A",
                "patient_weight_baseline": p.weight_baseline if p else "N/A",
                "patient_allergies": p.allergies if p else "None reported",
                "symptoms": a.symptoms,
                "pain_level": a.pain_level,
                "date": a.date_str,
                "time": a.time_str,
                "status": a.status,
                "vitals": {
                    "weight": vitals_entry.weight if vitals_entry else None,
                    "hr": vitals_entry.heart_rate if vitals_entry else None,
                    "bp": vitals_entry.blood_pressure if vitals_entry else None,
                    "temp": vitals_entry.temperature if vitals_entry else None,
                }
                if vitals_entry
                else None,
                "lab_tests": [
                    {"test_name": t.test_name, "status": t.status, "result_text": t.result_text}
                    for t in a.lab_tests_rel
                ],
            }
        )
    return paginated_response(result, total, p, pp, pages)


@hospital_bp.route("/doctor/<int:doc_id>/stats", methods=["GET"])
@require_roles("doctor", "admin", "superadmin")
def get_doctor_stats(doc_id):
    from datetime import datetime

    from models import Appointment, Rating, User, db

    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    user = current_user()
    if user.role == "doctor" and user.id != doc_id:
        return forbidden("Doctors can only access their own stats")
    doctor = User.query.filter_by(id=doc_id, hospital_id=hospital_id, role="doctor", is_active=True).first()
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404

    # Patients seen today
    today = datetime.now().strftime("%Y-%m-%d")
    patients_today = Appointment.query.filter_by(
        hospital_id=hospital_id, doctor_id=doc_id, status="Completed", date_str=today
    ).count()

    # Total revenue from this doctor's appointments (Consultation + Paid Labs)
    appts = Appointment.query.filter_by(hospital_id=hospital_id, doctor_id=doc_id).options(
        selectinload(Appointment.invoice_rel)
    ).all()
    revenue = 0
    for a in appts:
        inv = a.invoice_rel
        if inv and inv.status == "Paid":
            revenue += inv.total

    # Avg rating
    avg_rating = (
        db.session.query(db.func.avg(Rating.stars))
        .filter(Rating.hospital_id == hospital_id, Rating.doctor_id == doc_id)
        .scalar()
        or 0
    )

    return jsonify({"patients_today": patients_today, "revenue": round(revenue, 2), "rating": round(avg_rating, 1)})


@hospital_bp.route("/lab/queue", methods=["GET"])
@require_roles("staff", "admin", "superadmin")
def get_lab_queue():
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    # Staff sees tests that are Paid - Needs Sample
    page, per_page = get_pagination_params()
    query = LabTest.query.filter_by(hospital_id=hospital_id, status="Paid - Needs Sample").options(
        joinedload(LabTest.patient_labs)
    )
    tests, total, p, pp, pages = paginate(query, page, per_page)
    result = []
    for t in tests:
        result.append(
            {
                "id": t.id,
                "patient_name": t.patient_labs.name if t.patient_labs else "Unknown",
                "test_name": t.test_name,
                "status": t.status,
                "ordered_at": t.ordered_at,
            }
        )
    return paginated_response(result, total, p, pp, pages)


@hospital_bp.route("/patient/<int:patient_id>/tests", methods=["GET"])
@require_roles("patient", "staff", "doctor", "admin", "superadmin")
def get_patient_tests(patient_id):
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    user = current_user()
    if user.role == "patient" and user.id != patient_id:
        return forbidden("Patients can only access their own tests")
    query = LabTest.query.filter_by(hospital_id=hospital_id, patient_id=patient_id)
    if user.role == "doctor":
        query = query.join(Appointment, Appointment.id == LabTest.appointment_id).filter(
            Appointment.doctor_id == user.id
        )
    page, per_page = get_pagination_params()
    tests, total, p, pp, pages = paginate(query.order_by(LabTest.id.desc()), page, per_page)
    result = []
    for t in tests:
        result.append({"id": t.id, "test_name": t.test_name, "status": t.status, "result_text": t.result_text})
    return paginated_response(result, total, p, pp, pages)


@hospital_bp.route("/pharmacy/queue", methods=["GET"])
@require_roles("staff", "admin", "superadmin")
def get_pharmacy_queue():
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    page, per_page = get_pagination_params()
    query = Prescription.query.filter_by(hospital_id=hospital_id, status="Pending Dispense").options(
        joinedload(Prescription.patient_rx), joinedload(Prescription.doctor_rx)
    )
    prescriptions, total, p, pp, pages = paginate(query, page, per_page)
    result = []
    for rx in prescriptions:
        result.append(
            {
                "id": rx.id,
                "patient_name": rx.patient_rx.name if rx.patient_rx else "Unknown",
                "doctor_name": rx.doctor_rx.name if rx.doctor_rx else "Unknown",
                "medication": rx.medication,
                "status": rx.status,
                "created_at": str(rx.created_at),
            }
        )
    return paginated_response(result, total, p, pp, pages)


@hospital_bp.route("/rating", methods=["POST"])
@require_roles("patient", "admin", "superadmin")
def submit_rating():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "appointment_id", "patient_id", "doctor_id", "stars")
    if error:
        return error, status
    appointment_id, error, status = int_field(data, "appointment_id", minimum=1, required=True)
    if error:
        return error, status
    patient_id, error, status = int_field(data, "patient_id", minimum=1, required=True)
    if error:
        return error, status
    doctor_id, error, status = int_field(data, "doctor_id", minimum=1, required=True)
    if error:
        return error, status
    stars, error, status = int_field(data, "stars", minimum=1, maximum=5, required=True)
    if error:
        return error, status
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    user = current_user()
    if user.role == "patient" and user.id != patient_id:
        return forbidden("Patients can only rate their own visits")
    existing = Rating.query.filter_by(hospital_id=hospital_id, appointment_id=appointment_id).first()
    if existing:
        return jsonify({"error": "Already rated this visit"}), 409
    appt = tenant_get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    if appt.patient_id != patient_id or appt.doctor_id != doctor_id:
        return jsonify({"error": "Rating does not match this appointment"}), 400

    rating = Rating(
        hospital_id=appt.hospital_id,
        appointment_id=appointment_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        stars=stars,
        comment=data.get("comment", ""),
    )
    db.session.add(rating)
    db.session.commit()
    return jsonify({"message": "Rating submitted"}), 201


@hospital_bp.route("/doctor/<int:doc_id>/availability", methods=["PUT"])
@require_roles("doctor", "admin", "superadmin")
def toggle_availability(doc_id):
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    current = current_user()
    if current.role == "doctor" and current.id != doc_id:
        return forbidden("Doctors can only update their own availability")
    user = User.query.filter_by(id=doc_id, hospital_id=hospital_id).first()
    if not user or user.role != "doctor":
        return jsonify({"error": "Doctor not found"}), 404
    user.is_available = not user.is_available
    db.session.commit()
    return jsonify({"is_available": user.is_available})


# ===== TIME SLOTS =====

AVAILABLE_SLOTS = [
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "12:00 PM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
]


@hospital_bp.route("/doctor/<int:doc_id>/slots", methods=["GET"])
@require_roles("patient", "staff", "doctor", "admin", "superadmin")
def get_available_slots(doc_id):
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    date = request.args.get("date")
    if not date:
        return jsonify({"error": "Date parameter required"}), 400
    doctor = User.query.filter_by(id=doc_id, hospital_id=hospital_id, role="doctor", is_active=True).first()
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404
    booked = (
        Appointment.query.filter_by(hospital_id=hospital_id, doctor_id=doc_id, date_str=date)
        .filter(Appointment.status.notin_(["Cancelled"]))
        .all()
    )
    booked_times = [a.time_str for a in booked]
    open_slots = [s for s in AVAILABLE_SLOTS if s not in booked_times]
    return jsonify({"date": date, "slots": open_slots, "booked": booked_times})


# ===== CLINICAL NOTES (DOCTOR ONLY) =====


@hospital_bp.route("/appointment/<int:appt_id>/notes", methods=["PUT"])
@require_roles("doctor", "admin", "superadmin")
def save_clinical_notes(appt_id):
    appt = tenant_get(Appointment, appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    user = current_user()
    if user.role == "doctor" and user.id != appt.doctor_id:
        return forbidden("Doctors can only edit notes for their own appointments")
    data, error, status = json_body()
    if error:
        return error, status
    appt.clinical_notes = data.get("notes", "")
    db.session.commit()
    return jsonify({"message": "Notes saved"})


@hospital_bp.route("/appointment/<int:appt_id>/notes", methods=["GET"])
@require_roles("doctor", "admin", "superadmin")
def get_clinical_notes(appt_id):
    appt = tenant_get(Appointment, appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    user = current_user()
    if user.role == "doctor" and user.id != appt.doctor_id:
        return forbidden("Doctors can only access notes for their own appointments")
    return jsonify({"notes": appt.clinical_notes or ""})


# ===== RESCHEDULING =====


@hospital_bp.route("/appointment/<int:appt_id>/reschedule", methods=["PUT"])
@require_roles("patient", "staff", "admin", "superadmin")
def reschedule_appointment(appt_id):
    appt = tenant_get(Appointment, appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    user = current_user()
    if user.role == "patient" and user.id != appt.patient_id:
        return forbidden("Patients can only reschedule their own appointments")
    if appt.status != "Scheduled":
        return jsonify({"error": "Can only reschedule scheduled appointments"}), 400
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "date", "time")
    if error:
        return error, status
    new_date = data.get("date")
    new_time = data.get("time")
    # Check if slot is available
    conflict = (
        Appointment.query.filter_by(
            hospital_id=appt.hospital_id, doctor_id=appt.doctor_id, date_str=new_date, time_str=new_time
        )
        .filter(Appointment.id != appt.id, Appointment.status.notin_(["Cancelled"]))
        .first()
    )
    if conflict:
        return jsonify({"error": "This slot is already booked"}), 409
    appt.date_str = new_date
    appt.time_str = new_time
    db.session.commit()
    return jsonify({"message": "Appointment rescheduled", "date": new_date, "time": new_time})


# ===== BILLING & INVOICING =====


@hospital_bp.route("/appointment/<int:appt_id>/invoice", methods=["POST"])
@require_roles("admin", "staff", "doctor", "superadmin")
def generate_invoice(appt_id):
    appt = tenant_get(Appointment, appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    user = current_user()
    if user.role == "doctor" and user.id != appt.doctor_id:
        return forbidden("Doctors can only generate invoices for their own appointments")
    invoice, created = create_invoice_for_appointment(appt)
    if not created:
        return jsonify({"error": "Invoice already exists", "invoice_id": invoice.id}), 409
    return jsonify(
        {
            "id": invoice.id,
            "consultation_fee": invoice.consultation_fee,
            "lab_charges": invoice.lab_charges,
            "pharmacy_charges": invoice.pharmacy_charges,
            "total": invoice.total,
            "status": invoice.status,
        }
    ), 201


@hospital_bp.route("/patient/<int:patient_id>/invoices", methods=["GET"])
@require_roles("patient", "staff", "admin", "superadmin")
def get_patient_invoices(patient_id):
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    user = current_user()
    if user.role == "patient" and user.id != patient_id:
        return forbidden("Patients can only access their own invoices")
    page, per_page = get_pagination_params()
    query = Invoice.query.filter_by(hospital_id=hospital_id, patient_id=patient_id).options(
        joinedload(Invoice.appointment_inv)
    )
    invoices, total, p, pp, pages = paginate(query, page, per_page)
    result = []
    for inv in invoices:
        appt = inv.appointment_inv
        doctor = appt.doctor if appt else None

        # Dynamically recalculate lab charges from actual lab tests
        lab_tests = LabTest.query.filter_by(hospital_id=inv.hospital_id, appointment_id=inv.appointment_id).all()
        # Count all tests ordered for this visit that are either Paid or Pending Payment
        active_lab_count = len([t for t in lab_tests if t.status != "Cancelled"])
        lab_charges = active_lab_count * 50  # ₹50 per test

        # Update invoice if lab charges changed, but only if not already Paid
        if inv.status != "Paid" and lab_charges != inv.lab_charges:
            inv.lab_charges = lab_charges
            inv.total = inv.consultation_fee + lab_charges + inv.pharmacy_charges
            db.session.commit()

        result.append(
            {
                "id": inv.id,
                "appointment_id": inv.appointment_id,
                "doctor_name": doctor.name if doctor else "Unknown",
                "date": appt.date_str if appt else "",
                "consultation_fee": inv.consultation_fee,
                "lab_charges": inv.lab_charges,
                "pharmacy_charges": inv.pharmacy_charges,
                "total": inv.total,
                "status": inv.status,
                "created_at": str(inv.created_at),
            }
        )
    return paginated_response(result, total, p, pp, pages)


@hospital_bp.route("/invoice/<int:inv_id>/pay", methods=["PUT"])
@require_roles("patient", "staff", "admin", "superadmin")
def pay_invoice(inv_id):
    from datetime import datetime

    inv = tenant_get(Invoice, inv_id)
    if not inv:
        return jsonify({"error": "Invoice not found"}), 404
    if inv.status == "Paid":
        return jsonify({"error": "Invoice already paid"}), 409
    user = current_user()
    if user.role == "patient" and user.id != inv.patient_id:
        return forbidden("Patients can only pay their own invoices")

    payment = Payment(
        hospital_id=inv.hospital_id,
        invoice_id=inv.id,
        patient_id=inv.patient_id,
        amount=inv.total,
        method="cash",
        transaction_id=f"TXN{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{inv.id}",
        status="completed",
        paid_at=datetime.utcnow(),
    )
    db.session.add(payment)
    inv.status = "Paid"
    db.session.commit()

    log_action(
        hospital_id=inv.hospital_id,
        user_id=user.id,
        action="pay_invoice",
        resource_type="invoice",
        resource_id=inv.id,
        details={
            "amount": inv.total,
            "payment_id": payment.id,
            "transaction_id": payment.transaction_id,
            "method": payment.method,
        },
        ip_address=getattr(g, "ip_address", None),
    )

    from flask_socketio import emit
    from services import tenant_room

    try:
        emit("payment_processed", {"invoice_id": inv.id, "amount": inv.total}, room=tenant_room(inv.hospital_id))
    except Exception:
        logger.warning("Could not emit socket event for payment")

    from tasks import generate_invoice_pdf

    try:
        generate_invoice_pdf.delay(inv.id, inv.hospital_id)
    except Exception:
        logger.warning("Could not enqueue invoice PDF task (Celery broker unavailable)")

    return jsonify({"message": "Invoice paid", "payment_id": payment.id, "transaction_id": payment.transaction_id})


@hospital_bp.route("/invoice/<int:inv_id>/create-payment-intent", methods=["POST"])
@require_roles("patient", "staff", "admin", "superadmin")
def create_payment_intent(inv_id):
    from payments_stripe import create_payment_intent as cpi

    inv = tenant_get(Invoice, inv_id)
    if not inv:
        return jsonify({"error": "Invoice not found"}), 404
    if inv.status == "Paid":
        return jsonify({"error": "Invoice already paid"}), 409

    amount_cents = int(inv.total * 100)
    intent = cpi(amount_cents, metadata={"invoice_id": inv.id, "hospital_id": inv.hospital_id})

    if "error" in intent:
        return jsonify({"error": intent["error"]}), 500

    return jsonify(
        {
            "client_secret": intent["client_secret"],
            "payment_intent_id": intent["id"],
            "amount": intent["amount"],
            "publishable_key": Config.STRIPE_PUBLISHABLE_KEY,
        }
    )


@hospital_bp.route("/invoice/<int:inv_id>/confirm-online-payment", methods=["POST"])
@require_roles("patient", "staff", "admin", "superadmin")
def confirm_online_payment(inv_id):
    from datetime import datetime

    from payments_stripe import confirm_payment

    inv = tenant_get(Invoice, inv_id)
    if not inv:
        return jsonify({"error": "Invoice not found"}), 404
    if inv.status == "Paid":
        return jsonify({"error": "Invoice already paid"}), 409

    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "payment_intent_id")
    if error:
        return error, status

    result = confirm_payment(data["payment_intent_id"])
    if "error" in result:
        return jsonify({"error": result["error"]}), 500

    if result.get("status") != "succeeded":
        return jsonify({"error": f"Payment not successful: {result.get('status')}"}), 400

    user = current_user()
    payment = Payment(
        hospital_id=inv.hospital_id,
        invoice_id=inv.id,
        patient_id=inv.patient_id,
        amount=inv.total,
        method="online",
        transaction_id=data["payment_intent_id"],
        status="completed",
        paid_at=datetime.utcnow(),
    )
    db.session.add(payment)
    inv.status = "Paid"
    db.session.commit()

    log_action(
        hospital_id=inv.hospital_id,
        user_id=user.id,
        action="pay_invoice_online",
        resource_type="invoice",
        resource_id=inv.id,
        details={
            "amount": inv.total,
            "payment_id": payment.id,
            "transaction_id": payment.transaction_id,
            "method": "online",
        },
        ip_address=getattr(g, "ip_address", None),
    )

    from flask_socketio import emit
    from services import tenant_room
    from tasks import generate_invoice_pdf

    try:
        emit("payment_processed", {"invoice_id": inv.id, "amount": inv.total}, room=tenant_room(inv.hospital_id))
    except Exception:
        logger.warning("Could not emit socket event for online payment")
    try:
        generate_invoice_pdf.delay(inv.id, inv.hospital_id)
    except Exception:
        logger.warning("Could not enqueue invoice PDF task (Celery broker unavailable)")

    return jsonify({"message": "Online payment confirmed", "payment_id": payment.id})


# ===== CLINICAL SUMMARIES =====


@hospital_bp.route("/appointment/<int:appt_id>/summary", methods=["GET"])
@require_roles("patient", "doctor", "admin", "staff", "superadmin")
def get_appointment_summary(appt_id):
    appt = tenant_get(Appointment, appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    user = current_user()
    if user.role == "patient" and user.id != appt.patient_id:
        return forbidden("Patients can only access their own visit summaries")
    if user.role == "doctor" and user.id != appt.doctor_id:
        return forbidden("Doctors can only access their own visit summaries")
    patient = User.query.get(appt.patient_id)
    doctor = User.query.get(appt.doctor_id)

    vitals = Vitals.query.filter_by(hospital_id=appt.hospital_id, appointment_id=appt_id).first()
    labs = LabTest.query.filter_by(hospital_id=appt.hospital_id, appointment_id=appt_id).all()
    presc = Prescription.query.filter_by(hospital_id=appt.hospital_id, appointment_id=appt_id).first()

    return jsonify(
        {
            "appointment": {
                "id": appt.id,
                "date": appt.date_str,
                "time": appt.time_str,
                "symptoms": appt.symptoms,
                "clinical_notes": appt.clinical_notes,
                "followup": appt.followup_days,
            },
            "patient": {
                "name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "blood_type": patient.blood_type,
            },
            "doctor": {"name": doctor.name, "specialization": doctor.specialization},
            "vitals": {
                "bp": vitals.blood_pressure if vitals else "N/A",
                "hr": vitals.heart_rate if vitals else "N/A",
                "temp": vitals.temperature if vitals else "N/A",
                "weight": vitals.weight if vitals else "N/A",
            },
            "labs": [{"test_name": lab.test_name, "result": lab.result_text, "status": lab.status} for lab in labs],
            "prescription": presc.medication if presc else "No prescription issued",
        }
    )


# ===== ADMIN SEARCH & FILTERS =====


@hospital_bp.route("/admin/search", methods=["GET"])
@require_roles("admin", "superadmin")
def admin_search():
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    query = request.args.get("q", "").lower()
    role_filter = request.args.get("role")
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    results = {"users": [], "appointments": []}

    # Search users
    users_q = User.query.filter_by(hospital_id=hospital_id)
    if role_filter:
        users_q = users_q.filter_by(role=role_filter)
    page, per_page = get_pagination_params()
    users, user_total, up, upp, upages = paginate(users_q, page, per_page)
    for u in users:
        if (
            query
            and query not in (u.name or "").lower()
            and query not in (u.email or "").lower()
            and query not in (u.contact or "").lower()
        ):
            continue
        results["users"].append(
            {
                "id": u.id,
                "name": u.name,
                "role": u.role,
                "email": u.email,
                "contact": u.contact,
                "is_active": u.is_active,
            }
        )

    # Search appointments
    appts_q = Appointment.query.filter_by(hospital_id=hospital_id).options(
        joinedload(Appointment.patient), joinedload(Appointment.doctor)
    )
    if date_from:
        appts_q = appts_q.filter(Appointment.date_str >= date_from)
    if date_to:
        appts_q = appts_q.filter(Appointment.date_str <= date_to)
    appts_q = appts_q.order_by(Appointment.date_str.desc())
    appts, appt_total, ap, app, apages = paginate(appts_q, page, per_page)
    for a in appts:
        patient_name = a.patient.name if a.patient else ""
        doctor_name = a.doctor.name if a.doctor else ""
        if query and query not in patient_name.lower() and query not in doctor_name.lower():
            continue
        results["appointments"].append(
            {
                "id": a.id,
                "patient_name": a.patient.name if a.patient else "Unknown",
                "doctor_name": a.doctor.name if a.doctor else "Unknown",
                "date": a.date_str,
                "time": a.time_str,
                "status": a.status,
            }
        )

    resp = jsonify(results)
    resp.headers["X-Total-Users"] = str(user_total)
    resp.headers["X-Total-Appointments"] = str(appt_total)
    return resp


@hospital_bp.route("/lab/upload", methods=["POST"])
@require_roles("staff", "doctor", "admin")
@limiter.limit("10 per minute", key_func=tenant_key)
def upload_lab_report():
    hospital_id, error_resp, status = require_hospital_context()
    if error_resp:
        return error_resp, status

    user = current_user()
    patient_id = request.form.get("patient_id")
    lab_test_id = request.form.get("lab_test_id")
    description = request.form.get("description")

    missing = []
    if not patient_id:
        missing.append("patient_id")
    if not lab_test_id:
        missing.append("lab_test_id")
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        patient_id = int(patient_id)
        lab_test_id = int(lab_test_id)
    except (TypeError, ValueError):
        return jsonify({"error": "patient_id and lab_test_id must be integers"}), 400

    lab_test = LabTest.query.filter_by(id=lab_test_id, hospital_id=hospital_id).first()
    if not lab_test:
        return jsonify({"error": "Lab test not found"}), 404

    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file provided"}), 400

    doc, err = save_upload(file, hospital_id, patient_id, user.id, lab_test_id, description)
    if err:
        return jsonify({"error": err}), 400

    lab_test.status = "Completed"
    db.session.commit()

    log_action(
        hospital_id,
        user.id,
        "upload_lab_report",
        "lab_test",
        lab_test_id,
        f"Uploaded {doc.original_name} ({doc.file_size} bytes)",
    )

    return jsonify(
        {
            "document": {
                "id": doc.id,
                "original_name": doc.original_name,
                "file_size": doc.file_size,
                "content_type": doc.content_type,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            }
        }
    ), 201


@hospital_bp.route("/lab/documents/<int:doc_id>", methods=["GET"])
@require_roles("patient", "staff", "doctor", "admin", "superadmin")
def download_lab_report(doc_id):
    user = current_user()
    hospital_id = current_hospital_id() or user.hospital_id
    if not hospital_id:
        return jsonify({"error": "hospital_id is required"}), 400

    doc = (Document.query if is_superadmin() else Document.query.filter_by(hospital_id=hospital_id))
    doc = doc.filter_by(id=doc_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    if user.role == "patient" and doc.patient_id != user.id:
        return forbidden()

    filepath = os.path.join(Config.UPLOAD_FOLDER, doc.filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found on disk"}), 404

    return send_file(filepath, mimetype=doc.content_type, as_attachment=True, download_name=doc.original_name)


@hospital_bp.route("/lab/test/<int:test_id>/documents", methods=["GET"])
@require_roles("patient", "staff", "doctor", "admin", "superadmin")
def list_lab_documents(test_id):
    user = current_user()
    hospital_id = current_hospital_id() or user.hospital_id
    if not hospital_id:
        return jsonify({"error": "hospital_id is required"}), 400

    lab_test = (LabTest.query if is_superadmin() else LabTest.query.filter_by(hospital_id=hospital_id))
    lab_test = lab_test.filter_by(id=test_id).first()
    if not lab_test:
        return jsonify({"error": "Lab test not found"}), 404

    if user.role == "patient" and lab_test.patient_id != user.id:
        return forbidden()

    docs = Document.query.filter_by(lab_test_id=test_id, hospital_id=hospital_id).all()
    return jsonify(
        {
            "documents": [
                {
                    "id": d.id,
                    "original_name": d.original_name,
                    "file_size": d.file_size,
                    "content_type": d.content_type,
                    "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
                }
                for d in docs
            ]
        }
    )
