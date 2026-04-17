import { appState } from '../state.js';

window.investigationActions = {
  completeTest: (id) => {
    const result = prompt('Enter the test result:');
    if (result !== null) {
      appState.updateInvestigationStatus(id, 'Completed', result);
    }
  }
};

export function renderInvestigationPortal(state, department) {
  // department is 'Lab' or 'Radiology'
  const pendingOrders = state.investigations.filter(i => i.type === department && i.status === 'Pending');
  const completedOrders = state.investigations.filter(i => i.type === department && i.status === 'Completed');

  return `
    <div class="animate-fade-in">
      <div style="display: flex; justify-content: space-between; align-items:center; margin-bottom: var(--spacing-xl);">
         <h1>${department} Queue</h1>
         <div style="background: var(--bg-surface); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-full); box-shadow: var(--shadow-sm); display:flex; align-items:center; gap: 8px;">
            <i class="ph-fill ph-siren" style="color: var(--warning);"></i> <span style="font-weight: 500;">${pendingOrders.length} Active Requests</span>
         </div>
      </div>

      <div class="grid-2">
         <!-- Active Queue -->
         <div class="card glass-panel" style="border-top: 4px solid var(--warning);">
            <h2><i class="ph ph-clock-countdown" style="margin-right: 8px; color: var(--warning);"></i> Active At-Seat Requests</h2>
            <p style="color: var(--text-muted); margin-bottom: var(--spacing-md);">Go to the patient's seat to perform these tests.</p>
            
            ${pendingOrders.length === 0 ? '<p>No pending requests.</p>' : `
              <div style="display:flex; flex-direction:column; gap: var(--spacing-md);">
                ${pendingOrders.map(inv => {
                  const p = state.patients.find(x => x.id === inv.patientId);
                  const d = state.doctors.find(x => x.id === inv.doctorId);
                  return `
                    <div style="background: var(--bg-surface); padding: var(--spacing-md); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
                       <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-sm);">
                          <div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-dark);">${inv.test}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Requested by: ${d.name}</div>
                          </div>
                          <div style="background: var(--warning-bg); color: var(--warning); padding: 4px 8px; border-radius: var(--radius-sm); font-weight: bold;">
                             ${inv.seat}
                          </div>
                       </div>
                       
                       <div style="background: var(--bg-main); padding: 8px; border-radius: 4px; margin-bottom: var(--spacing-sm);">
                         <strong>Patient:</strong> ${p.name} (${p.age}${p.gender[0]})
                       </div>

                       <button class="btn btn-primary" style="width: 100%; background: var(--success);" onclick="window.investigationActions.completeTest('${inv.id}')">
                         <i class="ph ph-check"></i> Enter Results
                       </button>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
         </div>

         <!-- Completed -->
         <div class="card">
            <h2>Recent Completed</h2>
            ${completedOrders.length === 0 ? '<p>No completed requests yet.</p>' : `
              <table>
                 <thead><tr><th>Patient</th><th>Test</th><th>Result</th></tr></thead>
                 <tbody>
                    ${completedOrders.map(inv => {
                      const p = state.patients.find(x => x.id === inv.patientId);
                      return `
                         <tr>
                            <td style="font-weight:500;">${p.name}</td>
                            <td>${inv.test}</td>
                            <td style="font-weight:bold; color: var(--success);">${inv.result}</td>
                         </tr>
                      `;
                    }).join('')}
                 </tbody>
              </table>
            `}
         </div>
      </div>
    </div>
  `;
}
