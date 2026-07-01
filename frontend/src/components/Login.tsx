import React, { useState, useCallback } from 'react';
import { HeartPulse, ShieldCheck, LogIn, UserPlus } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [tab, setTab] = useState<'patient' | 'staff'>('patient');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [hospitalId, setHospitalId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [regName, setRegName] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, direction: 'prev' | 'next') => {
    const tabs = ['patient', 'staff'] as const;
    const idx = tabs.indexOf(tab);
    const next = direction === 'next' ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
    (e.target as HTMLElement).parentElement?.children[next]?.querySelector('button')?.focus();
    setTab(tabs[next]);
    setError(null);
  }, [tab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, type: tab, hospital_id: parseInt(hospitalId) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      login(data.user, data.token, data.refresh_token);
      if (data.user.role === 'patient') navigate('/patient');
      else if (data.user.role === 'doctor') navigate('/doctor');
      else if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'staff') navigate('/staff');
      else if (data.user.role === 'superadmin') navigate('/superadmin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (regPassword !== regConfirm) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          contact: regContact || null,
          email: regEmail || null,
          password: regPassword,
          hospital_id: parseInt(hospitalId)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');

      setSuccess('Account created! You can now log in.');
      setMode('login');
      setIdentifier(regContact || regEmail);
      setRegName('');
      setRegContact('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '460px' }}>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <HeartPulse size={48} color="var(--primary)" style={{ margin: '0 auto' }} aria-hidden="true" />
          <h1 style={{ marginTop: '0.5rem', color: 'var(--text-dark)', fontSize: '1.6rem' }}>Pulse HMS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Sign in to your portal' : 'Create your patient account'}
          </p>
        </div>

        {error && <div role="alert" style={{ padding: '0.8rem 1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid var(--danger)' }}>{error}</div>}
        {success && <div role="alert" style={{ padding: '0.8rem 1rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid var(--success)' }}>{success}</div>}

        {mode === 'login' ? (
          <>
            <div role="tablist" aria-label="Login type" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <button
                role="tab"
                aria-selected={tab === 'patient'}
                tabIndex={tab === 'patient' ? 0 : -1}
                style={{ flex: 1, padding: '0.5rem', fontWeight: 600, border: 'none', background: 'none', borderBottom: `3px solid ${tab === 'patient' ? 'var(--primary)' : 'transparent'}`, color: tab === 'patient' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={() => { setTab('patient'); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); handleTabKeyDown(e, 'next'); } if (e.key === 'ArrowLeft') { e.preventDefault(); handleTabKeyDown(e, 'prev'); } }}
              >
                Patient Access
              </button>
              <button
                role="tab"
                aria-selected={tab === 'staff'}
                tabIndex={tab === 'staff' ? 0 : -1}
                style={{ flex: 1, padding: '0.5rem', fontWeight: 600, border: 'none', background: 'none', borderBottom: `3px solid ${tab === 'staff' ? 'var(--primary)' : 'transparent'}`, color: tab === 'staff' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={() => { setTab('staff'); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); handleTabKeyDown(e, 'next'); } if (e.key === 'ArrowLeft') { e.preventDefault(); handleTabKeyDown(e, 'prev'); } }}
              >
                Staff & Doctor
              </button>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <Input label="Workspace ID" type="number" value={hospitalId} onChange={e => setHospitalId(e.target.value)} placeholder="1" required />
              </div>
              {tab === 'staff' ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <Input label="Work Email" type="email" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="admin@pulse.com" required />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <Input label="Secure Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <Input label="Mobile Number" type="tel" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="+1 555-0100" required />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                </>
              )}

              <Button type="submit" disabled={loading} variant="primary" className="w-full" style={{ opacity: loading ? 0.7 : 1 }}>
                {tab === 'staff' ? <ShieldCheck size={20} /> : <LogIn size={20} />}
                {loading ? 'Verifying...' : 'Sign In'}
              </Button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Don't have a patient account? </span>
              <button onClick={() => { setMode('register'); setError(null); setSuccess(null); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                Sign Up
              </button>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <b>Demo Hints:</b><br />
              Patient: +1 555-0100 / patient_pass<br />
              Admin: admin@pulse.com / admin<br />
              Doctor: sarah@pulse.com / password123
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1rem' }}>
                <Input label="Workspace ID *" type="number" value={hospitalId} onChange={e => setHospitalId(e.target.value)} placeholder="1" required />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <Input label="Full Name *" value={regName} onChange={e => setRegName(e.target.value)} placeholder="John Doe" required />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <Input label="Mobile Number *" type="tel" value={regContact} onChange={e => setRegContact(e.target.value)} placeholder="+91 98765 43210" required />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <Input label="Email (optional)" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="john@gmail.com" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <Input label="Password *" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••" required />
                </div>
                <div>
                  <Input label="Confirm *" type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="••••••" required />
                </div>
              </div>

              <Button type="submit" disabled={loading} variant="primary" className="w-full" style={{ opacity: loading ? 0.7 : 1 }}>
                <UserPlus size={20} />
                {loading ? 'Creating Account...' : 'Create Patient Account'}
              </Button>
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
