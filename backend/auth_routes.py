from flask import Blueprint, request, jsonify
from models import db, User
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    contact = data.get('contact')
    email = data.get('email')
    password = data.get('password')
    
    if not name or not password:
        return jsonify({"error": "Name and password are required"}), 400
    
    if not contact and not email:
        return jsonify({"error": "Contact number or email is required"}), 400
    
    # Check if user already exists
    existing = User.query.filter(
        db.or_(
            User.contact == contact if contact else False,
            User.email == email if email else False
        )
    ).first()
    
    if existing:
        return jsonify({"error": "An account with this contact/email already exists"}), 409
    
    new_user = User(
        role='patient',
        name=name,
        contact=contact,
        email=email,
        password=generate_password_hash(password)
    )
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        "message": "Registration successful",
        "user": {
            "id": new_user.id,
            "role": new_user.role,
            "name": new_user.name,
            "email": new_user.email,
            "contact": new_user.contact,
            "age": new_user.age,
            "gender": new_user.gender,
            "blood_type": new_user.blood_type,
            "specialization": new_user.specialization
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email_or_contact = data.get('identifier')
    password = data.get('password')
    role_type = data.get('type') # 'patient' or 'staff'
    
    if not email_or_contact or not password:
        return jsonify({"error": "Missing credentials"}), 400
        
    # Find user based on email (for staff/doctors) or contact (for patients)
    user = User.query.filter(
        db.or_(User.email == email_or_contact, User.contact == email_or_contact)
    ).first()
    
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Support both hashed and plain-text passwords (for seeded users during dev)
    password_valid = False
    if user.password.startswith('pbkdf2:') or user.password.startswith('scrypt:'):
        password_valid = check_password_hash(user.password, password)
    else:
        password_valid = (user.password == password)
    
    if not password_valid:
        return jsonify({"error": "Invalid credentials"}), 401
        
    if role_type == 'patient' and user.role != 'patient':
        return jsonify({"error": "Invalid role type selected"}), 401
    if role_type == 'staff' and user.role == 'patient':
        return jsonify({"error": "Invalid role type selected"}), 401

    return jsonify({
        "message": "Login successful",
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
            "allergies": user.allergies,
            "specialization": user.specialization
        }
    })

@auth_bp.route('/doctors', methods=['GET'])
def get_doctors():
    from models import Rating
    doctors = User.query.filter_by(role='doctor', is_active=True, is_available=True).all()
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
def get_all_doctors():
    """Returns ALL active doctors (including unavailable) - used for displaying info on existing appointments."""
    from models import Rating
    doctors = User.query.filter_by(role='doctor', is_active=True).all()
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
def get_all_users():
    users = User.query.all()
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
def create_user():
    data = request.json
    existing = User.query.filter(
        db.or_(
            User.email == data.get('email') if data.get('email') else False,
            User.contact == data.get('contact') if data.get('contact') else False
        )
    ).first()
    if existing:
        return jsonify({"error": "User with this email/contact already exists"}), 409

    new_user = User(
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
def update_user(user_id):
    data = request.json
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
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
def deactivate_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({"message": f"User {'activated' if user.is_active else 'deactivated'}"})
