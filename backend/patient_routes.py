from flask import Blueprint, jsonify
from models import Appointment

patient_bp = Blueprint('patient', __name__)

@patient_bp.route('/<int:patient_id>/appointments', methods=['GET'])
def get_patient_appointments(patient_id):
    appts = Appointment.query.filter_by(patient_id=patient_id).order_by(Appointment.id.desc()).all()
    result = [
        {
            "id": a.id,
            "doctor_id": a.doctor_id,
            "date": a.date_str,
            "time": a.time_str,
            "status": a.status,
            "symptoms": a.symptoms,
            "pain_level": a.pain_level,
            "followup_days": a.followup_days
        } for a in appts
    ]
    return jsonify(result)

@patient_bp.route('/<int:patient_id>/prescriptions', methods=['GET'])
def get_patient_prescriptions(patient_id):
    from models import Prescription, User
    prescriptions = Prescription.query.filter_by(patient_id=patient_id).order_by(Prescription.id.desc()).all()
    result = []
    for p in prescriptions:
        doc = User.query.get(p.doctor_id)
        result.append({
            "id": p.id,
            "appointment_id": p.appointment_id,
            "medication_details": p.medication,
            "digital_signature": f"Dr. {doc.name}" if doc else "Signature Verify Failed",
            "issued_at": p.created_at
        })
    return jsonify(result)

@patient_bp.route('/<int:patient_id>/profile', methods=['PUT'])
def update_patient_profile(patient_id):
    from models import User, db
    from flask import request
    data = request.json
    user = User.query.get(patient_id)
    if not user or user.role != 'patient':
        return jsonify({"error": "Patient not found"}), 404
        
    user.name = data.get('name', user.name)
    user.contact = data.get('contact', user.contact)
    user.age = data.get('age', user.age)
    user.gender = data.get('gender', user.gender)
    user.blood_type = data.get('blood_type', user.blood_type)
    user.height = data.get('height', user.height)
    user.weight_baseline = data.get('weight_baseline', user.weight_baseline)
    user.allergies = data.get('allergies', user.allergies)
    
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "user": {
            "id": user.id,
            "role": user.role,
            "name": user.name,
            "email": user.email,
            "contact": user.contact,
            "age": user.age,
            "gender": user.gender,
            "blood_type": user.blood_type,
            "height": user.height,
            "weight_baseline": user.weight_baseline,
            "allergies": user.allergies
        }
    })
