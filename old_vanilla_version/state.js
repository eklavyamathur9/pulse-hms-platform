// state.js
// Centralized state management for Pulse HMS - Now backed by Socket.IO

class StateManager {
  constructor() {
    // Load session from LocalStorage
    const savedRole = localStorage.getItem('pulse_role');
    const savedId = localStorage.getItem('pulse_userId');
    const savedName = localStorage.getItem('pulse_userName');

    // Local Auth State + Data Cache
    this.state = {
      currentUserRole: savedRole || null, 
      currentUserId: savedId || null,
      currentUserName: savedName || null,
      
      // Default empty arrays before server sync
      hospitalCapacity: 2, 
      occupiedSeats: [],
      virtualQueue: [],
      patients: [],
      doctors: [],
      appointments: [],
      investigations: [],
      clinicalNotes: [],
      prescriptions: []
    };
    
    this.listeners = [];
    this.socket = io(); // Connect to Python Backend
    
    this.socket.on('state_sync', (serverState) => {
       this.updateState(serverState);
    });

    this.socket.on('login_success', (data) => {
       this.updateState({ currentUserRole: data.role, currentUserId: data.id, currentUserName: data.name });
    });

    this.socket.on('login_error', (data) => {
       alert("Login Failed: " + data.message);
    });
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  getState() {
    return this.state;
  }

  updateState(partialState) {
    this.state = { ...this.state, ...partialState };
    
    // Auth Persistance
    if (partialState.currentUserRole !== undefined) {
      if (partialState.currentUserRole === null) {
        localStorage.removeItem('pulse_role');
        localStorage.removeItem('pulse_userId');
        localStorage.removeItem('pulse_userName');
      } else {
        localStorage.setItem('pulse_role', this.state.currentUserRole);
        localStorage.setItem('pulse_userId', this.state.currentUserId);
        localStorage.setItem('pulse_userName', this.state.currentUserName);
      }
    }

    this.notify();
  }

  // ---- Advanced Hospital Workflows (Now via WebSockets) ----

  bookAppointment(patientId, doctorId, date, time) {
    this.socket.emit('action_book_appointment', { patientId, doctorId, date, time });
  }

  checkInAppointment(appointmentId) {
    this.socket.emit('action_check_in', { appointmentId });
  }

  dischargeAppointment(appointmentId) {
    this.socket.emit('action_discharge', { appointmentId });
  }

  addInvestigation(type, test, patientId, doctorId, seat) {
    this.socket.emit('action_add_investigation', { type, test, patientId, doctorId, seat });
  }

  updateInvestigationStatus(id, status, result = null) {
    this.socket.emit('action_update_investigation', { id, status, result });
  }

  saveConsultation(patientId, doctorId, notesText, rxList, appointmentId) {
    this.socket.emit('action_save_consultation', { patientId, doctorId, notesText, rxList, appointmentId });
  }

  // ---- Administrator Tools ----
  updateHospitalCapacity(newCapacity) {
    this.socket.emit('action_update_capacity', { capacity: newCapacity });
  }

  forceDischarge(appointmentId) {
    this.socket.emit('action_force_discharge', { appointmentId });
  }

  createDoctor(name, specialization, room) {
    this.socket.emit('action_create_doctor', { name, specialization, room });
  }

  createPatient(name, age, gender, contact, bloodType) {
    this.socket.emit('action_create_patient', { name, age, gender, contact, bloodType });
  }

  // ---- Authentication ----
  loginPatient(phone) {
    this.socket.emit('action_login', { type: 'patient', phone });
  }

  loginStaff(email, password) {
    this.socket.emit('action_login', { type: 'staff', email, password });
  }
}

export const appState = new StateManager();
