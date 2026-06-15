import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import { BarChart3, Users } from 'lucide-react';
import { apiFetch } from '../lib/api';
import AdminStatsCards from './admin/AdminStatsCards';
import AdminAnalyticsCharts from './admin/AdminAnalyticsCharts';
import AdminUserManagement from './admin/AdminUserManagement';
import AdminSearchPanel from './admin/AdminSearchPanel';

export default function AdminDashboard() {
  const socket = useSocket();
  const notify = useNotification();
  const [tab, setTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const res = await apiFetch('/hospital/admin/analytics');
      const data = await res.json();
      setAnalytics(data);
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/auth/admin/users');
      const data = await res.json();
      setAllUsers(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAnalytics(); fetchUsers(); }, []);

  useEffect(() => {
    if (socket) {
      socket.on('queue_updated', () => fetchAnalytics());
      socket.on('appointment_booked', () => fetchAnalytics());
      socket.on('payment_processed', () => fetchAnalytics());
    }
    return () => {
      if (socket) { socket.off('queue_updated'); socket.off('appointment_booked'); socket.off('payment_processed'); }
    };
  }, [socket]);

  const createUser = async (userData) => {
    try {
      const res = await apiFetch('/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify.success(`${userData.role} "${userData.name}" registered successfully!`);
      fetchUsers();
    } catch (err) { notify.error(err.message); }
  };

  const toggleActive = async (userId) => {
    try {
      await apiFetch(`/auth/admin/users/${userId}/deactivate`, { method: 'PUT' });
      notify.info("User status toggled.");
      fetchUsers();
    } catch (e) { notify.error("Failed to update user."); }
  };

  const handleSearch = async (params) => {
    try {
      const res = await apiFetch(`/hospital/admin/search?${params}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) { notify.error('Search failed.'); }
  };

  if (loading || !analytics) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Command Center...</div>;

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
          <AdminStatsCards analytics={analytics} />
          <AdminAnalyticsCharts analytics={analytics} />
        </>
      )}

      {tab === 'users' && (
        <AdminUserManagement
          users={allUsers}
          onCreateUser={createUser}
          onToggleActive={toggleActive}
        />
      )}

      {tab === 'search' && (
        <AdminSearchPanel onSearch={handleSearch} results={searchResults} />
      )}
    </div>
  );
}
