from flask import Blueprint, jsonify, request
from models import Appointment, User, Vitals, LabTest, Prescription, Rating, Invoice, db

hospital_bp = Blueprint('hospital', __name__)

@hospital_bp.route('/admin/analytics', methods=['GET'])
def get_admin_analytics():
    total_patients = User.query.filter_by(role='patient').count()
    total_doctors = User.query.filter_by(role='doctor').count()
    total_staff = User.query.filter_by(role='staff').count()

    total_appointments = Appointment.query.count()
    active_appointments = Appointment.query.filter(Appointment.status.notin_(['Completed', 'Cancelled'])).count()
    completed_appointments = Appointment.query.filter_by(status='Completed').count()
    cancelled_appointments = Appointment.query.filter_by(status='Cancelled').count()

    total_lab_tests = LabTest.query.count()
    completed_labs = LabTest.query.filter_by(status='Completed').count()
    pending_payment_labs = LabTest.query.filter_by(status='Pending Payment').count()

    total_prescriptions = Prescription.query.count()
    dispensed = Prescription.query.filter_by(status='Dispensed').count()
    pending_dispense = Prescription.query.filter_by(status='Pending Dispense').count()

    lab_revenue = completed_labs * 50  # ₹50 per test

    # Status breakdown for pie chart
    status_counts = {}
    for a in Appointment.query.all():
        status_counts[a.status] = status_counts.get(a.status, 0) + 1

    status_breakdown = [{"name": k, "value": v} for k, v in status_counts.items()]

    return jsonify({
        "users": {
            "patients": total_patients,
            "doctors": total_doctors,
            "staff": total_staff
        },
        "appointments": {
            "total": total_appointments,
            "active": active_appointments,
            "completed": completed_appointments,
            "cancelled": cancelled_appointments
        },
        "lab_tests": {
            "total": total_lab_tests,
            "completed": completed_labs,
            "pending_payment": pending_payment_labs
        },
        "prescriptions": {
            "total": total_prescriptions,
            "dispensed": dispensed,
            "pending_dispense": pending_dispense
        },
        "revenue": lab_revenue,
        "status_breakdown": status_breakdown,
        "avg_rating": round(db.session.query(db.func.avg(Rating.stars)).scalar() or 0, 1),
        "total_ratings": Rating.query.count()
    })

@hospital_bp.route('/queue', methods=['GET'])
def get_hospital_queue():
    # Admin/Staff can see everyone Arrived but not Consult_Done
    # For now, let's just fetch Scheduled, Arrived, Vitals_Taken
    appts = Appointment.query.filter(Appointment.status.in_(['Scheduled', 'Arrived', 'Vitals_Taken'])).all()
    
    result = []
    for a in appts:
        patient = User.query.get(a.patient_id)
        doctor = User.query.get(a.doctor_id)
        result.append({
            "id": a.id,
            "patient_name": patient.name if patient else "Unknown",
            "doctor_name": doctor.name if doctor else "Unknown",
            "date": a.date_str,
            "time": a.time_str,
            "status": a.status,
            "pain_level": a.pain_level,
            "symptoms": a.symptoms
        })
    return jsonify(result)

@hospital_bp.route('/doctor/<int:doc_id>/queue', methods=['GET'])
def get_doctor_queue(doc_id):
    # Doctor sees patients ready, arrived, or returning from lab
    appts = Appointment.query.filter_by(doctor_id=doc_id).filter(Appointment.status.in_(['Arrived', 'Vitals_Taken', 'Lab_Pending', 'Consult_Pending_Review'])).all()
    
    result = []
    for a in appts:
        patient = User.query.get(a.patient_id)
        # Fetch vitals if they exist
        vitals_entry = Vitals.query.filter_by(appointment_id=a.id).first()
        result.append({
            "id": a.id,
            "patient_id": patient.id,
            "patient_name": patient.name if patient else "Unknown",
            "patient_age": patient.age if patient else "N/A",
            "patient_height": patient.height if patient else "N/A",
            "patient_weight_baseline": patient.weight_baseline if patient else "N/A",
            "patient_allergies": patient.allergies if patient else "None reported",
            "symptoms": a.symptoms,
            "pain_level": a.pain_level,
            "date": a.date_str,
            "time": a.time_str,
            "status": a.status,
            "vitals": {
                "weight": vitals_entry.weight if vitals_entry else None,
                "hr": vitals_entry.heart_rate if vitals_entry else None,
                "bp": vitals_entry.blood_pressure if vitals_entry else None,
                "temp": vitals_entry.temperature if vitals_entry else None
            } if vitals_entry else None,
            "lab_tests": [
                {
                    "test_name": t.test_name,
                    "status": t.status,
                    "result_text": t.result_text
                } for t in LabTest.query.filter_by(appointment_id=a.id).all()
            ]
        })
    return jsonify(result)

@hospital_bp.route('/doctor/<int:doc_id>/stats', methods=['GET'])
def get_doctor_stats(doc_id):
    from models import Rating, db, Invoice, Appointment, LabTest, User
    from datetime import datetime
    
    # Patients seen today
    today = datetime.now().strftime('%Y-%m-%d')
    patients_today = Appointment.query.filter_by(doctor_id=doc_id, status='Completed', date_str=today).count()
    
    # Total revenue from this doctor's appointments (Consultation + Paid Labs)
    appts = Appointment.query.filter_by(doctor_id=doc_id).all()
    revenue = 0
    for a in appts:
        inv = Invoice.query.filter_by(appointment_id=a.id, status='Paid').first()
        if inv:
            revenue += inv.total
            
    # Avg rating
    avg_rating = db.session.query(db.func.avg(Rating.stars)).filter(Rating.doctor_id == doc_id).scalar() or 0
    
    return jsonify({
        "patients_today": patients_today,
        "revenue": round(revenue, 2),
        "rating": round(avg_rating, 1)
    })

@hospital_bp.route('/lab/queue', methods=['GET'])
def get_lab_queue():
    # Staff sees tests that are Paid - Needs Sample
    tests = LabTest.query.filter_by(status='Paid - Needs Sample').all()
    result = []
    for t in tests:
        patient = User.query.get(t.patient_id)
        result.append({
            "id": t.id,
            "patient_name": patient.name if patient else "Unknown",
            "test_name": t.test_name,
            "status": t.status,
            "ordered_at": t.ordered_at
        })
    return jsonify(result)

@hospital_bp.route('/patient/<int:patient_id>/tests', methods=['GET'])
def get_patient_tests(patient_id):
    tests = LabTest.query.filter_by(patient_id=patient_id).order_by(LabTest.id.desc()).all()
    result = []
    for t in tests:
        result.append({
            "id": t.id,
            "test_name": t.test_name,
            "status": t.status,
            "result_text": t.result_text
        })
    return jsonify(result)

@hospital_bp.route('/pharmacy/queue', methods=['GET'])
def get_pharmacy_queue():
    from models import Prescription, User
    prescriptions = Prescription.query.filter_by(status='Pending Dispense').all()
    result = []
    for p in prescriptions:
        patient = User.query.get(p.patient_id)
        doctor = User.query.get(p.doctor_id)
        result.append({
            "id": p.id,
            "patient_name": patient.name if patient else "Unknown",
            "doctor_name": doctor.name if doctor else "Unknown",
            "medication": p.medication,
            "status": p.status,
            "created_at": str(p.created_at)
        })
    return jsonify(result)

@hospital_bp.route('/rating', methods=['POST'])
def submit_rating():
    data = request.json
    existing = Rating.query.filter_by(appointment_id=data['appointment_id']).first()
    if existing:
        return jsonify({"error": "Already rated this visit"}), 409
    rating = Rating(
        appointment_id=data['appointment_id'],
        patient_id=data['patient_id'],
        doctor_id=data['doctor_id'],
        stars=data['stars'],
        comment=data.get('comment', '')
    )
    db.session.add(rating)
    db.session.commit()
    return jsonify({"message": "Rating submitted"}), 201

@hospital_bp.route('/doctor/<int:doc_id>/availability', methods=['PUT'])
def toggle_availability(doc_id):
    user = User.query.get(doc_id)
    if not user or user.role != 'doctor':
        return jsonify({"error": "Doctor not found"}), 404
    user.is_available = not user.is_available
    db.session.commit()
    return jsonify({"is_available": user.is_available})

# ===== TIME SLOTS =====

AVAILABLE_SLOTS = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
]

@hospital_bp.route('/doctor/<int:doc_id>/slots', methods=['GET'])
def get_available_slots(doc_id):
    date = request.args.get('date')
    if not date:
        return jsonify({"error": "Date parameter required"}), 400
    booked = Appointment.query.filter_by(
        doctor_id=doc_id, date_str=date
    ).filter(Appointment.status.notin_(['Cancelled'])).all()
    booked_times = [a.time_str for a in booked]
    open_slots = [s for s in AVAILABLE_SLOTS if s not in booked_times]
    return jsonify({"date": date, "slots": open_slots, "booked": booked_times})

# ===== CLINICAL NOTES (DOCTOR ONLY) =====

@hospital_bp.route('/appointment/<int:appt_id>/notes', methods=['PUT'])
def save_clinical_notes(appt_id):
    appt = Appointment.query.get(appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    data = request.json
    appt.clinical_notes = data.get('notes', '')
    db.session.commit()
    return jsonify({"message": "Notes saved"})

@hospital_bp.route('/appointment/<int:appt_id>/notes', methods=['GET'])
def get_clinical_notes(appt_id):
    appt = Appointment.query.get(appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    return jsonify({"notes": appt.clinical_notes or ''})

# ===== RESCHEDULING =====

@hospital_bp.route('/appointment/<int:appt_id>/reschedule', methods=['PUT'])
def reschedule_appointment(appt_id):
    appt = Appointment.query.get(appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    if appt.status != 'Scheduled':
        return jsonify({"error": "Can only reschedule scheduled appointments"}), 400
    data = request.json
    new_date = data.get('date')
    new_time = data.get('time')
    if not new_date or not new_time:
        return jsonify({"error": "Date and time required"}), 400
    # Check if slot is available
    conflict = Appointment.query.filter_by(
        doctor_id=appt.doctor_id, date_str=new_date, time_str=new_time
    ).filter(Appointment.status.notin_(['Cancelled'])).first()
    if conflict:
        return jsonify({"error": "This slot is already booked"}), 409
    appt.date_str = new_date
    appt.time_str = new_time
    db.session.commit()
    return jsonify({"message": "Appointment rescheduled", "date": new_date, "time": new_time})

# ===== BILLING & INVOICING =====

@hospital_bp.route('/appointment/<int:appt_id>/invoice', methods=['POST'])
def generate_invoice(appt_id):
    appt = Appointment.query.get(appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    existing = Invoice.query.filter_by(appointment_id=appt_id).first()
    if existing:
        return jsonify({"error": "Invoice already exists", "invoice_id": existing.id}), 409
    doctor = User.query.get(appt.doctor_id)
    consult_fee = doctor.consultation_fee if doctor else 0
    lab_count = LabTest.query.filter_by(appointment_id=appt_id, status='Completed').count()
    lab_charges = lab_count * 50.0
    pharmacy_charges = 0  # could be extended later
    total = consult_fee + lab_charges + pharmacy_charges
    invoice = Invoice(
        appointment_id=appt_id,
        patient_id=appt.patient_id,
        consultation_fee=consult_fee,
        lab_charges=lab_charges,
        pharmacy_charges=pharmacy_charges,
        total=total
    )
    db.session.add(invoice)
    db.session.commit()
    return jsonify({
        "id": invoice.id,
        "consultation_fee": consult_fee,
        "lab_charges": lab_charges,
        "pharmacy_charges": pharmacy_charges,
        "total": total,
        "status": invoice.status
    }), 201

@hospital_bp.route('/patient/<int:patient_id>/invoices', methods=['GET'])
def get_patient_invoices(patient_id):
    invoices = Invoice.query.filter_by(patient_id=patient_id).all()
    result = []
    for inv in invoices:
        appt = Appointment.query.get(inv.appointment_id)
        doctor = User.query.get(appt.doctor_id) if appt else None
        
        # Dynamically recalculate lab charges from actual lab tests
        lab_tests = LabTest.query.filter_by(appointment_id=inv.appointment_id).all()
        # Count all tests ordered for this visit that are either Paid or Pending Payment
        active_lab_count = len([t for t in lab_tests if t.status != 'Cancelled'])
        lab_charges = active_lab_count * 50  # ₹50 per test
        
        # Update invoice if lab charges changed
        if lab_charges != inv.lab_charges:
            inv.lab_charges = lab_charges
            inv.total = inv.consultation_fee + lab_charges + inv.pharmacy_charges
            db.session.commit()
        
        result.append({
            "id": inv.id,
            "appointment_id": inv.appointment_id,
            "doctor_name": doctor.name if doctor else 'Unknown',
            "date": appt.date_str if appt else '',
            "consultation_fee": inv.consultation_fee,
            "lab_charges": inv.lab_charges,
            "pharmacy_charges": inv.pharmacy_charges,
            "total": inv.total,
            "status": inv.status,
            "created_at": str(inv.created_at)
        })
    return jsonify(result)

@hospital_bp.route('/invoice/<int:inv_id>/pay', methods=['PUT'])
def pay_invoice(inv_id):
    inv = Invoice.query.get(inv_id)
    if not inv:
        return jsonify({"error": "Invoice not found"}), 404
    inv.status = 'Paid'
    db.session.commit()
    return jsonify({"message": "Invoice paid"})

# ===== CLINICAL SUMMARIES =====

@hospital_bp.route('/appointment/<int:appt_id>/summary', methods=['GET'])
def get_appointment_summary(appt_id):
    appt = Appointment.query.get_or_404(appt_id)
    patient = User.query.get(appt.patient_id)
    doctor = User.query.get(appt.doctor_id)
    
    vitals = Vitals.query.filter_by(appointment_id=appt_id).first()
    labs = LabTest.query.filter_by(appointment_id=appt_id).all()
    presc = Prescription.query.filter_by(appointment_id=appt_id).first()
    
    return jsonify({
        "appointment": {
            "id": appt.id,
            "date": appt.date_str,
            "time": appt.time_str,
            "symptoms": appt.symptoms,
            "clinical_notes": appt.clinical_notes,
            "followup": appt.followup_days
        },
        "patient": {
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "blood_type": patient.blood_type
        },
        "doctor": {
            "name": doctor.name,
            "specialization": doctor.specialization
        },
        "vitals": {
            "bp": vitals.blood_pressure if vitals else "N/A",
            "hr": vitals.heart_rate if vitals else "N/A",
            "temp": vitals.temperature if vitals else "N/A",
            "weight": vitals.weight if vitals else "N/A"
        },
        "labs": [{"test_name": l.test_name, "result": l.result_text, "status": l.status} for l in labs],
        "prescription": presc.medication if presc else "No prescription issued"
    })

# ===== ADMIN SEARCH & FILTERS =====

@hospital_bp.route('/admin/search', methods=['GET'])
def admin_search():
    query = request.args.get('q', '').lower()
    role_filter = request.args.get('role')
    date_from = request.args.get('from')
    date_to = request.args.get('to')
    
    results = {"users": [], "appointments": []}
    
    # Search users
    users_q = User.query
    if role_filter:
        users_q = users_q.filter_by(role=role_filter)
    users = users_q.all()
    for u in users:
        if query and query not in (u.name or '').lower() and query not in (u.email or '').lower() and query not in (u.contact or '').lower():
            continue
        results["users"].append({
            "id": u.id, "name": u.name, "role": u.role,
            "email": u.email, "contact": u.contact,
            "is_active": u.is_active
        })
    
    # Search appointments
    appts_q = Appointment.query
    if date_from:
        appts_q = appts_q.filter(Appointment.date_str >= date_from)
    if date_to:
        appts_q = appts_q.filter(Appointment.date_str <= date_to)
    appts = appts_q.order_by(Appointment.date_str.desc()).limit(100).all()
    for a in appts:
        patient = User.query.get(a.patient_id)
        doctor = User.query.get(a.doctor_id)
        if query and query not in (patient.name if patient else '').lower() and query not in (doctor.name if doctor else '').lower():
            continue
        results["appointments"].append({
            "id": a.id,
            "patient_name": patient.name if patient else 'Unknown',
            "doctor_name": doctor.name if doctor else 'Unknown',
            "date": a.date_str, "time": a.time_str,
            "status": a.status
        })
    
    return jsonify(results)
