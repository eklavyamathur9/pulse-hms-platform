import { appState } from '../state.js';

export function renderAdminPortal(state) {
  // Bind actions if not already bound
  if (!window.adminActions) {
    window.adminActions = {
      updateCapacity: () => {
        const input = document.getElementById('capacityInput');
        const newCap = parseInt(input.value);
        if (newCap > 0) {
          appState.updateHospitalCapacity(newCap);
        }
      },
      forceDischarge: (apptId) => {
        if (confirm("Are you sure you want to force discharge this appointment?")) {
           appState.forceDischarge(apptId);
        }
      },
      createDoctor: (e) => {
        e.preventDefault();
        const name = document.getElementById('newDocName').value;
        const spec = document.getElementById('newDocSpec').value;
        const room = document.getElementById('newDocRoom').value;
        appState.createDoctor(name, spec, room);
        e.target.reset();
        alert('Doctor Registered Successfully!');
      },
      createPatient: (e) => {
        e.preventDefault();
        appState.createPatient(
          document.getElementById('newPtName').value,
          document.getElementById('newPtAge').value,
          document.getElementById('newPtSex').value,
          document.getElementById('newPtPhone').value,
          document.getElementById('newPtBlood').value
        );
        e.target.reset();
        alert('Patient Registered Successfully!');
      }
    };
  }

  const activeAppts = state.appointments.filter(a => a.status === 'At Seat');
  const virtualQ = state.appointments.filter(a => a.status === 'Virtual Queue');

  const capacityWarning = state.occupiedSeats.length >= state.hospitalCapacity;

  return `
    <div class="animate-fade-in" style="max-width: 1200px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--spacing-xl);">
        <div>
          <h1 style="margin-bottom: 0.5rem; color: var(--text-dark);">Hospital Command Center</h1>
          <p style="color: var(--text-muted);">Pulse HMS Network &bull; Administrator Operations</p>
        </div>
      </div>

      <!-- GLOBAL STATS BANNER -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-lg); margin-bottom: var(--spacing-xl);">
        <div class="card" style="text-align:center;">
          <h1 style="color:var(--primary); font-size:2.5rem; margin-bottom:0.5rem;">${state.patients.length}</h1>
          <p style="color:var(--text-muted); font-weight:500;">Total Patients</p>
        </div>
        <div class="card" style="text-align:center;">
          <h1 style="color:var(--secondary); font-size:2.5rem; margin-bottom:0.5rem;">${state.doctors.length}</h1>
          <p style="color:var(--text-muted); font-weight:500;">Active Doctors</p>
        </div>
        <div class="card" style="text-align:center;">
          <h1 style="color: #10b981; font-size:2.5rem; margin-bottom:0.5rem;">${activeAppts.length}</h1>
          <p style="color:var(--text-muted); font-weight:500;">Currently Seated</p>
        </div>
        <div class="card" style="text-align:center; border-bottom: 4px solid ${virtualQ.length > 0 ? 'var(--warning)' : 'inherit'};">
          <h1 style="color: ${virtualQ.length > 0 ? 'var(--warning)' : '#10b981'}; font-size:2.5rem; margin-bottom:0.5rem;">${virtualQ.length}</h1>
          <p style="color:var(--text-muted); font-weight:500;">Virtual Queue Load</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-xl);">
        
        <!-- LEFT COLUMN: OPERATIONS -->
        <div style="display:flex; flex-direction:column; gap: var(--spacing-xl);">
            
            <!-- CAPACITY MANAGER -->
            <div class="card" style="border: 2px solid ${capacityWarning ? 'var(--warning)' : '#E2E8F0'}; transition: all 0.3s ease;">
                <h2 style="margin-bottom:var(--spacing-md);"><i class="ph-fill ph-sliders-horizontal"></i> Capacity Management</h2>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                    <div>
                        <p style="color:var(--text-dark); font-weight:600; font-size:1.1rem; margin-bottom:0.25rem;">Hospital Seat Cap</p>
                        <p style="color:var(--text-muted); font-size:0.9rem;">Limit physical load. Determines queue threshold.</p>
                    </div>
                    <div style="display:flex; gap: 0.5rem; align-items:center;">
                        <input type="number" id="capacityInput" value="${state.hospitalCapacity}" style="width: 80px; text-align:center; font-size:1.2rem; font-weight:bold; padding:0.5rem; border: 2px solid #CBD5E1; border-radius: 8px;">
                        <button class="btn btn-primary" onclick="window.adminActions.updateCapacity()">Update</button>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div>
                   <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.5rem; color:var(--text-muted);">
                      <span>Occupied Seats: ${state.occupiedSeats.length}</span>
                      <span>Total Capacity: ${state.hospitalCapacity}</span>
                   </div>
                   <div style="width:100%; height:8px; background:#E2E8F0; border-radius:4px; overflow:hidden;">
                      <div style="width:${Math.min(100, (state.occupiedSeats.length / state.hospitalCapacity) * 100)}%; height:100%; background:${capacityWarning ? 'var(--warning)' : '#10b981'}; transition: width 0.3s ease;"></div>
                   </div>
                </div>
            </div>

            <!-- VIRTUAL QUEUE LIST -->
            <div class="card">
               <h2 style="margin-bottom:var(--spacing-md);"><i class="ph-fill ph-users-three"></i> Virtual Queue Anomaly Check</h2>
               ${virtualQ.length === 0 ? '<p style="color:var(--text-muted);">No patients in the virtual queue.</p>' : ''}
               <div style="display:flex; flex-direction:column; gap:0.5rem;">
                   ${virtualQ.map((vAppt, i) => {
                       const pt = state.patients.find(p => p.id === vAppt.patientId);
                       return `
                       <div style="background:#FFFBEB; border: 1px solid #FCD34D; padding: 0.75rem; border-radius: 8px; display:flex; justify-content:space-between; align-items:center;">
                          <div>
                             <strong>#${i+1} &bull; ${pt?.name || 'Unknown'}</strong>
                             <div style="font-size:0.8rem; color:#92400E;">Waiting for general admission</div>
                          </div>
                       </div>
                       `;
                   }).join('')}
               </div>
            </div>

            <!-- FORCE DISCHARGE PANEL -->
            <div class="card">
               <h2 style="margin-bottom:var(--spacing-md);"><i class="ph-fill ph-warning-circle"></i> Active Sessions (Intervention)</h2>
               ${activeAppts.length === 0 ? '<p style="color:var(--text-muted);">No active sessions to monitor.</p>' : ''}
               <div style="display:flex; flex-direction:column; gap:0.5rem; max-height:400px; overflow-y:auto; padding-right:0.5rem;">
                   ${activeAppts.map(appt => {
                       const pt = state.patients.find(p => p.id === appt.patientId);
                       const doc = state.doctors.find(d => d.id === appt.doctorId);
                       return `
                       <div style="background:var(--bg-surface); border: 1px solid #E2E8F0; padding: 0.75rem; border-radius: 8px; display:flex; justify-content:space-between; align-items:center;">
                          <div>
                             <strong>${pt?.name || 'Unknown'}</strong> (${appt.seat})
                             <div style="font-size:0.8rem; color:var(--text-muted);">Under Dr. ${doc?.name || 'Unknown'}</div>
                          </div>
                          <button class="btn" style="background:#FEE2E2; color:#DC2626; border:none; padding:4px 8px; font-size:0.85rem;" onclick="window.adminActions.forceDischarge('${appt.id}')">Force Discharge</button>
                       </div>
                       `;
                   }).join('')}
               </div>
            </div>
        </div>

        <!-- RIGHT COLUMN: CREATION -->
        <div style="display:flex; flex-direction:column; gap: var(--spacing-xl);">
            
            <div class="card">
               <h2 style="margin-bottom:var(--spacing-md);"><i class="ph-fill ph-stethoscope"></i> Register New Doctor</h2>
               <form onsubmit="window.adminActions.createDoctor(event)" style="display:flex; flex-direction:column; gap:1rem;">
                  <div>
                     <label style="display:block; margin-bottom:0.25rem; font-weight:500; font-size:0.9rem;">Full Title & Name</label>
                     <input type="text" id="newDocName" required placeholder="e.g. Dr. Jane Smith" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:8px;">
                  </div>
                  <div style="display:flex; gap:1rem;">
                     <div style="flex:2;">
                        <label style="display:block; margin-bottom:0.25rem; font-weight:500; font-size:0.9rem;">Specialization</label>
                        <input type="text" id="newDocSpec" required placeholder="e.g. Pediatrics" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:8px;">
                     </div>
                     <div style="flex:1;">
                        <label style="display:block; margin-bottom:0.25rem; font-weight:500; font-size:0.9rem;">Room/Wing</label>
                        <input type="text" id="newDocRoom" required placeholder="104" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:8px;">
                     </div>
                  </div>
                  <button type="submit" class="btn btn-primary" style="margin-top:0.5rem;">Add Doctor</button>
               </form>
            </div>

            <div class="card">
               <h2 style="margin-bottom:var(--spacing-md);"><i class="ph-fill ph-user-plus"></i> Manual Patient Intake</h2>
               <p style="color:var(--text-muted); margin-bottom:1rem; font-size:0.9rem;">Typically patients self-register, but administrators can bypass this.</p>
               <form onsubmit="window.adminActions.createPatient(event)" style="display:flex; flex-direction:column; gap:1rem;">
                  <div>
                     <label style="display:block; margin-bottom:0.25rem; font-weight:500; font-size:0.9rem;">Full Name</label>
                     <input type="text" id="newPtName" required placeholder="John Doe" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:8px;">
                  </div>
                  <div style="display:flex; gap:1rem;">
                     <div style="flex:1;">
                        <label style="display:block; margin-bottom:0.25rem; font-weight:500; font-size:0.9rem;">Age</label>
                        <input type="number" id="newPtAge" required placeholder="30" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:8px;">
                     </div>
                     <div style="flex:1;">
                        <label style="display:block; margin-bottom:0.25rem; font-weight:500; font-size:0.9rem;">Gender</label>
                        <select id="newPtSex" required style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:8px; background:white;">
                           <option value="Male">Male</option>
                           <option value="Female">Female</option>
                           <option value="Other">Other</option>
                        </select>
                     </div>
                     <div style="flex:1;">
                        <label style="display:block; margin-bottom:0.25rem; font-weight:500; font-size:0.9rem;">Blood</label>
                        <input type="text" id="newPtBlood" required placeholder="O+" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:8px;">
                     </div>
                  </div>
                  <div>
                     <label style="display:block; margin-bottom:0.25rem; font-weight:500; font-size:0.9rem;">Contact / Phone</label>
                     <input type="text" id="newPtPhone" required placeholder="+1 555-0000" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:8px;">
                  </div>
                  <button type="submit" class="btn btn-primary" style="margin-top:0.5rem;">Add Patient</button>
               </form>
            </div>
        </div>

      </div>
    </div>
  `;
}
