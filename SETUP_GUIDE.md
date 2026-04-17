# Pulse HMS — Complete Setup & Testing Guide

> **For:** New team members setting up the project locally  
> **Last Updated:** April 2026  
> **Repo:** https://github.com/eklavyamathur9/pulse-hms-platform

---

## Prerequisites

Make sure you have these installed on your machine:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18 or higher | https://nodejs.org |
| **Python** | 3.10 or higher | https://python.org |
| **Git** | Any recent version | https://git-scm.com |
| **VS Code** (recommended) | Latest | https://code.visualstudio.com |

To verify installations, run:
```bash
node --version
python --version
git --version
```

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/eklavyamathur9/pulse-hms-platform.git
cd pulse-hms-platform
```

---

## Step 2: Set Up the Backend (Flask API)

### 2.1 Create a Python virtual environment
```bash
cd backend
python -m venv venv
```

### 2.2 Activate the virtual environment

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

> You should see `(venv)` appear in your terminal prompt.

### 2.3 Install Python dependencies
```bash
pip install flask flask-socketio flask-cors flask-sqlalchemy werkzeug eventlet
```

### 2.4 Seed the database with test data
```bash
python seed.py
```

You should see: `Database seeded successfully with test users!`

### 2.5 Start the backend server
```bash
python app.py
```

You should see:
```
Starting Pulse HMS Backend with SQLite on ws://localhost:5000
 * Serving Flask app 'app'
 * Running on http://127.0.0.1:5000
```

> ⚠️ **Keep this terminal running.** Open a NEW terminal for the next step.

---

## Step 3: Set Up the Frontend (React + Vite)

### 3.1 Open a new terminal and navigate to the frontend folder
```bash
cd frontend
```
(or from the project root: `cd pulse-hms-platform/frontend`)

### 3.2 Install Node dependencies
```bash
npm install
```

### 3.3 Start the development server
```bash
npm run dev
```

You should see:
```
VITE ready in ~3s
➜ Local: http://localhost:5173/
```

### 3.4 Open the app in your browser
Go to **http://localhost:5173**

---

## Step 4: Test the Complete Workflow

### Test Accounts (Pre-seeded)

| Role | Login Type | Identifier | Password |
|------|-----------|------------|----------|
| **Patient** | Patient tab → Mobile Number | `+1 555-0100` | `patient_pass` |
| **Admin** | Staff & Doctor tab → Email | `admin@pulse.com` | `admin` |
| **Doctor 1** | Staff & Doctor tab → Email | `sarah@pulse.com` | `password123` |
| **Doctor 2** | Staff & Doctor tab → Email | `jonathan@pulse.com` | `password123` |
| **Lab Staff** | Staff & Doctor tab → Email | `lab@pulse.com` | `tech` |

> 💡 **Tip:** Use multiple browser windows (or regular + incognito) to test different roles simultaneously. This is how the real-time Socket.IO features are best tested.

---

### Full End-to-End Test Workflow

Follow this exact sequence to test the complete patient journey:

#### 🔹 Test A: Patient Registration & Login

1. Open the app → you see the Login page
2. Click **"Sign Up"** at the bottom
3. Fill in:
   - Name: `Test Patient`
   - Mobile: `+91 98765 43210`
   - Password: `test1234` / Confirm: `test1234`
4. Click **Create Patient Account** → you should see success message
5. Switch to login, enter the mobile number and password → login should work
6. You land on the **Patient Dashboard**

#### 🔹 Test B: Booking an Appointment (as Patient)

1. Log in as patient (`+1 555-0100` / `patient_pass`)
2. Click **"Browse Doctors & Book"**
3. You should see Dr. Sarah Wilson and Dr. Jonathan Miller with their profiles
4. Click **"Book Now"** on any doctor
5. Select a future date → time slots should load
6. Select a time slot
7. Fill in symptoms (e.g., "Headache and fever for 2 days")
8. Adjust the pain level slider
9. Click **"Confirm Booking"**
10. ✅ You should see the appointment appear on the dashboard with the stepper UI

#### 🔹 Test C: Patient Arrival

1. On the patient dashboard, you should see the active appointment
2. Click **"I have arrived at the Hospital"**
3. ✅ The stepper should advance to "Arrived"

#### 🔹 Test D: Staff Takes Vitals

1. Open a **new browser window** (or incognito)
2. Log in as staff: `lab@pulse.com` / `tech`
3. You land on the **Staff Dashboard → Vitals Pipeline** tab
4. You should see the patient in the queue with status "Arrived"
5. Click **"Take Vitals"**
6. Fill in: Weight: `70`, Heart Rate: `75`, BP: `120/80`, Temp: `98.6`
7. Click **"Submit Vitals"**
8. ✅ Status changes to "Vitals_Taken"
9. ✅ Go back to the patient window — the stepper should auto-update to "Vitals Taken"

#### 🔹 Test E: Doctor Consultation

1. Open another browser window
2. Log in as doctor: `sarah@pulse.com` / `password123`
3. You land on the **Doctor Dashboard**
4. You should see the patient in "My Queue" with status "Ready"
5. Click on the patient card to open their details
6. ✅ Verify: You can see the patient's vitals, symptoms, pain level, allergies, and demographics
7. Write some clinical notes → click away (auto-saves on blur)

#### 🔹 Test F: Doctor Orders a Lab Test

1. In the doctor's consultation view, under **"Order Laboratory Test"**
2. Type a test name: `Complete Blood Count (CBC)`
3. Click **"Send to Lab Pipeline"**
4. ✅ The appointment moves to lab pending state

#### 🔹 Test G: Patient Pays for Lab Test

1. Go back to the **patient's browser window**
2. Under "Active Laboratory Needs", you should see the CBC test with status "Pending Payment"
3. Click **"Pay ₹50 Now"**
4. ✅ Status changes to "Paid - Needs Sample"

#### 🔹 Test H: Staff Uploads Lab Results

1. Go to the **staff browser window**
2. Click the **"Laboratory Pipeline"** tab
3. You should see the CBC test in the queue
4. Click **"Upload Findings"**
5. Enter results: `WBC: 7,500/μL, RBC: 4.8M/μL, Hemoglobin: 14.2 g/dL — All values within normal range`
6. Click **"Upload Report"**
7. ✅ Test completes and appointment goes back to doctor for review

#### 🔹 Test I: Doctor Issues Prescription & Closes Visit

1. Go to the **doctor's browser window**
2. The patient should reappear in queue with status "Lab Review Ready"
3. Click the patient → you can now see the lab results
4. Under **"Finalize Consultation"**, type a prescription:
   ```
   Rx: Paracetamol 500mg — 1 tab twice daily for 5 days
   Rx: Azithromycin 500mg — 1 tab once daily for 3 days
   ```
5. Select a follow-up period (e.g., "1 week")
6. Click **"Sign & Issue Prescription"**
7. ✅ Visit is marked as Completed

#### 🔹 Test J: Staff Dispenses Medicine

1. Go to the **staff browser window**
2. Click the **"Pharmacy Desk"** tab
3. You should see the prescription with medication details
4. Click **"Mark Dispensed"**
5. ✅ Prescription dispensed successfully

#### 🔹 Test K: Patient Reviews History & Downloads

1. Go to the **patient's browser window**
2. Click the **"Medical History"** tab
3. ✅ You should see:
   - Follow-up recommendation banner
   - Rating prompt (rate the doctor 1-5 stars)
   - E-Prescription card with "Download PDF" button
   - Completed lab report
4. Click **"Download PDF"** on the prescription → a PDF should download
5. Rate the doctor (e.g., 4 stars) → submit
6. Click **"Active Portal"** tab → under "Visit Summaries", click **"Download Summary"** → discharge summary PDF downloads

#### 🔹 Test L: Patient Billing

1. Click the **"Billing"** tab
2. ✅ You should see the invoice with consultation fee + lab charges
3. Click **"Pay Now"** to mark invoice as paid
4. Click **"Download PDF"** → invoice PDF downloads

#### 🔹 Test M: Admin Dashboard

1. Open a new window, log in as admin: `admin@pulse.com` / `admin`
2. **Analytics tab:** ✅ Check that pie chart (status mix) and bar chart (throughput) show data
3. **User Management tab:** ✅ See all users, try deactivating one, then reactivating
4. **Search & Filters tab:** ✅ Search for a patient name, filter by role

#### 🔹 Test N: Reschedule & Cancel

1. Log in as patient, book a NEW appointment
2. On the active portal, click **"Reschedule"** → pick a new date/time → confirm
3. ✅ Appointment date/time should update
4. Book another appointment, then click **"Cancel"**
5. ✅ Appointment should disappear from active list

#### 🔹 Test O: Dark Mode

1. On any dashboard, click the **🌙 Moon icon** in the sidebar
2. ✅ The entire UI should switch to dark mode
3. Click the **☀️ Sun icon** to switch back
4. ✅ Theme preference should persist across page refreshes

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm run dev` fails | Make sure you ran `npm install` first |
| Backend won't start | Make sure venv is activated: `.\venv\Scripts\Activate.ps1` |
| "Cannot connect to server" in browser | Make sure backend is running on port 5000 |
| Login fails with seeded accounts | Run `python seed.py` again to reset the database |
| Real-time updates not working | Check both backend (port 5000) and frontend (port 5173) are running |
| Port 5000 already in use | Kill the process: `netstat -ano | findstr :5000` then `taskkill /PID <pid> /F` |
| Python not found | Use `python3` instead of `python` on Mac/Linux |
| PowerShell script execution error | Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |

---

## Project Structure Quick Reference

```
pulse-hms-platform/
├── backend/                  # Flask API Server
│   ├── app.py               # Main entry point + Socket.IO handlers
│   ├── models.py            # SQLAlchemy data models
│   ├── auth_routes.py       # Login, register, doctor listing, admin user mgmt
│   ├── hospital_routes.py   # Queue, labs, pharmacy, billing, analytics
│   ├── patient_routes.py    # Patient appointments, prescriptions, profile
│   └── seed.py              # Database seeder with test data
│
├── frontend/                 # React + Vite App
│   └── src/
│       ├── App.jsx           # Router & theme config
│       ├── components/
│       │   ├── Login.jsx           # Login & registration
│       │   ├── Layout.jsx          # Sidebar & navigation shell
│       │   ├── PatientDashboard.jsx # Full patient portal
│       │   ├── DoctorDashboard.jsx  # Doctor consultation hub
│       │   ├── StaffDashboard.jsx   # Vitals, lab, pharmacy pipelines
│       │   └── AdminDashboard.jsx   # Analytics & user management
│       └── context/
│           ├── AuthContext.jsx       # User session state
│           ├── SocketContext.jsx     # Real-time Socket.IO connection
│           └── NotificationContext.jsx # Toast notification system
│
└── old_vanilla_version/      # Previous vanilla JS version (archived)
```
