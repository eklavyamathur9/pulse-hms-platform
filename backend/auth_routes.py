from flask import Blueprint, request, jsonify
from models import db, User, Hospital
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required
from auth_utils import current_hospital_id, current_user, require_hospital_context, require_roles, user_claims
from validation import int_field, json_body, require_fields

auth_bp = Blueprint('auth', __name__)

def make_token(user):
    return create_access_token(identity=str(user.id), additional_claims=user_claims(user))

@auth_bp.route('/register-hospital', methods=['POST'])
def register_hospital():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, 'hospital_name', 'subdomain', 'admin_name', 'email', 'password')
    if error:
        return error, status
    hospital_name = data.get('hospital_name')
    subdomain = data.get('subdomain')
    admin_name = data.get('admin_name')
    email = data.get('email')
    password = data.get('password')

    existing_hospital = Hospital.query.filter_by(subdomain=subdomain).first()
    if existing_hospital:
        return jsonify({"error": "Subdomain already taken"}), 409

    new_hospital = Hospital(name=hospital_name, subdomain=subdomain, plan='trial')
    db.session.add(new_hospital)
    db.session.commit()

    admin_user = User(
        hospital_id=new_hospital.id,
        role='admin',
        name=admin_name,
        email=email,
        password=generate_password_hash(password)
    )
    db.session.add(admin_user)
    db.session.commit()

    return jsonify({"message": "Hospital registered successfully", "hospital_id": new_hospital.id}), 201

@auth_bp.route('/register', methods=['POST'])
def register():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, 'name', 'password', 'hospital_id')
    if error:
        return error, status
    hospital_id, error, status = int_field(data, 'hospital_id', minimum=1, required=True)
    if error:
        return error, status
    name = data.get('name')
    contact = data.get('contact')
    email = data.get('email')
    password = data.get('password')
    
    if not contact and not email:
        return jsonify({"error": "Contact number or email is required"}), 400
    
    # Check if user already exists
    filters = [User.hospital_id == hospital_id]
    user_filters = []
    if contact:
        user_filters.append(User.contact == contact)
    if email:
        user_filters.append(User.email == email)
        
    existing = User.query.filter(User.hospital_id == hospital_id, db.or_(*user_filters)).first() if user_filters else None
    
    if existing:
        return jsonify({"error": "An account with this contact/email already exists in this hospital"}), 409
    
    new_user = User(
        hospital_id=hospital_id,
        role='patient',
        name=name,
        contact=contact,
        email=email,
        password=generate_password_hash(password)
    )
    db.session.add(new_user)
    db.session.commit()
    
    token = make_token(new_user)
    
    return jsonify({
        "message": "Registration successful",
        "token": token,
        "user": {
            "id": new_user.id,
            "role": new_user.role,
            "hospital_id": new_user.hospital_id,
            "name": new_user.name,
            "email": new_user.email,
            "contact": new_user.contact
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, 'identifier', 'password')
    if error:
        return error, status
    email_or_contact = data.get('identifier')
    password = data.get('password')
    role_type = data.get('type') # 'patient' or 'staff'
    hospital_id = data.get('hospital_id') # Needed to distinguish tenants
    
    # If superadmin logging in, they might not pass hospital_id or pass 0.
    # For now, require hospital_id unless it's a superadmin email?
    if email_or_contact == 'superadmin@pulsehms.com':
        user = User.query.filter_by(email=email_or_contact, role='superadmin').first()
    else:
        if not hospital_id:
            return jsonify({"error": "Hospital ID required"}), 400
        hospital_id, error, status = int_field(data, 'hospital_id', minimum=1, required=True)
        if error:
            return error, status
        user = User.query.filter(
            User.hospital_id == hospital_id,
            db.or_(User.email == email_or_contact, User.contact == email_or_contact)
        ).first()
    
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    
    if not user.password or not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 401
        
    if user.role != 'superadmin':
        if role_type == 'patient' and user.role != 'patient':
            return jsonify({"error": "Invalid role type selected"}), 401
        if role_type == 'staff' and user.role == 'patient':
            return jsonify({"error": "Invalid role type selected"}), 401

    token = make_token(user)

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "role": user.role,
            "hospital_id": user.hospital_id,
            "name": user.name,
            "email": user.email,
            "contact": user.contact
        }
    })

@auth_bp.route('/doctors', methods=['GET'])
@jwt_required()
def get_doctors():
    from models import Rating
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    doctors = User.query.filter_by(
        hospital_id=hospital_id,
        role='doctor',
        is_active=True,
        is_available=True
    ).all()
    result = []
    for doc in doctors:
        avg = db.session.query(db.func.avg(Rating.stars)).filter(Rating.doctor_id == doc.id).scalar()
        count = Rating.query.filter_by(doctor_id=doc.id).count()
        result.append({
            "id": doc.id,
            "name": doc.name,
            "specialization": doc.specialization,
            "qualification": doc.qualification,
            "experience_years": doc.experience_years,
            "consultation_fee": doc.consultation_fee,
            "bio": doc.bio,
            "avg_rating": round(avg, 1) if avg else None,
            "rating_count": count
        })
    return jsonify(result)

@auth_bp.route('/doctors/all', methods=['GET'])
@jwt_required()
def get_all_doctors():
    """Returns ALL active doctors (including unavailable) - used for displaying info on existing appointments."""
    from models import Rating
    hospital_id, error, status = require_hospital_context()
    if error:
        return error, status
    doctors = User.query.filter_by(
        hospital_id=hospital_id,
        role='doctor',
        is_active=True
    ).all()
    result = []
    for doc in doctors:
        avg = db.session.query(db.func.avg(Rating.stars)).filter(Rating.doctor_id == doc.id).scalar()
        count = Rating.query.filter_by(doctor_id=doc.id).count()
        result.append({
            "id": doc.id,
            "name": doc.name,
            "specialization": doc.specialization,
            "qualification": doc.qualification,
            "experience_years": doc.experience_years,
            "consultation_fee": doc.consultation_fee,
            "bio": doc.bio,
            "is_available": doc.is_available,
            "avg_rating": round(avg, 1) if avg else None,
            "rating_count": count
        })
    return jsonify(result)

# ===== ADMIN USER MANAGEMENT =====

@auth_bp.route('/admin/users', methods=['GET'])
@require_roles('admin', 'doctor', 'superadmin')
def get_all_users():
    user = current_user()
    if user.role == 'superadmin':
        users = User.query.all()
    elif user.role == 'doctor':
        users = User.query.filter_by(id=user.id, hospital_id=user.hospital_id).all()
    else:
        users = User.query.filter_by(hospital_id=user.hospital_id).all()
    result = [{
        "id": u.id,
        "role": u.role,
        "name": u.name,
        "email": u.email,
        "contact": u.contact,
        "specialization": u.specialization,
        "is_available": u.is_available,
        "is_active": u.is_active
    } for u in users]
    return jsonify(result)

@auth_bp.route('/admin/users', methods=['POST'])
@require_roles('admin', 'superadmin')
def create_user():
    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, 'name')
    if error:
        return error, status
    hospital_id = current_hospital_id()
    if current_user().role == 'superadmin' and data.get('hospital_id'):
        hospital_id, error, status = int_field(data, 'hospital_id', minimum=1, required=True)
        if error:
            return error, status
    if hospital_id is None:
        return jsonify({"error": "hospital_id is required to create a user"}), 400
    existing = User.query.filter(
        User.hospital_id == hospital_id,
        db.or_(
            User.email == data.get('email') if data.get('email') else False,
            User.contact == data.get('contact') if data.get('contact') else False
        )
    ).first()
    if existing:
        return jsonify({"error": "User with this email/contact already exists"}), 409

    new_user = User(
        hospital_id=hospital_id,
        role=data.get('role', 'staff'),
        name=data['name'],
        email=data.get('email'),
        contact=data.get('contact'),
        password=generate_password_hash(data.get('password', 'changeme')),
        specialization=data.get('specialization')
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User created", "id": new_user.id}), 201

@auth_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@require_roles('admin', 'superadmin')
def update_user(user_id):
    data, error, status = json_body()
    if error:
        return error, status
    user = User.query.get(user_id) if current_user().role == 'superadmin' else User.query.filter_by(id=user_id, hospital_id=current_hospital_id()).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role == 'superadmin' and current_user().id != user.id:
        return jsonify({"error": "Superadmin accounts cannot be managed from tenant user screens"}), 403
    user.name = data.get('name', user.name)
    user.email = data.get('email', user.email)
    user.contact = data.get('contact', user.contact)
    user.specialization = data.get('specialization', user.specialization)
    user.role = data.get('role', user.role)
    user.is_available = data.get('is_available', user.is_available)
    user.is_active = data.get('is_active', user.is_active)
    db.session.commit()
    return jsonify({"message": "User updated"})

@auth_bp.route('/admin/users/<int:user_id>/deactivate', methods=['PUT'])
@require_roles('admin', 'superadmin')
def deactivate_user(user_id):
    user = User.query.get(user_id) if current_user().role == 'superadmin' else User.query.filter_by(id=user_id, hospital_id=current_hospital_id()).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role == 'superadmin':
        return jsonify({"error": "Superadmin accounts cannot be deactivated from tenant user screens"}), 403
    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({"message": f"User {'activated' if user.is_active else 'deactivated'}"})
