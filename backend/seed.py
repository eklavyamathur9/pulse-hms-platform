from app import app, db
from models import User

def seed_db():
    with app.app_context():
        # drop all tables just in case and recreate them
        db.drop_all()
        db.create_all()

        # Seed Admin
        admin = User(
            role='admin',
            name='Hospital Administrator',
            email='admin@pulse.com',
            password='admin'
        )

        lab_tech = User(
            role='staff',
            name='Lab Technician',
            email='lab@pulse.com',
            password='tech'
        )

        # Seed Doctors with profile data
        doc1 = User(
            role='doctor',
            name='Dr. Sarah Wilson',
            email='sarah@pulse.com',
            password='password123',
            specialization='Internal Medicine',
            qualification='MBBS, MD (Internal Medicine)',
            experience_years=12,
            consultation_fee=500.0,
            bio='Specialist in diagnostic medicine with 12+ years of clinical experience. Expert in managing chronic conditions.'
        )

        doc2 = User(
            role='doctor',
            name='Dr. Jonathan Miller',
            email='jonathan@pulse.com',
            password='password123',
            specialization='Cardiology',
            qualification='MBBS, DM (Cardiology)',
            experience_years=8,
            consultation_fee=750.0,
            bio='Board-certified cardiologist specializing in interventional cardiology and heart failure management.'
        )

        # Seed Patient
        pat1 = User(
            role='patient',
            name='John Doe',
            contact='+1 555-0100',
            password='patient_pass',
            age=34,
            gender='Male',
            blood_type='O+'
        )

        db.session.add_all([admin, lab_tech, doc1, doc2, pat1])
        db.session.commit()
        print("Database seeded successfully with test users!")

if __name__ == '__main__':
    seed_db()
