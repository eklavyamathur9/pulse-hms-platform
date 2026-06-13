import argparse
import os

from werkzeug.security import generate_password_hash

from app import app, db
from models import Hospital, User


DEMO_HOSPITAL = {
    "name": "Pulse Care General",
    "subdomain": "pulsecare",
    "plan": "pro",
}

DEMO_USERS = [
    {
        "role": "superadmin",
        "name": "Platform Superadmin",
        "email": "superadmin@pulsehms.com",
        "password": "superadmin",
    },
    {
        "role": "admin",
        "name": "Hospital Administrator",
        "email": "admin@pulse.com",
        "password": "admin",
    },
    {
        "role": "staff",
        "name": "Lab Technician",
        "email": "lab@pulse.com",
        "password": "tech",
    },
    {
        "role": "doctor",
        "name": "Dr. Sarah Wilson",
        "email": "sarah@pulse.com",
        "password": "password123",
        "specialization": "Internal Medicine",
        "qualification": "MBBS, MD (Internal Medicine)",
        "experience_years": 12,
        "consultation_fee": 500.0,
        "bio": "Specialist in diagnostic medicine with 12+ years of clinical experience. Expert in managing chronic conditions.",
    },
    {
        "role": "doctor",
        "name": "Dr. Jonathan Miller",
        "email": "jonathan@pulse.com",
        "password": "password123",
        "specialization": "Cardiology",
        "qualification": "MBBS, DM (Cardiology)",
        "experience_years": 8,
        "consultation_fee": 750.0,
        "bio": "Board-certified cardiologist specializing in interventional cardiology and heart failure management.",
    },
    {
        "role": "patient",
        "name": "John Doe",
        "contact": "+1 555-0100",
        "password": "patient_pass",
        "age": 34,
        "gender": "Male",
        "blood_type": "O+",
    },
]


def guard_reset():
    if app.config.get("ENV") == "production":
        raise RuntimeError("Refusing to reset a production database.")

    database_url = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    allow_reset = os.environ.get("PULSE_ALLOW_DB_RESET") == "true"
    if not database_url.startswith("sqlite:///") and not allow_reset:
        raise RuntimeError(
            "Refusing to reset a non-SQLite database unless PULSE_ALLOW_DB_RESET=true."
        )


def upsert_hospital():
    hospital = Hospital.query.filter_by(subdomain=DEMO_HOSPITAL["subdomain"]).first()
    if not hospital:
        hospital = Hospital(**DEMO_HOSPITAL)
        db.session.add(hospital)
        db.session.flush()
    else:
        hospital.name = DEMO_HOSPITAL["name"]
        hospital.plan = DEMO_HOSPITAL["plan"]
        hospital.is_active = True
    return hospital


def find_user(hospital_id, user_data):
    if user_data.get("email"):
        return User.query.filter_by(hospital_id=hospital_id, email=user_data["email"]).first()
    if user_data.get("contact"):
        return User.query.filter_by(hospital_id=hospital_id, contact=user_data["contact"]).first()
    return None


def upsert_user(hospital_id, user_data):
    user = find_user(hospital_id, user_data)
    if not user:
        user = User(hospital_id=hospital_id)
        db.session.add(user)

    for key, value in user_data.items():
        if key == "password":
            user.password = generate_password_hash(value)
        else:
            setattr(user, key, value)
    user.hospital_id = hospital_id
    user.is_active = True
    return user


def seed_db(reset=False):
    with app.app_context():
        if reset:
            guard_reset()
            db.drop_all()

        db.create_all()

        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        if not tables:
            print("No tables found. Run `flask db upgrade` first or set AUTO_CREATE_TABLES=true")
            return

        hospital = upsert_hospital()
        db.session.flush()

        for user_data in DEMO_USERS:
            upsert_user(hospital.id, user_data)

        db.session.commit()

        print("Database seeded successfully.")
        print(f"Hospital ID: {hospital.id}")
        print("Demo passwords are hashed in the database.")


def parse_args():
    parser = argparse.ArgumentParser(description="Seed Pulse HMS local demo data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop and recreate all tables before seeding. Guarded against production and non-SQLite databases.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    seed_db(reset=args.reset)
