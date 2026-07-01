import React, { useState, useCallback, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { notify } from '../stores/useNotificationStore';
import { apiFetch } from '../lib/api';
import { useApiQuery, useApiMutation } from '../hooks/useApi';
import useSocketRefresh from '../hooks/useSocketRefresh';
import AdminStatsCards from './admin/AdminStatsCards';
import AdminAnalyticsCharts from './admin/AdminAnalyticsCharts';
import AdminUserManagement from './admin/AdminUserManagement';
import AdminSearchPanel from './admin/AdminSearchPanel';
import AdminDeveloperPortal from './admin/AdminDeveloperPortal';
import { DashboardSkeleton } from './common/Skeleton';
import type { AdminAnalytics, AdminUser, AdminSearchResults, CreateUserPayload } from '../types/api';

export default function AdminDashboard() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>('analytics');
  const adminTabs = useMemo(() => ['analytics', 'users', 'search', 'developer'], []);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); const next = (idx + 1) % adminTabs.length; setTab(adminTabs[next]); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); const prev = (idx - 1 + adminTabs.length) % adminTabs.length; setTab(adminTabs[prev]); }
  }, [adminTabs]);
  const [searchResults, setSearchResults] = useState<AdminSearchResults | null>(null);

  const { data: analytics, isLoading, error: analyticsError } = useApiQuery<AdminAnalytics>('admin-analytics', '/hospital/admin/analytics', {
    refetchInterval: 30_000,
  });
  const { data: allUsers = [], error: usersError } = useApiQuery<AdminUser[]>('admin-users', '/auth/admin/users');

  const fetchError = analyticsError || usersError;

  useSocketRefresh(socket, ['queue_updated', 'appointment_booked', 'payment_processed'], () => {
    queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
  });

  const createUserMutation = useApiMutation('/auth/admin/users', 'POST', {
    successMessage: 'User registered successfully!',
    invalidateKeys: ['admin-users'],
  });

  const toggleActive = async (userId: number) => {
    try {
      await apiFetch(`/auth/admin/users/${userId}/deactivate`, { method: 'PUT' });
      notify.info('User status toggled.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e) { notify.error('Failed to update user.'); }
  };

  const handleSearch = async (params: URLSearchParams) => {
    try {
      const res = await apiFetch(`/hospital/admin/search?${params}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) { notify.error('Search failed.'); }
  };

  if (fetchError) return <div role="alert" style={{ padding: 'var(--spacing-lg)', color: 'var(--danger)' }}>Failed to load data: {fetchError.message}</div>;
  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto' } as React.CSSProperties}>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' } as React.CSSProperties}>
          <BarChart3 color="var(--primary)" /> Hospital Command Center
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Real-time operational overview of Pulse Hospital</p>
      </div>

      <div role="tablist" aria-label="Admin dashboard sections" style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--spacing-xl)', borderBottom: '1px solid var(--border-color)' } as React.CSSProperties}>
        {adminTabs.map((t, idx) => (
          <button key={t} role="tab" aria-selected={tab === t} tabIndex={tab === t ? 0 : -1}
            className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === t ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === t ? 700 : 500 } as React.CSSProperties}
            onClick={() => setTab(t)} onKeyDown={(e) => handleTabKeyDown(e, idx)}>
            {t === 'developer' ? 'Developer' : t === 'search' ? 'Search & Filters' : t === 'users' ? 'User Management' : 'Analytics'}
          </button>
        ))}
      </div>

      {tab === 'analytics' && analytics && (
        <>
          <AdminStatsCards analytics={analytics} />
          <AdminAnalyticsCharts analytics={analytics} />
        </>
      )}

      {tab === 'users' && (
        <AdminUserManagement
          users={allUsers}
          onCreateUser={(userData: CreateUserPayload) => createUserMutation.mutate(userData)}
          onToggleActive={toggleActive}
        />
      )}

      {tab === 'search' && (
        <AdminSearchPanel onSearch={handleSearch} results={searchResults} />
      )}

      {tab === 'developer' && (
        <AdminDeveloperPortal />
      )}
    </div>
  );
}
