import React from 'react';
import { LogOut, HeartPulse, Shield, Stethoscope, Users, User, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleConfig {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}

const roleConfig: Record<string, RoleConfig> = {
  patient: { label: 'Patient', color: 'var(--role-patient)', bg: 'var(--role-patient-bg)', icon: <User size={14} /> },
  doctor:  { label: 'Doctor',  color: 'var(--role-doctor)', bg: 'var(--role-doctor-bg)', icon: <Stethoscope size={14} /> },
  staff:   { label: 'Staff',   color: 'var(--role-staff)', bg: 'var(--role-staff-bg)', icon: <Users size={14} /> },
  admin:   { label: 'Admin',   color: 'var(--role-admin)', bg: 'var(--role-admin-bg)', icon: <Shield size={14} /> },
  superadmin: { label: 'Super Admin', color: 'var(--role-superadmin)', bg: 'var(--role-superadmin-bg)', icon: <Shield size={14} /> },
};

interface LayoutProps {
  children: React.ReactNode;
  toggleTheme: () => void;
  theme: string;
}

export default function Layout({ children, toggleTheme, theme }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/');
    }
  };

  const role = roleConfig[user?.role || 'patient'] || roleConfig.patient;

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 'var(--spacing-xl)' }}>
          <div className="brand" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HeartPulse /> Pulse
          </div>
          <button 
            onClick={toggleTheme} 
            className="btn-icon"
            style={{ 
              background: 'var(--bg-main)', 
              color: 'var(--primary)', 
              borderRadius: 'var(--radius-sm)',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
        
        {user && (
          <div style={{ flex: 1, marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <div style={{ 
                width: '42px', height: '42px', borderRadius: '50%', 
                background: role.bg, color: role.color, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: 700, fontSize: '1.1rem',
                border: `2px solid ${role.color}`
              }}>
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-dark)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.name}
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem',
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                  background: role.bg, color: role.color,
                  marginTop: '2px'
                }}>
                  {role.icon} {role.label}
                </span>
              </div>
            </div>

            {user.role === 'patient' && user.contact && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-main)', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Mobile:</strong> {user.contact}
              </div>
            )}
            {(user.role === 'doctor' || user.role === 'admin' || user.role === 'staff') && user.email && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-main)', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                <strong>Email:</strong> {user.email}
              </div>
            )}
          </div>
        )}

        {user && (
          <button className="btn btn-secondary" onClick={handleLogout} style={{ width: '100%', border: '1px solid var(--border-color)', gap: '0.5rem' }}>
            <LogOut size={16} /> Sign Out
          </button>
        )}
      </nav>
      <div className="content-area" id="portal-content">
        {children}
      </div>
    </div>
  );
}
