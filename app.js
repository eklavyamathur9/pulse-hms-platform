import { appState } from './state.js';
import { AuthProvider } from './authProvider.js';
import { renderPatientPortal } from './portals/patient.js';
import { renderDoctorPortal } from './portals/doctor.js';
import { renderInvestigationPortal } from './portals/investigation.js';
import { renderAdminPortal } from './portals/admin.js';

class App {
  constructor() {
    this.appDiv = document.getElementById('app');
    
    appState.subscribe((state) => {
      this.render(state);
    });

    this.render(appState.getState());
  }

  handleLogout() {
    appState.updateState({ currentUserRole: null, currentUserId: null, currentUserName: null });
  }

  // Internal state for login UI
  loginState = {
    tab: 'patient' // 'patient' or 'staff'
  };

  switchTab(tab) {
    this.loginState.tab = tab;
    this.render(appState.getState());
  }

  handlePatientLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('phone-input').value;
    if (!phone) return alert('Please enter phone number');
    
    document.getElementById('phone-action-btn').innerHTML = 'Verifying...';
    appState.loginPatient(phone);
  }

  handleStaffLogin(e) {
    e.preventDefault();
    const email = document.getElementById('staff-email').value;
    const password = document.getElementById('staff-pass').value;
    if (!email || !password) return alert('Please enter both email and password');
    
    document.getElementById('staff-action-btn').innerHTML = 'Verifying...';
    appState.loginStaff(email, password);
  }

  renderLoginScreen() {
    const isPatient = this.loginState.tab === 'patient';
    const isStaff = this.loginState.tab === 'staff';

    return `
      <div class="role-selector-wrapper animate-fade-in" style="background: url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600') center/cover; min-height:100vh; display:flex; justify-content:center; align-items:center;">
        <div style="background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 3rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-width: 450px; width: 100%;">
          
          <div style="text-align: center; margin-bottom: 2rem;">
            <i class="ph-fill ph-heartbeat" style="font-size: 3rem; color: var(--primary);"></i>
            <h1 style="margin-top: 0.5rem; color: var(--text-dark);">Pulse HMS</h1>
            <p style="color: var(--text-muted);">Unified Authentication Gateway</p>
          </div>
          
          <!-- TAB CONTROLS -->
          <div style="display:flex; gap:0.5rem; margin-bottom:1.5rem; border-bottom: 2px solid #E2E8F0; padding-bottom: 0.5rem;">
             <button style="flex:1; padding:0.5rem; font-weight:600; border:none; background:none; border-bottom: 3px solid ${isPatient ? 'var(--primary)' : 'transparent'}; color:${isPatient ? 'var(--primary)' : 'var(--text-muted)'}; cursor:pointer;" onclick="window.app.switchTab('patient')">Patient Access</button>
             <button style="flex:1; padding:0.5rem; font-weight:600; border:none; background:none; border-bottom: 3px solid ${isStaff ? 'var(--primary)' : 'transparent'}; color:${isStaff ? 'var(--primary)' : 'var(--text-muted)'}; cursor:pointer;" onclick="window.app.switchTab('staff')">Staff Access</button>
          </div>

          ${isStaff ? `
            <!-- STAFF LOGIN -->
            <form onsubmit="window.app.handleStaffLogin(event)">
              <div style="margin-bottom: 1rem;">
                <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.5rem; color: var(--text-dark);">Work Email</label>
                <input type="email" id="staff-email" placeholder="admin@pulse.com" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:0.5rem; font-size:1rem;">
              </div>
              <div style="margin-bottom: 1.5rem;">
                <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.5rem; color: var(--text-dark);">Secure Password</label>
                <input type="password" id="staff-pass" placeholder="••••••••" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:0.5rem; font-size:1rem;">
              </div>
              <button type="submit" class="btn btn-primary" id="staff-action-btn" style="width:100%; display:flex; justify-content:center; align-items:center; gap:0.5rem;">
                 <i class="ph-bold ph-shield-check"></i> Authenticate
              </button>
            </form>
          ` : `
            <!-- PATIENT LOGIN -->
            <form onsubmit="window.app.handlePatientLogin(event)">
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Enter your registered hospital phone number below to bypass waiting lines.</p>
              <div style="margin-bottom: 1.5rem;">
                <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.5rem; color: var(--text-dark);">Mobile Number</label>
                <input type="tel" id="phone-input" placeholder="+1 555-0100" style="width:100%; padding:0.75rem; border:1px solid #CBD5E1; border-radius:0.5rem; font-size:1rem;">
              </div>
              <button type="submit" class="btn btn-primary" id="phone-action-btn" style="width:100%; display:flex; justify-content:center; align-items:center; gap:0.5rem;">
                 <i class="ph-bold ph-sign-in"></i> Verify Phone
              </button>
            </form>
          `}

          <div style="margin-top:2rem; text-align:center; font-size:0.8rem; color:#94A3B8; background:#F8FAFC; padding:1rem; border-radius:8px;">
             <b>Demo Hints:</b><br>
             Patient: +1 555-0100<br>
             Admin: admin@pulse.com / admin<br>
             Doctor: sarah@pulse.com / password123
          </div>
        </div>
      </div>
    `;
  }

  render(state) {
    this.appDiv.innerHTML = '';
    
    // Asynchronous backend loading state block
    if (state.patients.length === 0) {
      this.appDiv.innerHTML = `
        <div style="height: 100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#F8FAFC;">
           <i class="ph-duotone ph-heartbeat" style="font-size: 4rem; color: var(--primary); animation: pulse 1.5s infinite;"></i>
           <h2 style="color: var(--text-dark); margin-top: 1rem;">Connecting to Pulse Server...</h2>
           <p style="color: var(--text-muted);">Fetching live hospital data</p>
        </div>
        <style>
          @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
        </style>
      `;
      return;
    }

    if (!state.currentUserRole) {
      this.appDiv.innerHTML = this.renderLoginScreen();
    } else {
      // Secure Area Layout
      const layout = `
        <div class="app-container">
          <nav class="sidebar" style="width: 250px; background: var(--bg-surface); padding: var(--spacing-lg); border-right: 1px solid #E2E8F0; display:flex; flex-direction:column; gap: var(--spacing-lg);">
             <div class="brand">
               <i class="ph-fill ph-heartbeat"></i> Pulse
             </div>
             
             <div style="flex:1;">
               <div style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; margin-bottom: var(--spacing-sm); font-weight:700;">Logged in as</div>
               <div style="font-weight: 600; font-size: 1.1rem; color: var(--text-dark);">
                  ${state.currentUserName || 'User'}
               </div>
               <div style="color: var(--primary); font-size: 0.85rem; font-weight: 500; text-transform: capitalize; margin-top: 4px;">
                  Role: ${state.currentUserRole}
               </div>
             </div>

             <button class="btn btn-secondary" onclick="window.app.handleLogout()" style="width: 100%; border:1px solid #CBD5E1;"><i class="ph ph-sign-out"></i> Log Out</button>
          </nav>
          <div class="content-area" id="portal-content">
             <!-- Portal specific content injected here -->
          </div>
        </div>
      `;
      this.appDiv.innerHTML = layout;
      
      const portalContent = document.getElementById('portal-content');
      
      // Strict Route Guarding based on Role
      if (state.currentUserRole === 'patient') {
        portalContent.innerHTML = renderPatientPortal(state);
      } else if (state.currentUserRole === 'doctor') {
        portalContent.innerHTML = renderDoctorPortal(state);
      } else if (state.currentUserRole === 'admin') {
        portalContent.innerHTML = renderAdminPortal(state);
      } else if (state.currentUserRole === 'lab') {
        portalContent.innerHTML = renderInvestigationPortal(state, 'Lab');
      } else if (state.currentUserRole === 'radiology') {
        portalContent.innerHTML = renderInvestigationPortal(state, 'Radiology');
      } else {
        portalContent.innerHTML = `<h1 style="color:red;">Access Denied. Unknown Role.</h1>`;
      }
    }
  }
}

// Initialize App globally so inline event handlers can reach it
window.app = new App();
