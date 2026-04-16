// authProvider.js
// Simulates an external Identity Provider like Firebase or Supabase

export const AuthProvider = {
  // Simulates Google OAuth Popup
  signInWithGoogle: async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const email = prompt('Simulating Google Sign-In...\nEnter your Google Email:');
        if (!email) return reject(new Error('User cancelled login.'));
        
        let role = 'patient'; // Default fallback
        let id = 'U_' + Math.random().toString(36).substr(2, 9);
        let name = email.split('@')[0];

        // Domain-based Staff Provisioning
        if (email.endsWith('@pulsehms.com')) {
          role = 'doctor';
          // Map specific emails to doctors
          if (email.startsWith('james')) { id = 'D2'; name = 'Dr. James Chen'; }
          else if (email.startsWith('emily')) { id = 'D3'; name = 'Dr. Emily Carter'; }
          else { id = 'D1'; name = 'Dr. Sarah Wilson'; }
        } else if (email.endsWith('@lab.pulsehms.com')) {
          role = 'lab';
          id = 'L1';
        } else if (email.endsWith('@radio.pulsehms.com')) {
          role = 'radiology';
          id = 'R1';
        }

        resolve({
          user: { id, email, name, role },
          token: 'mock_jwt_token_123'
        });
      }, 500); // Simulate network delay
    });
  },

  // Simulates sending an OTP via SMS
  sendOTP: async (phoneNumber) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Mock SMS sent to ${phoneNumber}. Code is 1234`);
        resolve(true); // Return true indicating SMS sent
      }, 800);
    });
  },

  // Simulates verifying the OTP code
  verifyOTP: async (phoneNumber, code) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (['1111', '2222', '3333', '4444', '5555'].includes(code)) {
          const idMap = { '1111': 'P1', '2222': 'P2', '3333': 'P3', '4444': 'P4', '5555': 'P5' };
          const nameMap = { '1111': 'John Doe', '2222': 'Jane Smith', '3333': 'Emily Davis', '4444': 'Michael Brown', '5555': 'Sarah Wilson' };
          
          resolve({
            user: { 
              id: idMap[code], 
              phone: phoneNumber, 
              name: nameMap[code], 
              role: 'patient' 
            },
            token: 'mock_jwt_token_456'
          });
        } else {
          reject(new Error('Invalid OTP. Hint: Use 1111, 2222, 3333, 4444, or 5555'));
        }
      }, 500);
    });
  }
};
