import React, { useState } from 'react';
import {
  Activity, Building, Users, CreditCard, CheckCircle, XCircle,
  Shield, Plus, Edit2, Search,
  BarChart3, Stethoscope, DollarSign, UserPlus,
  Eye, ArrowLeft,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '../stores/useNotificationStore';
import { apiFetch } from '../lib/api';
import { useApiQuery, useApiMutation } from '../hooks/useApi';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import StatCard from './common/StatCard';
import { DashboardSkeleton } from './common/Skeleton';

const PLANS = ['trial', 'basic', 'pro', 'enterprise'];
const PLAN_COLORS: Record<string, string> = { trial: '#9ca3af', basic: '#3b82f6', pro: '#7c3aed', enterprise: '#059669' };
const ROLE_OPTIONS = ['doctor', 'staff', 'admin', 'patient'];
const ROLE_COLORS: Record<string, string> = {
  doctor: '#059669', staff: '#d97706', admin: '#dc2626', patient: '#6366f1', superadmin: '#7c3aed',
};
const ROLE_BGS: Record<string, string> = {
  doctor: '#ecfdf5', staff: '#fffbeb', admin: '#fef2f2', patient: '#eef2ff', superadmin: '#f3e8ff',
};


interface OverviewTabProps {
  stats: Record<string, any>;
  hospitals: any[];
}

function OverviewTab({ stats, hospitals }: OverviewTabProps) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: 'var(--spacing-xl)' }}>
        <StatCard icon={<Building />} label="Total Hospitals" value={stats.hospitals.total} color="#7c3aed" bg="#f3e8ff" />
        <StatCard icon={<CheckCircle />} label="Active Tenants" value={stats.hospitals.active} color="#059669" bg="#ecfdf5" />
        <StatCard icon={<Users />} label="Total Users" value={stats.users.total} color="#6366f1" bg="#eef2ff" />
        <StatCard icon={<BarChart3 />} label="Appointments" value={stats.appointments.total} color="#f59e0b" bg="#fffbeb" />
        <StatCard icon={<DollarSign />} label="Total Revenue" value={`$${stats.revenue.total.toLocaleString()}`} color="#16a34a" bg="#f0fdf4" />
        <StatCard icon={<CreditCard />} label="Paid Invoices" value={`${stats.revenue.paid_invoices}/${stats.revenue.total_invoices}`} color="#8b5cf6" bg="#faf5ff" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
        <Card className="glass-panel" padding={false}>
          <div style={{ padding: 'var(--spacing-xl)' }}>
          <h3 style={{ marginBottom: '1rem' }}><Users size={18} color="#7c3aed" /> Users by Role</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(stats.users).filter(([k]) => k !== 'total').map(([role, count]) => (
              <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{role}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginLeft: '1rem' }}>
                  <div style={{ flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${stats.users.total > 0 ? ((count as number) / stats.users.total) * 100 : 0}%`, height: '100%', background: ROLE_COLORS[role] || '#7c3aed', borderRadius: '4px' }} />
                  </div>
                </div>
                <span style={{ fontWeight: 700, color: ROLE_COLORS[role] || '#7c3aed' }}>{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

        <Card className="glass-panel" padding={false}>
          <div style={{ padding: 'var(--spacing-xl)' }}>
          <h3 style={{ marginBottom: '1rem' }}><Building size={18} color="#7c3aed" /> Hospitals by Plan</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {PLANS.map(plan => {
              const count = hospitals.filter(h => h.plan === plan).length;
              const pct = hospitals.length > 0 ? (count / hospitals.length) * 100 : 0;
              return (
                <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{plan}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginLeft: '1rem' }}>
                    <div style={{ flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: PLAN_COLORS[plan], borderRadius: '4px' }} />
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: PLAN_COLORS[plan] }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      </div>

      <Card className="glass-panel" padding={false}>
        <div style={{ padding: 'var(--spacing-xl)', marginTop: 'var(--spacing-xl)' }}>
        <h3 style={{ marginBottom: '1rem' }}><Activity size={18} color="#7c3aed" /> Platform Activity</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Rate</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.hospitals.total > 0 ? Math.round((stats.hospitals.active / stats.hospitals.total) * 100) : 0}%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Avg Users / Hospital</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.hospitals.total > 0 ? (stats.users.total / stats.hospitals.total).toFixed(0) : 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Avg Revenue / Hospital</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${stats.hospitals.total > 0 ? (stats.revenue.total / stats.hospitals.total).toFixed(0) : 0}</div>
          </div>
        </div>
      </div>
      </Card>
    </>
  );
}

interface HospitalDetailTabProps {
  hospital: any;
  users: any[];
  onBack: () => void;
  onUserCreated: () => void;
}

function HospitalDetailTab({ hospital, users, onBack, onUserCreated }: HospitalDetailTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState<Record<string, string>>({ name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '' });

  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/auth/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, hospital_id: hospital.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify.success(`User "${newUser.name}" created`);
      setShowCreate(false);
      setNewUser({ name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '' });
      onUserCreated();
    } catch (err: any) { notify.error(err.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-lg)' }}>
        <Button variant="secondary" size="sm" onClick={onBack}><ArrowLeft size={16} /></Button>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building size={20} color="#7c3aed" /> {hospital.name}
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: `${PLAN_COLORS[hospital.plan]}20`, color: PLAN_COLORS[hospital.plan] }}>{hospital.plan}</span>
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: 'var(--spacing-xl)' }}>
        <Card className="text-center" padding={false}><div style={{ padding: '1rem' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doctors</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{hospital.stats?.doctors || 0}</div></div></Card>
        <Card className="text-center" padding={false}><div style={{ padding: '1rem' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patients</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>{hospital.stats?.patients || 0}</div></div></Card>
        <Card className="text-center" padding={false}><div style={{ padding: '1rem' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Appointments</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{hospital.stats?.appointments || 0}</div></div></Card>
        <Card className="text-center" padding={false}><div style={{ padding: '1rem' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Revenue</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>${(hospital.stats?.revenue || 0).toFixed(0)}</div></div></Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <h3><Users size={18} color="#7c3aed" /> Users ({users.length})</h3>
        <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus size={16} /> {showCreate ? 'Cancel' : 'Create User'}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={createUser} className="card glass-panel" style={{ padding: '1.5rem', marginBottom: 'var(--spacing-xl)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input placeholder="Name" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
          <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'white' }}>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <Input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
          <Input placeholder="Contact" value={newUser.contact} onChange={e => setNewUser({...newUser, contact: e.target.value})} />
          {newUser.role === 'doctor' && (
            <div style={{ gridColumn: '1 / -1' }}><Input placeholder="Specialization" value={newUser.specialization} onChange={e => setNewUser({...newUser, specialization: e.target.value})} /></div>
          )}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
            <Button type="submit" variant="primary">Create</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <Card padding={false}>
        <table>
          <thead style={{ background: 'var(--bg-main)' }}>
            <tr><th>ID</th><th>Name</th><th>Role</th><th>Email / Contact</th><th>Status</th></tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No users in this hospital.</td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td>#{u.id}</td>
                <td style={{ fontWeight: 600 }}>{u.name}{u.specialization ? ` (${u.specialization})` : ''}</td>
                <td><span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', background: ROLE_BGS[u.role] || '#f3f4f6', color: ROLE_COLORS[u.role] || '#374151' }}>{u.role}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email || u.contact || '—'}</td>
                <td>{u.is_active ? <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>Active</span> : <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.85rem' }}>Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>('overview');
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [hospitalUsers, setHospitalUsers] = useState<any[]>([]);
  const [showCreateHospital, setShowCreateHospital] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const [newHospital, setNewHospital] = useState<Record<string, string>>({
    name: '', subdomain: '', plan: 'trial', admin_name: '', admin_email: '', admin_password: '',
  });
  const [newUser, setNewUser] = useState<Record<string, string>>({
    name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '', hospital_id: '',
  });

  const { data: stats, isLoading, error: statsError } = useApiQuery<Record<string, any>>('superadmin-stats', '/superadmin/stats');
  const { data: hospitals = [], error: hospitalsError } = useApiQuery<any[]>('superadmin-hospitals', '/superadmin/hospitals');

  const fetchError = statsError || hospitalsError;

  const createHospitalMutation = useApiMutation('/superadmin/hospitals', 'POST', {
    invalidateKeys: ['superadmin-hospitals', 'superadmin-stats'],
  });

  const fetchHospitalUsers = async (hospitalId: number) => {
    try {
      const res = await apiFetch(`/superadmin/hospitals/${hospitalId}/users`);
      return await res.json() as any[];
    } catch { return []; }
  };

  const createHospital = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createHospitalMutation.mutate(newHospital, {
      onSuccess: () => {
        notify.success('Hospital created!');
        setShowCreateHospital(false);
        setNewHospital({ name: '', subdomain: '', plan: 'trial', admin_name: '', admin_email: '', admin_password: '' });
      },
    });
  };

  const updateHospital = async (id: number, updates: Record<string, any>) => {
    try {
      const res = await apiFetch(`/superadmin/hospitals/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify.success('Hospital updated');
      queryClient.invalidateQueries({ queryKey: ['superadmin-hospitals'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
    } catch (err: any) { notify.error(err.message); }
  };

  const toggleHospitalStatus = async (id: number, currentStatus: boolean) => {
    await updateHospital(id, { is_active: !currentStatus });
  };

  const changePlan = async (id: number, plan: string) => {
    await updateHospital(id, { plan });
    setEditingPlan(null);
  };

  const viewHospitalUsers = async (hospital: any) => {
    setSelectedHospital(hospital);
    const users = await fetchHospitalUsers(hospital.id);
    setHospitalUsers(users);
  };

  const createUserInHospital = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const hospitalId = newUser.hospital_id || selectedHospital?.id;
      if (!hospitalId) { notify.error('Select a hospital first'); return; }
      const res = await apiFetch('/auth/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, hospital_id: parseInt(hospitalId as string) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify.success(`User "${newUser.name}" created`);
      setShowCreateUser(false);
      setNewUser({ name: '', email: '', contact: '', password: 'changeme', role: 'doctor', specialization: '', hospital_id: '' });
      const users = await fetchHospitalUsers(selectedHospital.id);
      setHospitalUsers(users);
    } catch (err: any) { notify.error(err.message); }
  };

  const filteredHospitals = hospitals.filter((h: any) => {
    if (searchQuery && !h.name.toLowerCase().includes(searchQuery.toLowerCase()) && !h.subdomain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (planFilter && h.plan !== planFilter) return false;
    return true;
  });

  if (fetchError) return <div style={{ padding: 'var(--spacing-lg)', color: 'var(--danger)' }}>Failed to load data: {fetchError.message}</div>;
  if (isLoading) return <DashboardSkeleton />;
  if (!stats) return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' } as React.CSSProperties}>
          <Shield color="#7c3aed" /> SaaS Super Admin Platform
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Multi-tenant platform management and monitoring</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--spacing-xl)', borderBottom: '1px solid #e2e8f0' } as React.CSSProperties}>
        {['overview', 'hospitals', 'users'].map(t => (
          <button key={t} className="btn" style={{
            padding: '0.5rem 1rem', background: 'none',
            borderBottom: tab === t ? '3px solid #7c3aed' : '3px solid transparent',
            borderRadius: 0, fontWeight: tab === t ? 700 : 500, textTransform: 'capitalize',
          } as React.CSSProperties} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && !selectedHospital && <OverviewTab stats={stats} hospitals={hospitals} />}
      {tab === 'overview' && selectedHospital && <HospitalDetailTab
        hospital={selectedHospital}
        users={hospitalUsers}
        onBack={() => setSelectedHospital(null)}
        onUserCreated={() => {
          fetchHospitalUsers(selectedHospital.id).then(setHospitalUsers);
        }}
      />}

      {tab === 'hospitals' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' } as React.CSSProperties} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search hospitals..." style={{ width: '100%', padding: '0.6rem', paddingLeft: '2rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} />
              </div>
              <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={{ width: '140px', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'white' }}>
                <option value="">All Plans</option>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Button variant="primary" onClick={() => setShowCreateHospital(true)}>
              <Plus size={16} /> New Hospital
            </Button>
          </div>

          {showCreateHospital && (
            <form onSubmit={createHospital} className="card glass-panel" style={{ padding: '1.5rem', marginBottom: 'var(--spacing-xl)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <Input label="Hospital Name *" required value={newHospital.name} onChange={e => setNewHospital({...newHospital, name: e.target.value})} />
              </div>
              <div>
                <Input label="Subdomain *" required value={newHospital.subdomain} onChange={e => setNewHospital({...newHospital, subdomain: e.target.value})} placeholder="myhospital" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Plan</label>
                <select value={newHospital.plan} onChange={e => setNewHospital({...newHospital, plan: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'white' }}>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Input label="Admin Name *" required value={newHospital.admin_name} onChange={e => setNewHospital({...newHospital, admin_name: e.target.value})} />
              </div>
              <div>
                <Input label="Admin Email *" type="email" required value={newHospital.admin_email} onChange={e => setNewHospital({...newHospital, admin_email: e.target.value})} />
              </div>
              <div>
                <Input label="Admin Password *" type="password" required value={newHospital.admin_password} onChange={e => setNewHospital({...newHospital, admin_password: e.target.value})} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                <Button type="submit" variant="primary"><Plus size={16} /> Create Hospital</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreateHospital(false)}>Cancel</Button>
              </div>
            </form>
          )}

          <Card padding={false}>
            <table>
              <thead style={{ background: 'var(--bg-main)' }}>
                <tr>
                  <th>Hospital</th><th>Subdomain</th><th>Plan</th><th>Status</th><th>Users</th><th>Appts</th><th>Revenue</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHospitals.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hospitals found.</td></tr>
                ) : filteredHospitals.map((h: any) => (
                  <tr key={h.id} style={{ opacity: h.is_active ? 1 : 0.5 }}>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{h.subdomain}.pulsehms.com</td>
                      <td>
                        {editingPlan === h.id ? (
                          <select value={h.plan} onChange={e => changePlan(h.id, e.target.value)}
                            onBlur={() => setEditingPlan(null)} style={{ width: '120px', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'white' }} autoFocus>
                            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <span onClick={() => setEditingPlan(h.id)} style={{ cursor: 'pointer', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', background: `${PLAN_COLORS[h.plan]}20`, color: PLAN_COLORS[h.plan] }}>
                            {h.plan} <Edit2 size={12} style={{ marginLeft: '0.25rem', opacity: 0.5 }} />
                          </span>
                        )}
                      </td>
                      <td>
                        {h.is_active ? (
                          <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' } as React.CSSProperties}><CheckCircle size={14} /> Active</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' } as React.CSSProperties}><XCircle size={14} /> Suspended</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{h.stats?.total_users || 0}</td>
                      <td style={{ fontSize: '0.85rem' }}>{h.stats?.appointments || 0}</td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>${(h.stats?.revenue || 0).toFixed(0)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <Button variant="secondary" size="sm"
                            onClick={() => viewHospitalUsers(h)}><Eye size={14} /> View</Button>
                          <Button variant="secondary" size="sm"
                            onClick={() => toggleHospitalStatus(h.id, h.is_active)}>
                            {h.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <div>
          {!selectedHospital ? (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>Select a hospital to view and manage its users.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {hospitals.filter((h: any) => h.is_active).map((h: any) => (
                  <Card key={h.id} style={{ cursor: 'pointer' }}
                    onClick={() => viewHospitalUsers(h)}>
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{h.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{h.subdomain}.pulsehms.com</div>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <span><Users size={14} /> {h.stats?.total_users || 0} users</span>
                      <span><Stethoscope size={14} /> {h.stats?.doctors || 0} doctors</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Button variant="secondary" size="sm" onClick={() => { setSelectedHospital(null); setHospitalUsers([]); }}>
                    <ArrowLeft size={16} />
                  </Button>
                  <h2 style={{ margin: 0 }}><Building size={20} color="#7c3aed" /> {selectedHospital.name}</h2>
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: `${PLAN_COLORS[selectedHospital.plan]}20`, color: PLAN_COLORS[selectedHospital.plan] }}>{selectedHospital.plan}</span>
                </div>
                <Button variant="primary" onClick={() => setShowCreateUser(true)}>
                  <UserPlus size={16} /> Create User
                </Button>
              </div>

              {showCreateUser && (
                <form onSubmit={createUserInHospital} className="card glass-panel" style={{ padding: '1.5rem', marginBottom: 'var(--spacing-xl)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <Input label="Name *" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Role *</label>
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'white' }}>
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <Input label="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                  </div>
                  <div>
                    <Input label="Contact" value={newUser.contact} onChange={e => setNewUser({...newUser, contact: e.target.value})} />
                  </div>
                  {newUser.role === 'doctor' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Input label="Specialization" value={newUser.specialization} onChange={e => setNewUser({...newUser, specialization: e.target.value})} />
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                    <Button type="submit" variant="primary"><UserPlus size={16} /> Create User</Button>
                    <Button type="button" variant="secondary" onClick={() => setShowCreateUser(false)}>Cancel</Button>
                  </div>
                </form>
              )}

              <Card padding={false}>
                <table>
                  <thead style={{ background: 'var(--bg-main)' }}>
                    <tr><th>ID</th><th>Name</th><th>Role</th><th>Email / Contact</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {hospitalUsers.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No users in this hospital.</td></tr>
                    ) : hospitalUsers.map((u: any) => (
                      <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                        <td>#{u.id}</td>
                        <td style={{ fontWeight: 600 }}>{u.name}{u.specialization ? ` (${u.specialization})` : ''}</td>
                        <td>
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', background: ROLE_BGS[u.role] || '#f3f4f6', color: ROLE_COLORS[u.role] || '#374151' }}>{u.role}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email || u.contact || '—'}</td>
                        <td>{u.is_active ? <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>Active</span> : <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.85rem' }}>Inactive</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
