import { appState } from '../state.js';

window.doctorEHRState = {
  tab: 'consult', // 'consult' | 'history' | 'rx'
  pendingRx: []
};

window.doctorActions = {
  viewPatient: (patientId) => {
    window.doctorEHRState.tab = 'consult';
    window.doctorEHRState.pendingRx = [];
    appState.updateState({ viewPatientDetails: patientId });
  },
  closePatient: () => {
    appState.updateState({ viewPatientDetails: null });
  },
  changeEhrTab: (tabName) => {
    window.doctorEHRState.tab = tabName;
    appState.updateState({ _forceRender: Date.now() }); // trigger re-render
  },
  dischargePatient: () => {
    const pId = appState.getState().viewPatientDetails;
    const dId = appState.getState().currentUserId;
    const appointment = appState.getState().appointments.find(a => a.patientId === pId && a.doctorId === dId && a.status !== 'Discharged');
    
    if (appointment) {
       appState.dischargeAppointment(appointment.id);
       appState.updateState({ viewPatientDetails: null });
       alert('Patient Discharged! Their seat has been freed for the virtual queue.');
    }
  },
  requestInvestigation: () => {
    const type = document.getElementById('inv-type').value;
    const test = document.getElementById('inv-test').value;
    const pId = appState.getState().viewPatientDetails;
    const dId = appState.getState().currentUserId;
    
    const appointment = appState.getState().appointments.find(a => a.patientId === pId && a.doctorId === dId && a.status !== 'Discharged');
    
    if (appointment && appointment.seat) {
      appState.addInvestigation(type, test, pId, dId, appointment.seat);
      alert('Investigation Requested and Placed in Technician Queue');
    } else {
      alert('Cannot request investigation: Patient does not have an active seat.');
    }
  },
  addPendingRx: () => {
    const drug = document.getElementById('rx-drug').value;
    const dosage = document.getElementById('rx-dos').value;
    const freq = document.getElementById('rx-freq').value;
    const dur = document.getElementById('rx-dur').value;

    if (!drug || !dosage) return alert('Drug and Dosage are required.');

    window.doctorEHRState.pendingRx.push({ drug, dosage, frequency: freq, duration: dur });
    document.getElementById('rx-drug').value = '';
    document.getElementById('rx-dos').value = '';
    
    appState.updateState({ _forceRender: Date.now() });
  },
  removePendingRx: (index) => {
    window.doctorEHRState.pendingRx.splice(index, 1);
    appState.updateState({ _forceRender: Date.now() });
  },
  saveConsultation: () => {
    const notesText = document.getElementById('clinical-notes-input').value;
    const pId = appState.getState().viewPatientDetails;
    const dId = appState.getState().currentUserId;
    const appointment = appState.getState().appointments.find(a => a.patientId === pId && a.doctorId === dId && a.status !== 'Discharged');

    if (!notesText && window.doctorEHRState.pendingRx.length === 0) {
      return alert('Cannot save an empty consultation.');
    }

    appState.saveConsultation(pId, dId, notesText, window.doctorEHRState.pendingRx, appointment?.id);
    
    alert('Consultation Saved to Patient Records!');
    window.doctorEHRState.pendingRx = [];
    window.doctorActions.changeEhrTab('history');
  }
};

export function renderDoctorPortal(state) {
  const me = state.doctors.find(d => d.id === state.currentUserId);
  const myQueue = state.appointments.filter(a => a.doctorId === state.currentUserId && a.status !== 'Discharged');

  if (state.viewPatientDetails) {
     return renderEHRSys(state, state.viewPatientDetails);
  }

  return `
    <div class="animate-fade-in">
      <div style="display: flex; justify-content: space-between; align-items:center; margin-bottom: var(--spacing-xl);">
         <h1>${me.name}'s Roster</h1>
         <div style="background: var(--bg-surface); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-full); box-shadow: var(--shadow-sm); display:flex; align-items:center; gap: 8px;">
            <i class="ph-fill ph-check-circle" style="color: var(--success);"></i> <span style="font-weight: 500;">Available in Room ${me.room}</span>
         </div>
      </div>

      <div class="card">
        <h2>Active Patients</h2>
        <div style="overflow-x: auto;">
           <table>
             <thead>
               <tr>
                 <th>Time</th>
                 <th>Patient</th>
                 <th>Status</th>
                 <th>Location</th>
                 <th>Action</th>
               </tr>
             </thead>
             <tbody>
               ${myQueue.map(app => {
                 const p = state.patients.find(x => x.id === app.patientId);
                 return `
                   <tr>
                     <td style="font-weight: 500;">${app.time}</td>
                     <td>
                        <div style="font-weight: 600;">${p.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${p.age} y/o &bull; ${p.gender}</div>
                     </td>
                     <td><span class="badge ${app.status === 'Virtual Queue' ? 'warning' : 'success'}">${app.status}</span></td>
                     <td>${app.seat}</td>
                     <td>
                       <button class="btn btn-primary" style="padding: 0.4rem 1rem;" onclick="window.doctorActions.viewPatient('${p.id}')">Open EHR</button>
                     </td>
                   </tr>
                 `;
               }).join('')}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  `;
}

function renderEHRSys(state, patientId) {
  const p = state.patients.find(x => x.id === patientId);
  const myInvestigations = state.investigations.filter(i => i.patientId === patientId);
  const pastNotes = state.clinicalNotes.filter(n => n.patientId === patientId);
  const pastRx = state.prescriptions.filter(rx => rx.patientId === patientId);

  // Determine Vitals from recent investigations
  const vitalsInv = myInvestigations.reverse().find(i => i.type === 'Vitals');
  const vitalsDisplay = vitalsInv ? (vitalsInv.status === 'Completed' ? vitalsInv.result : 'Pending Tech...') : 'Not Ordered';

  const tab = window.doctorEHRState.tab;

  return `
    <div class="animate-fade-in ehr-system">
      <div style="display: flex; justify-content: space-between; align-items:center; margin-bottom: var(--spacing-sm);">
         <button class="btn btn-secondary" onclick="window.doctorActions.closePatient()"><i class="ph ph-arrow-left"></i> Roster</button>
         <div>
            <button class="btn btn-primary" onclick="window.doctorActions.saveConsultation()"><i class="ph ph-floppy-disk"></i> Save Consult</button>
            <button class="btn" style="background: var(--danger); color: white; margin-left: 0.5rem;" onclick="window.doctorActions.dischargePatient()"><i class="ph ph-sign-out"></i> Discharge</button>
         </div>
      </div>

      <!-- EHR Top Banner Profile -->
      <div class="card" style="display:flex; flex-wrap:wrap; gap: 2rem; background: var(--bg-surface); border-bottom: 4px solid var(--primary); margin-bottom: var(--spacing-md);">
         <div style="display:flex; align-items:center; gap: 1rem;">
            <div style="width: 70px; height: 70px; border-radius: var(--radius-full); background: var(--primary-opacity); color: var(--primary); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:2rem;">
               ${p.name[0]}
            </div>
            <div>
               <h1 style="margin: 0; font-size: 1.8rem;">${p.name}</h1>
               <p style="color: var(--text-muted); margin:0;">${p.age} yrs &bull; ${p.gender} &bull; ${p.contact}</p>
            </div>
         </div>
         
         <div style="display:flex; gap: 2rem; flex: 1; justify-content: flex-end; align-items:center;">
             <div style="background: white; padding: 10px 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Blood Type</div>
                <div style="font-weight:600; color:var(--danger);">${p.bloodType || 'Unknown'}</div>
             </div>
             <div style="background: white; padding: 10px 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Allergies</div>
                <div style="font-weight:600;">${p.allergies && p.allergies.length ? p.allergies.join(', ') : 'None'}</div>
             </div>
             <div style="background: white; padding: 10px 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Latest Vitals</div>
                <div style="font-weight:600; color: ${vitalsDisplay.includes('Pending') ? 'var(--warning)' : 'var(--text-dark)'};">${vitalsDisplay}</div>
             </div>
         </div>
      </div>

      <!-- EHR Navigation -->
      <div style="display:flex; gap: 1rem; margin-bottom: var(--spacing-lg); border-bottom: 2px solid #E2E8F0; padding-bottom: 0.5rem;">
         <button class="btn ${tab === 'consult' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="window.doctorActions.changeEhrTab('consult')">Current Consult</button>
         <button class="btn ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="window.doctorActions.changeEhrTab('history')">Health Records (${pastNotes.length})</button>
         <button class="btn ${tab === 'rx' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="window.doctorActions.changeEhrTab('rx')">Prescriptions (${pastRx.length})</button>
      </div>

      <!-- TAB CONTENT -->

      ${tab === 'consult' ? `
        <div class="grid-2">
           <div style="display:flex; flex-direction:column; gap: var(--spacing-md);">
              <div class="card">
                 <h3 style="margin-bottom: var(--spacing-sm);">Clinical Notes</h3>
                 <textarea id="clinical-notes-input" style="width: 100%; height: 200px; padding: var(--spacing-md); border-radius: var(--radius-sm); border: 1px solid #CBD5E1; font-family: inherit; font-size:1rem;" placeholder="Chief complaint, HPI, Assessment, Plan..."></textarea>
              </div>

              <div class="card" style="background: #F8FAFC; border: 1px solid #E2E8F0;">
                 <h3 style="margin-bottom: var(--spacing-sm);"><i class="ph ph-pill"></i> E-Prescribe</h3>
                 
                 <div style="display:flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <input type="text" id="rx-drug" placeholder="Drug (e.g. Amoxicillin)" style="flex:2; padding: 0.5rem; border-radius: 4px; border: 1px solid #CBD5E1;">
                    <input type="text" id="rx-dos" placeholder="Dosage (e.g. 500mg)" style="flex:1; padding: 0.5rem; border-radius: 4px; border: 1px solid #CBD5E1;">
                 </div>
                 <div style="display:flex; gap: 0.5rem; margin-bottom: 1rem;">
                    <input type="text" id="rx-freq" placeholder="Frequency (e.g. 2x Daily)" style="flex:1; padding: 0.5rem; border-radius: 4px; border: 1px solid #CBD5E1;">
                    <input type="text" id="rx-dur" placeholder="Duration (e.g. 7 days)" style="flex:1; padding: 0.5rem; border-radius: 4px; border: 1px solid #CBD5E1;">
                    <button class="btn btn-secondary" onclick="window.doctorActions.addPendingRx()">Add</button>
                 </div>

                 ${window.doctorEHRState.pendingRx.length > 0 ? `
                   <h4 style="font-size: 0.85rem; text-transform:uppercase; color: var(--text-muted);">Unsaved Prescriptions:</h4>
                   <ul style="list-style:none; padding:0; margin:0;">
                     ${window.doctorEHRState.pendingRx.map((rx, idx) => `
                        <li style="display:flex; justify-content:space-between; align-items:center; background: white; padding: 0.5rem; border-radius: 4px; margin-bottom: 0.25rem; border: 1px solid #E2E8F0;">
                           <span><strong>${rx.drug}</strong> ${rx.dosage} - ${rx.frequency} for ${rx.duration}</span>
                           <button style="color:var(--danger); border:none; background:none; cursor:pointer;" onclick="window.doctorActions.removePendingRx(${idx})"><i class="ph ph-x"></i></button>
                        </li>
                     `).join('')}
                   </ul>
                 ` : ''}
              </div>
           </div>

           <div>
              <div class="card" style="background: var(--bg-main); border: 1px solid #E2E8F0; box-shadow: none;">
                 <h3 style="margin-bottom: var(--spacing-sm);">Investigation Orders</h3>
                 <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-lg);">
                    <select id="inv-type" style="flex: 1; padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid #CBD5E1;">
                       <option value="Lab">Lab</option>
                       <option value="Radiology">Radiology</option>
                    </select>
                    <input type="text" id="inv-test" placeholder="Test (e.g., CBC)" style="flex: 2; padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid #CBD5E1;">
                    <button class="btn btn-primary" onclick="window.doctorActions.requestInvestigation()"><i class="ph ph-plus"></i></button>
                 </div>

                 <h4 style="font-size: 0.85rem; text-transform:uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Current Visit Orders</h4>
                 ${myInvestigations.length === 0 ? '<p style="font-size: 0.9rem;">No orders.</p>' : `
                    <div style="display:flex; flex-direction:column; gap: var(--spacing-sm);">
                       ${myInvestigations.map(inv => `
                          <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-sm); border-left: 4px solid ${inv.status==='Completed' ? 'var(--success)' : 'var(--warning)'};">
                             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                 <strong style="font-size:0.95rem;">${inv.test}</strong>
                                 <span class="badge ${inv.status==='Completed' ? 'success' : 'warning'}">${inv.status}</span>
                             </div>
                             <div style="font-size: 0.9rem; color: var(--text-dark);">Result: ${inv.result || 'Pending'}</div>
                          </div>
                       `).join('')}
                    </div>
                 `}
              </div>
           </div>
        </div>
      ` : ''}

      ${tab === 'history' ? `
        <div class="card">
           <h2 style="margin-bottom: var(--spacing-md);">Clinical History</h2>
           ${pastNotes.length === 0 ? '<p>No past clinical notes found.</p>' : `
              <div style="display:flex; flex-direction:column; gap: 1rem;">
                 ${pastNotes.reverse().map(note => `
                    <div style="border-left: 2px solid var(--primary); padding-left: 1rem;">
                       <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                          <i class="ph ph-calendar"></i> ${note.date} &bull; Dr. ${state.doctors.find(d=>d.id===note.doctorId)?.name || 'Unknown'}
                       </div>
                       <p style="margin: 0; line-height: 1.5; white-space: pre-wrap;">${note.text}</p>
                    </div>
                 `).join('')}
              </div>
           `}
        </div>
      ` : ''}

      ${tab === 'rx' ? `
        <div class="card">
           <h2 style="margin-bottom: var(--spacing-md);"><i class="ph-fill ph-pill"></i> Prescription History</h2>
           ${pastRx.length === 0 ? '<p>No prescriptions on record.</p>' : `
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                 <thead>
                    <tr style="border-bottom: 2px solid #E2E8F0;">
                       <th style="padding: 0.75rem 0.5rem; color:var(--text-muted);">Date</th>
                       <th style="padding: 0.75rem 0.5rem; color:var(--text-muted);">Drug</th>
                       <th style="padding: 0.75rem 0.5rem; color:var(--text-muted);">Dosage</th>
                       <th style="padding: 0.75rem 0.5rem; color:var(--text-muted);">Frequency</th>
                       <th style="padding: 0.75rem 0.5rem; color:var(--text-muted);">Status</th>
                    </tr>
                 </thead>
                 <tbody>
                    ${pastRx.reverse().map(rx => `
                       <tr style="border-bottom: 1px solid #E2E8F0;">
                          <td style="padding: 0.75rem 0.5rem; font-size:0.9rem;">${rx.date}</td>
                          <td style="padding: 0.75rem 0.5rem; font-weight:600;">${rx.drug}</td>
                          <td style="padding: 0.75rem 0.5rem;">${rx.dosage}</td>
                          <td style="padding: 0.75rem 0.5rem; color:var(--text-muted);">${rx.frequency} for ${rx.duration}</td>
                          <td style="padding: 0.75rem 0.5rem;"><span class="badge ${rx.active ? 'success' : 'warning'}">${rx.active ? 'Active' : 'Inactive'}</span></td>
                       </tr>
                    `).join('')}
                 </tbody>
              </table>
           `}
        </div>
      ` : ''}
    </div>
  `;
}
