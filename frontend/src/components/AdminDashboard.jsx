import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import { BarChart3, Users, Stethoscope, FlaskConical, Pill, DollarSign, TrendingUp, Activity, Star, UserPlus, Edit2, XCircle, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const inputStyle = { width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc' };

export default function AdminDashboard() {
  const socket = useSocket();
  const notify = useNotification();
  const [tab, setTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRole, setSearchRole] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/hospital/admin/analytics');
      const data = await res.json();
      setAnalytics(data);
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/admin/users');
      const data = await res.json();
      setAllUsers(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAnalytics(); fetchUsers(); }, []);

  useEffect(() => {
    if (socket) {
      socket.on('queue_updated', () => fetchAnalytics());
      socket.on('appointment_booked', () => fetchAnalytics());
    }

    return () => { if (socket) { socket.off('queue_updated'); socket.off('appointment_booked'); } };
  }, [socket]);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify.success(`${newUser.role} "${newUser.name}" registered successfully!`);
      setShowCreateForm(false);
      setNewUser({ name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '' });
      fetchUsers();
    } catch (err) { notify.error(err.message); }
  };

  const toggleActive = async (userId) => {
    try {
      await fetch(`http://localhost:5000/api/auth/admin/users/${userId}/deactivate`, { method: 'PUT' });
      notify.info("User status toggled.");
      fetchUsers();
    } catch (e) { notify.error("Failed to update user."); }
  };

  if (loading || !analytics) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Command Center...</div>;

  const barData = [
    { name: 'Active', value: analytics.appointments.active, fill: '#6366f1' },
    { name: 'Completed', value: analytics.appointments.completed, fill: '#22c55e' },
    { name: 'Cancelled', value: analytics.appointments.cancelled, fill: '#ef4444' },
  ];

  const inputStyle = { width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc' };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <BarChart3 color="var(--primary)" /> Hospital Command Center
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Real-time operational overview of Pulse Hospital</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--spacing-xl)', borderBottom: '1px solid #e2e8f0' }}>
        <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'analytics' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'analytics' ? 700 : 500 }} onClick={() => setTab('analytics')}>Analytics</button>
        <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'users' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'users' ? 700 : 500 }} onClick={() => setTab('users')}>User Management</button>
        <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'search' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'search' ? 700 : 500 }} onClick={() => setTab('search')}>Search & Filters</button>
      </div>

      {tab === 'analytics' && (
        <>
          {/* STAT CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: 'var(--spacing-xl)' }}>
            <StatCard icon={<Activity />} label="Lab Revenue" value={`₹${analytics.revenue}`} color="#22c55e" bg="#f0fdf4" />
            <StatCard icon={<Users />} label="Total Patients" value={analytics.users.patients} color="#6366f1" bg="#eef2ff" />
            <StatCard icon={<Stethoscope />} label="Appointments" value={analytics.appointments.total} color="#f59e0b" bg="#fffbeb" />
            <StatCard icon={<Star />} label="Avg Rating" value={`${analytics.avg_rating} ★`} color="#8b5cf6" bg="#faf5ff" />
            <StatCard icon={<Pill />} label="Rx Dispensed" value={`${analytics.prescriptions.dispensed}/${analytics.prescriptions.total}`} color="#059669" bg="#ecfdf5" />
          </div>

          {/* CHARTS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
            <div className="card glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
              <h3 style={{ marginBottom: '1rem' }}><Activity size={18} color="var(--primary)" /> Status Mix</h3>
              {analytics.status_breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={analytics.status_breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {analytics.status_breakdown.map((_, idx) => (<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No data yet.</div>}
            </div>
            <div className="card glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
              <h3 style={{ marginBottom: '1rem' }}><TrendingUp size={18} color="var(--primary)" /> Throughput</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" /><YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>{barData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {tab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h2><Users size={20} color="var(--primary)" /> All Users ({allUsers.length})</h2>
            <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
              <UserPlus size={18} /> {showCreateForm ? 'Cancel' : 'Register New User'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={createUser} className="card glass-panel" style={{ padding: '1.5rem', marginBottom: 'var(--spacing-xl)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                {allUsers.map(u => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                    <td>#{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}{u.specialization ? ` (${u.specialization})` : ''}</td>
                    <td><span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                      background: u.role === 'doctor' ? '#ecfdf5' : u.role === 'admin' ? '#fef2f2' : u.role === 'patient' ? '#eef2ff' : '#fffbeb',
                      color: u.role === 'doctor' ? '#059669' : u.role === 'admin' ? '#dc2626' : u.role === 'patient' ? '#6366f1' : '#d97706'
                    }}>{u.role}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email || u.contact || '—'}</td>
                    <td>
                      {u.is_active ? <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>Active</span>
                       : <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>Deactivated</span>}
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={() => toggleActive(u.id)}>
                        {u.is_active ? <><XCircle size={14} /> Deactivate</> : <><CheckCircle size={14} /> Activate</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'search' && (
        <>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>🔍 Search & Filters</h2>
          <div className="card glass-panel" style={{ padding: '1.5rem', marginBottom: 'var(--spacing-xl)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2', minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Search</label>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Name, email, contact..." style={inputStyle} />
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Role</label>
              <select value={searchRole} onChange={e => setSearchRole(e.target.value)} style={{...inputStyle, background: 'white'}}>
                <option value="">All</option>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
            </div>
            <button className="btn btn-primary" onClick={async () => {
              try {
                const params = new URLSearchParams();
                if (searchQuery) params.append('q', searchQuery);
                if (searchRole) params.append('role', searchRole);
                if (dateFrom) params.append('from', dateFrom);
                if (dateTo) params.append('to', dateTo);
                const res = await fetch(`http://localhost:5000/api/hospital/admin/search?${params}`);
                const data = await res.json();
                setSearchResults(data);
              } catch (e) { notify.error('Search failed.'); }
            }} style={{ padding: '0.6rem 1.5rem' }}>Search</button>
          </div>

          {searchResults && (
            <>
              {searchResults.users.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                  <h3>Users ({searchResults.users.length})</h3>
                  <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '0.5rem' }}>
                    <table>
                      <thead style={{ background: 'var(--bg-main)' }}><tr><th>ID</th><th>Name</th><th>Role</th><th>Contact</th></tr></thead>
                      <tbody>
                        {searchResults.users.map(u => (
                          <tr key={u.id}><td>#{u.id}</td><td style={{ fontWeight: 600 }}>{u.name}</td><td>{u.role}</td><td style={{ color: 'var(--text-muted)' }}>{u.email || u.contact || '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {searchResults.appointments.length > 0 && (
                <div>
                  <h3>Appointments ({searchResults.appointments.length})</h3>
                  <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '0.5rem' }}>
                    <table>
                      <thead style={{ background: 'var(--bg-main)' }}><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                      <tbody>
                        {searchResults.appointments.map(a => (
                          <tr key={a.id}><td>#{a.id}</td><td>{a.patient_name}</td><td>{a.doctor_name}</td><td>{a.date}</td><td>{a.time}</td><td>{a.status}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {searchResults.users.length === 0 && searchResults.appointments.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No results found.</div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="card" style={{ padding: '1.25rem', background: bg, border: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ color, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>{icon} {label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-dark)' }}>{value}</div>
    </div>
  );
}
