import React, { useState } from 'react';
import { Users, UserPlus, XCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface AdminUserManagementProps {
  users: any[];
  onCreateUser: (userData: any) => void;
  onToggleActive: (userId: any) => void;
}

export default function AdminUserManagement({ users, onCreateUser, onToggleActive }: AdminUserManagementProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '',
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onCreateUser(newUser);
    setNewUser({ name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '' });
    setShowCreateForm(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h2><Users size={20} color="var(--primary)" /> All Users ({users.length})</h2>
        <Button variant="primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          <UserPlus size={18} /> {showCreateForm ? 'Cancel' : 'Register New User'}
        </Button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="card glass-panel" style={{ padding: '1.5rem', marginBottom: 'var(--spacing-xl)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <Input label="Full Name *" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Role *</label>
            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'var(--card-bg)' }}>
              <option value="doctor">Doctor</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <Input label="Email *" type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="doctor@pulse.com" />
          </div>
          <div>
            <Input label="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
          </div>
          {newUser.role === 'doctor' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <Input label="Specialization" value={newUser.specialization} onChange={e => setNewUser({...newUser, specialization: e.target.value})} placeholder="e.g. Cardiology" />
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <Button type="submit" variant="primary" className="w-full"><UserPlus size={18} /> Create User</Button>
          </div>
        </form>
      )}

      <Card padding={false}>
        <table>
          <thead style={{ background: 'var(--bg-main)' }}>
            <tr>
              <th>ID</th><th>Name</th><th>Role</th><th>Email / Contact</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td>#{u.id}</td>
                <td style={{ fontWeight: 600 }}>{u.name}{u.specialization ? ` (${u.specialization})` : ''}</td>
                <td>
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                    background: u.role === 'doctor' ? 'var(--role-doctor-bg)' : u.role === 'admin' ? 'var(--role-admin-bg)' : u.role === 'patient' ? 'var(--role-patient-bg)' : 'var(--role-staff-bg)',
                    color: u.role === 'doctor' ? 'var(--role-doctor)' : u.role === 'admin' ? 'var(--role-admin)' : u.role === 'patient' ? 'var(--role-patient)' : 'var(--role-staff)'
                  }}>{u.role}</span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email || u.contact || '—'}</td>
                <td>
                  {u.is_active ? <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>Active</span>
                   : <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>Deactivated</span>}
                </td>
                <td>
                  <Button variant="secondary" size="sm" onClick={() => onToggleActive(u.id)}>
                    {u.is_active ? <><XCircle size={14} /> Deactivate</> : <><CheckCircle size={14} /> Activate</>}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
