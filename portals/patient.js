import { appState } from '../state.js';

window.patientActions = {
  openBooking: () => {
    appState.updateState({ viewBooking: true });
  },
  cancelBooking: () => {
    appState.updateState({ viewBooking: false });
  },
  bookAppointment: (doctorId) => {
    const pId = appState.getState().currentUserId;
    // Mock static date/time for simple flow
    appState.bookAppointment(pId, doctorId, '2026-04-16', '03:00 PM');
    appState.updateState({ viewBooking: false });
    alert('Appointment Confirmed!');
  },
  checkIn: (appointmentId) => {
    appState.checkInAppointment(appointmentId);
  }
};

export function renderPatientPortal(state) {
  const patient = state.patients.find(p => p.id === state.currentUserId);
  const activeAppointments = state.appointments.filter(a => a.patientId === state.currentUserId && a.status !== 'Discharged');
  
  if (state.viewBooking) {
    return renderBookingEngine(state);
  }

  if (activeAppointments.length === 0) {
    return `
      <div class="animate-fade-in" style="max-width: 800px; margin: 0 auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--spacing-xl);">
           <h1>Welcome, ${patient.name.split(' ')[0]}</h1>
        </div>
        
        <div class="card" style="text-align: center; padding: 4rem 2rem;">
          <i class="ph-duotone ph-calendar-plus" style="font-size: 5rem; color: var(--primary); margin-bottom: var(--spacing-md);"></i>
          <h2 style="font-size: 1.8rem;">You have no active visits</h2>
          <p style="margin-bottom: var(--spacing-xl); font-size: 1.1rem;">Ready to see a doctor? Book an appointment to get your allocated time slot.</p>
          <button class="btn btn-primary" style="font-size: 1.1rem; padding: 1rem 2rem;" onclick="window.patientActions.openBooking()">Browse Doctors & Book</button>
        </div>
      </div>
      ${renderPatientRecords(state, state.currentUserId)}
    `;
  }

  // We have an active appointment! Render the Digital Ticket.
  const myAppointment = activeAppointments[0];
  const doctor = state.doctors.find(d => d.id === myAppointment.doctorId);
  const myInvestigations = state.investigations.filter(i => i.patientId === state.currentUserId && (i.status === 'Pending' || i.status === 'In Progress'));

  // Calculate timeline progress
  let progressPercent = 10;
  if (myAppointment.status === 'Virtual Queue') progressPercent = 30;
  if (myAppointment.status === 'At Seat') progressPercent = 60;
  if (myAppointment.status === 'In Progress') progressPercent = 80;

  return `
    <div class="animate-fade-in" style="max-width: 600px; margin: 0 auto;">
      <h1 style="margin-bottom: var(--spacing-lg);">Your Digital Companion</h1>
      
      <!-- The Digital Ticket -->
      <div class="card glass-panel" style="padding: 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        <!-- Top Boarding Pass Header -->
        <div style="background: var(--primary); color: white; padding: var(--spacing-lg); display:flex; justify-content:space-between; align-items:center;">
           <div>
              <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 0.8rem; opacity: 0.9;">Visit ID</p>
              <h2 style="font-family: monospace; font-size: 1.5rem; letter-spacing: 1px;">${myAppointment.id}</h2>
           </div>
           <i class="ph ph-qr-code" style="font-size: 3.5rem; opacity: 0.9;"></i>
        </div>

        <div style="padding: var(--spacing-xl);">
           <!-- Current Action Prominent Display -->
           <div style="text-align: center; margin-bottom: var(--spacing-xl);">
              <p style="color: var(--primary); font-weight: 700; text-transform: uppercase; font-size: 0.85rem; margin-bottom: var(--spacing-sm);">Current Status</p>
              <h2 style="font-size: 1.8rem; color: var(--text-dark); margin-bottom: 0;">${myAppointment.nextStep}</h2>
              
              ${myAppointment.status === 'Virtual Queue' ? `
                 <div style="margin-top: 1rem; padding: 1rem; background: var(--warning-bg); border-radius: var(--radius-md); border: 1px solid var(--warning);">
                    <i class="ph-fill ph-clock-countdown" style="font-size: 2rem; color: var(--warning); margin-bottom: 0.5rem;"></i>
                    <p style="color: var(--warning); font-weight: bold;">Please wait. You will be assigned a seat automatically.</p>
                 </div>
              ` : ''}

              ${myAppointment.status === 'Confirmed' ? `
                 <button class="btn btn-primary" style="margin-top: 1.5rem; width:100%; font-size: 1.1rem; padding: 1rem;" onclick="window.patientActions.checkIn('${myAppointment.id}')">
                   <i class="ph ph-map-pin"></i> I have arrived at the Hospital
                 </button>
              ` : ''}
              
              ${myAppointment.seat && myAppointment.status !== 'Virtual Queue' ? `
                 <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem; margin-top: 1.5rem;">Your Assigned Location</p>
                 <div class="seat-allocation" style="font-size: 2.5rem; padding: 0.5rem 2rem;">${myAppointment.seat}</div>
              ` : ''}
           </div>

           <!-- Timeline Progress Bar -->
           <div style="margin-bottom: var(--spacing-lg);">
              <div style="height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;">
                 <div style="height: 100%; background: var(--success); width: ${progressPercent}%; transition: width 0.5s ease;"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size: 0.75rem; color: var(--text-muted); font-weight:500;">
                 <span>Confirmed</span>
                 <span>Checked-In</span>
                 <span>Vitals/Seat</span>
                 <span>Consult</span>
              </div>
           </div>

           <hr style="border:0; height:1px; background:#E2E8F0; margin: var(--spacing-lg) 0;">

           <!-- Appointment Details -->
           <div style="display:flex; align-items:center; gap: var(--spacing-md);">
              <div style="width: 50px; height: 50px; border-radius: var(--radius-full); background: var(--bg-main); color: var(--primary); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem;">
                 ${doctor.name.split(' ')[1][0]}
              </div>
              <div>
                 <div style="font-weight: 600; font-size: 1.1rem;">${doctor.name}</div>
                 <div style="color: var(--text-muted);">${doctor.specialization}</div>
              </div>
              <div style="margin-left:auto; text-align:right;">
                 <div style="font-weight: 600;">${myAppointment.time}</div>
                 <div style="font-size:0.8rem; color:var(--text-muted);">Today</div>
              </div>
           </div>
        </div>
      </div>

      <!-- Live Vitals/Lab Orders tracked at seat -->
      ${myInvestigations.length > 0 ? `
         <div class="card animate-fade-in" style="margin-top: var(--spacing-lg); border-left: 4px solid var(--warning);">
            <div style="display:flex; align-items:center; gap: 8px; margin-bottom: var(--spacing-sm);">
               <i class="ph-fill ph-bell-ringing" style="color: var(--warning); font-size: 1.2rem;"></i>
               <h3 style="margin: 0; font-size: 1.1rem;">Technician Dispatched</h3>
            </div>
            <p style="color: var(--text-muted); margin-bottom: 1rem;">Please remain at your seat. A technician is on their way to perform:</p>
            
            ${myInvestigations.map(inv => `
               <div style="background: var(--warning-bg); padding: 0.75rem; border-radius: var(--radius-sm); font-weight: 500; color: var(--warning); display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                  <span>${inv.test}</span>
                  <span class="badge" style="background:white; color:var(--warning);">${inv.status}</span>
               </div>
            `).join('')}
         </div>
      ` : ''}

      ${renderPatientRecords(state, state.currentUserId)}
    </div>
  `;
}

function renderPatientRecords(state, patientId) {
  const pastNotes = state.clinicalNotes.filter(n => n.patientId === patientId);
  const pastRx = state.prescriptions.filter(rx => rx.patientId === patientId);

  if (pastNotes.length === 0 && pastRx.length === 0) return '';

  return `
    <div class="card animate-fade-in" style="margin-top: var(--spacing-xl);">
       <h2 style="margin-bottom: var(--spacing-sm);"><i class="ph-fill ph-files"></i> My Medical Records</h2>
       <p style="color: var(--text-muted); margin-bottom: var(--spacing-lg);">Your past consultation notes and active prescriptions.</p>
       
       ${pastRx.length > 0 ? `
         <h3 style="font-size: 1.1rem; border-bottom: 2px solid #E2E8F0; padding-bottom: 0.5rem; margin-bottom: 1rem;">Prescriptions</h3>
         <div style="display:flex; flex-direction:column; gap: 0.5rem; margin-bottom: var(--spacing-lg);">
            ${pastRx.reverse().map(rx => `
               <div style="background: var(--bg-surface); padding: 1rem; border-radius: 8px; border: 1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                     <strong style="display:block; font-size: 1.1rem; color: var(--text-dark);">${rx.drug} ${rx.dosage}</strong>
                     <span style="color: var(--text-muted); font-size: 0.9rem;">${rx.frequency} for ${rx.duration}</span>
                  </div>
                  <div>
                     <span class="badge ${rx.active ? 'success' : 'warning'}">${rx.active ? 'Active' : 'Inactive'}</span>
                  </div>
               </div>
            `).join('')}
         </div>
       ` : ''}

       ${pastNotes.length > 0 ? `
         <h3 style="font-size: 1.1rem; border-bottom: 2px solid #E2E8F0; padding-bottom: 0.5rem; margin-bottom: 1rem;">Clinical Notes</h3>
         <div style="display:flex; flex-direction:column; gap: 1rem;">
            ${pastNotes.reverse().map(note => `
               <div style="border-left: 2px solid var(--primary); padding-left: 1rem;">
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                     ${note.date} &bull; Dr. ${state.doctors.find(d=>d.id===note.doctorId)?.name || 'Unknown'}
                  </div>
                  <p style="margin: 0; line-height: 1.6;">${note.text}</p>
               </div>
            `).join('')}
         </div>
       ` : ''}
    </div>
  `;
}

function renderBookingEngine(state) {
  const doctors = state.doctors;
  
  return `
    <div class="animate-fade-in" style="max-width: 800px; margin: 0 auto;">
      <button class="btn btn-secondary" style="margin-bottom: var(--spacing-xl);" onclick="window.patientActions.cancelBooking()"><i class="ph ph-arrow-left"></i> Cancel Booking</button>
      
      <h1 style="margin-bottom: var(--spacing-sm);">Book an Appointment</h1>
      <p style="color: var(--text-muted); margin-bottom: var(--spacing-xl);">Select a specialist to view their available time slots.</p>

      <div class="grid-2">
         ${doctors.map(d => `
            <div class="card" style="display:flex; flex-direction:column;">
               <div style="display:flex; align-items:center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                  <div style="width: 60px; height: 60px; border-radius: var(--radius-full); background: var(--primary-opacity); color: var(--primary); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.5rem;">
                     ${d.name.split(' ')[1][0]}
                  </div>
                  <div>
                     <h3 style="margin:0;">${d.name}</h3>
                     <span class="badge" style="background: var(--bg-main); color: var(--text-dark); margin-top: 4px;">${d.specialization}</span>
                  </div>
               </div>
               
               <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: var(--spacing-md); flex:1;">Next Available: Today at 03:00 PM</p>
               
               <button class="btn btn-primary" style="width: 100%;" onclick="window.patientActions.bookAppointment('${d.id}')">
                  Book 03:00 PM Slot
               </button>
            </div>
         `).join('')}
      </div>
    </div>
  `;
}
