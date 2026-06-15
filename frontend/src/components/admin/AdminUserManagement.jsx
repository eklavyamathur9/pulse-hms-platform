import React, { useState } from 'react';
import { Users, UserPlus, XCircle, CheckCircle } from 'lucide-react';

const inputStyle = { width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc' };

export default function AdminUserManagement({ users, onCreateUser, onToggleActive }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateUser(newUser);
    setNewUser({ name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '' });
    setShowCreateForm(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h2><Users size={20} color="var(--primary)" /> All Users ({users.length})</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          <UserPlus size={18} /> {showCreateForm ? 'Cancel' : 'Register New User'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="card glass-panel" style={{ padding: '1.5rem', marginBottom: 'var(--spacing-xl)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Full Name *</label>
            <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Role *</label>
            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{...inputStyle, background: 'white'}}>
              <option value="doctor">Doctor</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Email *</label>
            <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={inputStyle} placeholder="doctor@pulse.com" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Password</label>
            <input value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} style={inputStyle} />
          </div>
          {newUser.role === 'doctor' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Specialization</label>
              <input value={newUser.specialization} onChange={e => setNewUser({...newUser, specialization: e.target.value})} style={inputStyle} placeholder="e.g. Cardiology" />
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><UserPlus size={18} /> Create User</button>
          </div>
        </form>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead style={{ background: 'var(--bg-main)' }}>
            <tr>
              <th>ID</th><th>Name</th><th>Role</th><th>Email / Contact</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td>#{u.id}</td>
                <td style={{ fontWeight: 600 }}>{u.name}{u.specialization ? ` (${u.specialization})` : ''}</td>
                <td>
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                    background: u.role === 'doctor' ? '#ecfdf5' : u.role === 'admin' ? '#fef2f2' : u.role === 'patient' ? '#eef2ff' : '#fffbeb',
                    color: u.role === 'doctor' ? '#059669' : u.role === 'admin' ? '#dc2626' : u.role === 'patient' ? '#6366f1' : '#d97706'
                  }}>{u.role}</span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email || u.contact || '—'}</td>
                <td>
                  {u.is_active ? <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>Active</span>
                   : <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>Deactivated</span>}
                </td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={() => onToggleActive(u.id)}>
                    {u.is_active ? <><XCircle size={14} /> Deactivate</> : <><CheckCircle size={14} /> Activate</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
