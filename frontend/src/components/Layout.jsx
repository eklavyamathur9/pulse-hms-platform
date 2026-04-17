import { LogOut, HeartPulse, Shield, Stethoscope, Users, User, Sun, Moon } from 'lucide-react';

const roleConfig = {
  patient: { label: 'Patient', color: '#6366f1', bg: '#eef2ff', icon: <User size={14} /> },
  doctor:  { label: 'Doctor',  color: '#059669', bg: '#ecfdf5', icon: <Stethoscope size={14} /> },
  staff:   { label: 'Staff',   color: '#d97706', bg: '#fffbeb', icon: <Users size={14} /> },
  admin:   { label: 'Admin',   color: '#dc2626', bg: '#fef2f2', icon: <Shield size={14} /> },
};

export default function Layout({ children, toggleTheme, theme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
      navigate('/');
    }
  };

  const role = roleConfig[user?.role] || roleConfig.patient;

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
            {/* Avatar & Identity */}
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

            {/* Quick Info */}
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
          <button className="btn btn-secondary" onClick={handleLogout} style={{ width: '100%', border: '1px solid #CBD5E1', gap: '0.5rem' }}>
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
