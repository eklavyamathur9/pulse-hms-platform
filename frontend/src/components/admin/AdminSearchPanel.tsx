import type { AdminSearchResults } from '../../types/api';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface AdminSearchPanelProps {
  onSearch: (params: URLSearchParams) => void;
  results: AdminSearchResults | null;
}

export default function AdminSearchPanel({ onSearch, results }: AdminSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRole, setSearchRole] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (searchRole) params.append('role', searchRole);
    if (dateFrom) params.append('from', dateFrom);
    if (dateTo) params.append('to', dateTo);
    onSearch(params);
  };

  return (
    <>
      <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Search & Filters</h2>
      <Card className="glass-panel" padding={false}>
        <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2', minWidth: '200px' }}>
            <Input label="Search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Name, email, contact..." />
          </div>
          <div style={{ flex: '1', minWidth: '120px' }}>
            <label htmlFor="search-role" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Role</label>
            <select id="search-role" value={searchRole} onChange={e => setSearchRole(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'var(--card-bg)' }}>
              <option value="">All</option>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '120px' }}>
            <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div style={{ flex: '1', minWidth: '120px' }}>
            <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <Button variant="primary" onClick={handleSearch}>Search</Button>
        </div>
      </Card>

      {results && (
        <>
          {results.users?.length > 0 && (
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h3>Users ({results.users.length})</h3>
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '0.5rem' }}>
                <table>
                  <thead style={{ background: 'var(--bg-main)' }}><tr><th>ID</th><th>Name</th><th>Role</th><th>Contact</th></tr></thead>
                  <tbody>
                    {results.users.map((u: { id: number; name: string; role: string; email?: string; contact?: string }) => (
                      <tr key={u.id}><td>#{u.id}</td><td style={{ fontWeight: 600 }}>{u.name}</td><td>{u.role}</td><td style={{ color: 'var(--text-muted)' }}>{u.email || u.contact || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {results.appointments?.length > 0 && (
            <div>
              <h3>Appointments ({results.appointments.length})</h3>
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '0.5rem' }}>
                <table>
                  <thead style={{ background: 'var(--bg-main)' }}><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                  <tbody>
                    {results.appointments.map((a: { id: number; patient_name: string; doctor_name: string; date: string; time: string; status: string }) => (
                      <tr key={a.id}><td>#{a.id}</td><td>{a.patient_name}</td><td>{a.doctor_name}</td><td>{a.date}</td><td>{a.time}</td><td>{a.status}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {(!results.users?.length && !results.appointments?.length) && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No results found.</div>
          )}
        </>
      )}
    </>
  );
}
