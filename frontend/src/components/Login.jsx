import React, { useState } from 'react';
import { HeartPulse, ShieldCheck, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [tab, setTab] = useState('patient');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Registration fields
  const [regName, setRegName] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, type: tab })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      
      login(data.user);
      
      if (data.user.role === 'patient') navigate('/patient');
      else if (data.user.role === 'doctor') navigate('/doctor');
      else if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'staff') navigate('/staff');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (regPassword !== regConfirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (regPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          contact: regContact || null,
          email: regEmail || null,
          password: regPassword
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      
      setSuccess("Account created! You can now log in.");
      setMode('login');
      setIdentifier(regContact || regEmail);
      setRegName('');
      setRegContact('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirm('');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    border: '1px solid #CBD5E1',
    borderRadius: '0.6rem',
    fontSize: '0.95rem',
    transition: 'border-color 0.2s ease',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '460px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <HeartPulse size={48} color="var(--primary)" style={{ margin: '0 auto' }} />
          <h1 style={{ marginTop: '0.5rem', color: 'var(--text-dark)', fontSize: '1.6rem' }}>Pulse HMS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Sign in to your portal' : 'Create your patient account'}
          </p>
        </div>

        {error && <div style={{ padding: '0.8rem 1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid var(--danger)' }}>{error}</div>}
        {success && <div style={{ padding: '0.8rem 1rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid var(--success)' }}>{success}</div>}

        {mode === 'login' ? (
          <>
            {/* TAB CONTROLS */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.5rem' }}>
              <button 
                style={{ flex: 1, padding: '0.5rem', fontWeight: 600, border: 'none', background: 'none', borderBottom: `3px solid ${tab === 'patient' ? 'var(--primary)' : 'transparent'}`, color: tab === 'patient' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }} 
                onClick={() => { setTab('patient'); setError(null); }}
              >
                Patient Access
              </button>
              <button 
                style={{ flex: 1, padding: '0.5rem', fontWeight: 600, border: 'none', background: 'none', borderBottom: `3px solid ${tab === 'staff' ? 'var(--primary)' : 'transparent'}`, color: tab === 'staff' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }} 
                onClick={() => { setTab('staff'); setError(null); }}
              >
                Staff & Doctor
              </button>
            </div>

            <form onSubmit={handleLogin}>
              {tab === 'staff' ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Work Email</label>
                    <input type="email" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="admin@pulse.com" style={inputStyle} required />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Secure Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} required />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Mobile Number</label>
                    <input type="tel" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="+1 555-0100" style={inputStyle} required />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} required />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1, padding: '0.9rem' }}>
                {tab === 'staff' ? <ShieldCheck size={20} /> : <LogIn size={20} />}
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Don't have a patient account? </span>
              <button onClick={() => { setMode('register'); setError(null); setSuccess(null); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                Sign Up
              </button>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#94A3B8', background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px' }}>
              <b>Demo Hints:</b><br />
              Patient: +1 555-0100 / patient_pass<br />
              Admin: admin@pulse.com / admin<br />
              Doctor: sarah@pulse.com / password123
            </div>
          </>
        ) : (
          <>
            {/* REGISTRATION FORM */}
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Full Name *</label>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="John Doe" style={inputStyle} required />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Mobile Number *</label>
                <input type="tel" value={regContact} onChange={e => setRegContact(e.target.value)} placeholder="+91 98765 43210" style={inputStyle} required />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Email (optional)</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="john@gmail.com" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Password *</label>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••" style={inputStyle} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Confirm *</label>
                  <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="••••••" style={inputStyle} required />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1, padding: '0.9rem' }}>
                <UserPlus size={20} />
                {loading ? 'Creating Account...' : 'Create Patient Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Already have an account? </span>
              <button onClick={() => { setMode('login'); setError(null); setSuccess(null); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
