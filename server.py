import os
import random
from datetime import datetime
from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit

app = Flask(__name__, static_folder='.', static_url_path='')
app.config['SECRET_KEY'] = 'pulse_secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# The Authorized Database State
db_state = {
    "hospitalCapacity": 20, 
    "occupiedSeats": [],
    "virtualQueue": [],
    "patients": [],
    "doctors": [],
    "staff": [
        {"id": "ADMIN1", "name": "Hospital Administrator", "role": "admin", "email": "admin@pulse.com", "password": "admin"},
        {"id": "LAB1", "name": "Lab Technician", "role": "lab", "email": "lab@pulse.com", "password": "tech"},
        {"id": "RAD1", "name": "Radiology Technician", "role": "radiology", "email": "rad@pulse.com", "password": "tech"}
    ],
    "appointments": [],
    "investigations": [],
    "clinicalNotes": [],
    "prescriptions": []
}

first_names = ["John", "Jane", "Emily", "Michael", "Sarah", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott"]
last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"]
blood_types = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
allergies_list = ['Penicillin', 'Peanuts', 'Latex', 'Aspirin', 'Sulfa Drugs', 'Iodine']
conditions_list = ['Hypertension', 'Asthma', 'Type 2 Diabetes', 'Hyperlipidemia', 'Arthritis', 'Anemia']
specializations = ['Internal Medicine', 'Pediatrics', 'Cardiology', 'Orthopedics', 'Dermatology', 'Neurology', 'Gastroenterology']

# Generate 12 Doctors
for i in range(1, 13):
    d_first = random.choice(first_names)
    d_last = random.choice(last_names)
    db_state["doctors"].append({
        "id": f"D{i}",
        "name": f"Dr. {d_first} {d_last}",
        "specialization": random.choice(specializations),
        "room": str(random.randint(101, 499)),
        "email": f"dr.{d_last.lower()}@pulse.com",
        "password": "password123"
    })

# Add one guaranteed doctor for testing
db_state["doctors"][0] = { "id": 'D1', "name": 'Dr. Sarah Wilson', "specialization": 'Internal Medicine', "room": '304', "email": 'sarah@pulse.com', "password": 'password123' }

# Generate 50 Patients
for i in range(1, 51):
    db_state["patients"].append({
        "id": f"P{i}",
        "name": f"{random.choice(first_names)} {random.choice(last_names)}",
        "age": random.randint(5, 85),
        "gender": random.choice(['Male', 'Female']),
        "contact": f"+1 555-{random.randint(1000, 9999)}",
        "bloodType": random.choice(blood_types),
        "allergies": random.sample(allergies_list, random.randint(0, 2)),
        "conditions": random.sample(conditions_list, random.randint(0, 2))
    })

# Force P1-P5 to be standard demo users
db_state["patients"][0].update({"id": 'P1', "name": 'John Doe'})
db_state["patients"][1].update({"id": 'P2', "name": 'Jane Smith'})
db_state["patients"][2].update({"id": 'P3', "name": 'Emily Davis'})
db_state["patients"][3].update({"id": 'P4', "name": 'Michael Brown'})
db_state["patients"][4].update({"id": 'P5', "name": 'Sarah Wilson'})

# Generate 35 Pre-existing Appointments (Chaotic Load)
for i in range(1, 36):
    appt_status = random.choice(['Virtual Queue', 'At Seat', 'At Seat', 'Confirmed'])
    patient = random.choice(db_state["patients"][5:]) # Don't use P1-P5
    doctor = random.choice(db_state["doctors"])
    seat = None
    nextStep = 'Arrive at Hospital'
    
    if appt_status == 'At Seat':
        if len(db_state['occupiedSeats']) < db_state['hospitalCapacity']:
            seat = f"Block B, Seat {random.randint(1,40)}"
            while seat in db_state['occupiedSeats']:
                seat = f"Block B, Seat {random.randint(1,40)}"
            db_state['occupiedSeats'].append(seat)
            nextStep = f'Proceed to {seat} for Consult'
        else:
            appt_status = 'Virtual Queue'
            
    if appt_status == 'Virtual Queue':
        db_state['virtualQueue'].append(f"A{i}")
        seat = 'Waiting Area'
        nextStep = f"Hospital Full. Queue pos: {len(db_state['virtualQueue'])}"

    db_state["appointments"].append({
        "id": f"A{i}",
        "patientId": patient["id"],
        "doctorId": doctor["id"],
        "date": '2026-04-16',
        "time": f"{random.randint(9, 16)}:00",
        "status": appt_status,
        "seat": seat,
        "nextStep": nextStep
    })

@socketio.on('action_login')
def handle_login(data):
    role_type = data.get('type')
    if role_type == 'patient':
        phone = data.get('phone')
        pt = next((p for p in db_state['patients'] if p['contact'] == phone), None)
        if pt:
            emit('login_success', {"role": "patient", "id": pt["id"], "name": pt["name"]}, to=request.sid)
        else:
            emit('login_error', {"message": "Phone number not found in patient registry. Try '+1 555-0100'."}, to=request.sid)
    elif role_type == 'staff':
        email = data.get('email')
        password = data.get('password')
        
        doc = next((d for d in db_state['doctors'] if d.get('email') == email and d.get('password') == password), None)
        if doc:
            emit('login_success', {"role": "doctor", "id": doc["id"], "name": doc["name"]}, to=request.sid)
            return
            
        staff = next((s for s in db_state.get('staff', []) if s['email'] == email and s['password'] == password), None)
        if staff:
            emit('login_success', {"role": staff["role"], "id": staff["id"], "name": staff["name"]}, to=request.sid)
            return
            
        emit('login_error', {"message": "Invalid staff credentials. Try sarah@pulse.com / password123"}, to=request.sid)

@socketio.on('action_update_capacity')
def handle_update_capacity(data):
    db_state['hospitalCapacity'] = int(data['capacity'])
    
    # Check if we can automatically process the Virtual Queue now that threshold is raised
    while len(db_state['occupiedSeats']) < db_state['hospitalCapacity'] and len(db_state['virtualQueue']) > 0:
        next_appt_id = db_state['virtualQueue'].pop(0)
        next_appt = next((a for a in db_state['appointments'] if a['id'] == next_appt_id), None)
        if next_appt:
            seat_num = random.randint(1, 40)
            assigned_seat = f"Block B, Seat {seat_num}"
            while assigned_seat in db_state['occupiedSeats']:
                seat_num = random.randint(1, 40)
                assigned_seat = f"Block B, Seat {seat_num}"
                
            db_state['occupiedSeats'].append(assigned_seat)
            next_appt['status'] = 'At Seat'
            next_appt['seat'] = assigned_seat
            next_appt['nextStep'] = f"Proceed to {assigned_seat} for Vitals Tech"

            new_inv_id = f"I{len(db_state['investigations']) + 100}"
            db_state['investigations'].append({
                "id": new_inv_id, "type": 'Vitals', "test": 'Pre-Consultation Vitals', 
                "patientId": next_appt['patientId'], "doctorId": next_appt['doctorId'], 
                "status": 'Pending', "seat": assigned_seat, "result": None
            })
            
    # Re-calculate queue positions
    for i, q_id in enumerate(db_state['virtualQueue']):
        qa_index = next((idx for idx, a in enumerate(db_state['appointments']) if a['id'] == q_id), None)
        if qa_index is not None:
            db_state['appointments'][qa_index]['nextStep'] = f"Hospital at Capacity. You are #{i + 1} in line for a seat."

    broadcast_state()

@socketio.on('action_force_discharge')
def handle_force_discharge(data):
    # Reuse the same logic built for standard discharge
    handle_discharge(data)

@socketio.on('action_create_doctor')
def handle_create_doc(data):
    new_doc = {
        "id": f"D{len(db_state['doctors']) + 100}",
        "name": data['name'],
        "specialization": data['specialization'],
        "room": data['room']
    }
    db_state['doctors'].append(new_doc)
    broadcast_state()

@socketio.on('action_create_patient')
def handle_create_pt(data):
    new_pt = {
        "id": f"P{len(db_state['patients']) + 100}",
        "name": data['name'],
        "age": data['age'],
        "gender": data['gender'],
        "contact": data['contact'],
        "bloodType": data['bloodType'],
        "allergies": [],
        "conditions": []
    }
    db_state['patients'].append(new_pt)
    broadcast_state()

def broadcast_state():
    socketio.emit('state_sync', db_state)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@socketio.on('connect')
def handle_connect():
    emit('state_sync', db_state)

@socketio.on('action_book_appointment')
def handle_book_appointment(data):
    new_id = f"A{len(db_state['appointments']) + 10}"
    new_appt = {
        "id": new_id,
        "patientId": data['patientId'],
        "doctorId": data['doctorId'],
        "date": data['date'],
        "time": data['time'],
        "status": 'Confirmed',
        "seat": None,
        "nextStep": 'Arrive at Hospital & Check-in'
    }
    db_state['appointments'].append(new_appt)
    broadcast_state()

@socketio.on('action_check_in')
def handle_check_in(data):
    appt_id = data['appointmentId']
    appt_index = next((i for i, a in enumerate(db_state['appointments']) if a['id'] == appt_id), None)
    if appt_index is None: return

    appt = db_state['appointments'][appt_index]

    if len(db_state['occupiedSeats']) < db_state['hospitalCapacity']:
        seat_num = random.randint(1, 20)
        new_seat = f"Block B, Seat {seat_num}"
        db_state['occupiedSeats'].append(new_seat)
        appt['status'] = 'At Seat'
        appt['seat'] = new_seat
        appt['nextStep'] = f"Proceed to {new_seat} for Vitals Tech"

        # Dispatch Vitals Tech
        new_inv_id = f"I{len(db_state['investigations']) + 1}"
        db_state['investigations'].append({
            "id": new_inv_id, "type": 'Vitals', "test": 'Pre-Consultation Vitals', 
            "patientId": appt['patientId'], "doctorId": appt['doctorId'], 
            "status": 'Pending', "seat": new_seat, "result": None
        })
    else:
        db_state['virtualQueue'].append(appt['id'])
        appt['status'] = 'Virtual Queue'
        appt['seat'] = 'Waiting Area / Car'
        appt['nextStep'] = f"Hospital at Capacity. You are #{len(db_state['virtualQueue'])} in line for a seat."

    broadcast_state()

@socketio.on('action_discharge')
def handle_discharge(data):
    appt_id = data['appointmentId']
    appt_index = next((i for i, a in enumerate(db_state['appointments']) if a['id'] == appt_id), None)
    if appt_index is None: return

    appt = db_state['appointments'][appt_index]

    if appt['seat'] and appt['seat'] != 'Waiting Area / Car':
        db_state['occupiedSeats'] = [s for s in db_state['occupiedSeats'] if s != appt['seat']]

    appt['status'] = 'Discharged'
    appt['seat'] = 'Left Hospital'
    appt['nextStep'] = 'Visit Complete'

    # Pull next from Virtual Queue
    if len(db_state['occupiedSeats']) < db_state['hospitalCapacity'] and len(db_state['virtualQueue']) > 0:
        next_appt_id = db_state['virtualQueue'].pop(0)
        next_appt = next((a for a in db_state['appointments'] if a['id'] == next_appt_id), None)
        if next_appt:
            seat_num = random.randint(1, 20)
            assigned_seat = f"Block B, Seat {seat_num}"
            db_state['occupiedSeats'].append(assigned_seat)
            next_appt['status'] = 'At Seat'
            next_appt['seat'] = assigned_seat
            next_appt['nextStep'] = f"Proceed to {assigned_seat} for Vitals Tech"

            # Dispatch Vitals Tech
            new_inv_id = f"I{len(db_state['investigations']) + 100}"
            db_state['investigations'].append({
                "id": new_inv_id, "type": 'Vitals', "test": 'Pre-Consultation Vitals', 
                "patientId": next_appt['patientId'], "doctorId": next_appt['doctorId'], 
                "status": 'Pending', "seat": assigned_seat, "result": None
            })

    # Update Queue Positions
    for i, q_id in enumerate(db_state['virtualQueue']):
        qa_index = next((idx for idx, a in enumerate(db_state['appointments']) if a['id'] == q_id), None)
        if qa_index is not None:
            db_state['appointments'][qa_index]['nextStep'] = f"Hospital at Capacity. You are #{i + 1} in line for a seat."

    broadcast_state()

@socketio.on('action_add_investigation')
def handle_add_inv(data):
    new_inv_id = f"I{len(db_state['investigations']) + 1}"
    db_state['investigations'].append({
        "id": new_inv_id, "type": data['type'], "test": data['test'], 
        "patientId": data['patientId'], "doctorId": data['doctorId'], 
        "status": 'Pending', "seat": data['seat'], "result": None
    })
    broadcast_state()

@socketio.on('action_update_investigation')
def handle_update_inv(data):
    inv_id = data['id']
    inv = next((i for i in db_state['investigations'] if i['id'] == inv_id), None)
    if inv:
        inv['status'] = data['status']
        if 'result' in data:
            inv['result'] = data['result']
        broadcast_state()

@socketio.on('action_save_consultation')
def handle_save_consult(data):
    patientId = data.get('patientId')
    doctorId = data.get('doctorId')
    notesText = data.get('notesText')
    rxList = data.get('rxList', [])
    today = datetime.now().strftime('%Y-%m-%d')

    if notesText and notesText.strip():
        db_state['clinicalNotes'].append({
            "id": f"N{len(db_state['clinicalNotes']) + 1}",
            "patientId": patientId,
            "doctorId": doctorId,
            "date": today,
            "text": notesText
        })

    for i, rx in enumerate(rxList):
        db_state['prescriptions'].append({
            "id": f"Rx{len(db_state['prescriptions']) + i + 100}",
            "patientId": patientId,
            "doctorId": doctorId,
            "date": today,
            "drug": rx['drug'],
            "dosage": rx['dosage'],
            "frequency": rx['frequency'],
            "duration": rx['duration'],
            "active": True
        })

    broadcast_state()

if __name__ == '__main__':
    print("starting Pulse HMS Backend Server on ws://localhost:8000")
    socketio.run(app, host='0.0.0.0', port=8000, allow_unsafe_werkzeug=True)
