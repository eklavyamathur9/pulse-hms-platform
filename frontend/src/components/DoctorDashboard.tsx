import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '../stores/useNotificationStore';
import { apiFetch } from '../lib/api';
import { sortQueue } from '../lib/utils';
import { useApiQuery } from '../hooks/useApi';
import useSocketRefresh from '../hooks/useSocketRefresh';
import DoctorStatsCards from './doctor/DoctorStatsCards';
import DoctorQueuePanel from './doctor/DoctorQueuePanel';
import DoctorActivePatientPanel from './doctor/DoctorActivePatientPanel';
import { DashboardSkeleton } from './common/Skeleton';
import type { DoctorQueueEntry, DoctorStats, AdminUser } from '../types/api';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [activePatient, setActivePatient] = useState<DoctorQueueEntry | null>(null);
  const [testName, setTestName] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [followupDays, setFollowupDays] = useState<number>(0);
  const [isAvailable, setIsAvailable] = useState(true);

  const { data: queue = [], isLoading, error: queueError } = useApiQuery<DoctorQueueEntry[]>(
    ['doctor-queue', user!.id],
    `/hospital/doctor/${user!.id}/queue`,
    { transform: sortQueue, refetchInterval: 15_000 }
  );
  const { data: stats = { patients_today: 0, revenue: 0, rating: 0 }, error: statsError } = useApiQuery<DoctorStats>(
    ['doctor-stats', user!.id],
    `/hospital/doctor/${user!.id}/stats`
  );

  const fetchError = queueError || statsError;

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await apiFetch('/auth/admin/users');
      const users = await res.json();
      const me = (users as AdminUser[]).find((u: AdminUser) => u.id === user!.id);
      if (me) setIsAvailable(me.is_available);
    } catch (e) { console.error(e); }
  }, [user!.id]);

  React.useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

  useSocketRefresh(socket, ['queue_updated'], () => {
    queryClient.invalidateQueries({ queryKey: ['doctor-queue', user!.id] });
    queryClient.invalidateQueries({ queryKey: ['doctor-stats', user!.id] });
  });

  const prescribeTest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket && activePatient) {
      socket.emit('action_prescribe_test', {
        appointmentId: activePatient.id,
        test_name: testName
      });
      setTestName('');
      setActivePatient(null);
    }
  };

  const issuePrescription = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket && activePatient) {
      socket.emit('action_prescribe_meds', {
        appointmentId: activePatient.id,
        medication_details: prescriptionText,
        followup_days: followupDays > 0 ? followupDays : null
      });
      notify.success('Prescription issued & visit closed.');
      setPrescriptionText('');
      setFollowupDays(0);
      setActivePatient(null);
    }
  };

  const toggleAvailability = async () => {
    try {
      const res = await apiFetch(`/hospital/doctor/${user!.id}/availability`, { method: 'PUT' });
      const data = await res.json();
      setIsAvailable(data.is_available);
      notify.info(data.is_available ? 'You are now accepting patients.' : 'You are now marked unavailable.');
    } catch (e) { notify.error('Failed to toggle availability.'); }
  };

  const saveNotes = async (notes: string) => {
    if (!activePatient) return;
    try {
      await apiFetch(`/hospital/appointment/${activePatient.id}/notes`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      notify.info('Notes saved.');
    } catch(err) { console.error(err); }
  };

  if (fetchError) return <div style={{ padding: 'var(--spacing-lg)', color: 'var(--danger)' }}>Failed to load data: {fetchError.message}</div>;
  if (isLoading) return <DashboardSkeleton rows={3} />;

  return (
    <div className="animate-fade-in">
      <DoctorStatsCards stats={stats} />

      <div style={{ display: 'grid', gridTemplateColumns: activePatient ? '350px 1fr' : '1fr', gap: 'var(--spacing-xl)', alignItems: 'start' } as React.CSSProperties}>
        <DoctorQueuePanel
          queue={queue}
          activePatient={activePatient}
          onSelectPatient={setActivePatient}
          isAvailable={isAvailable}
          onToggleAvailability={toggleAvailability}
        />

        {activePatient && (
          <DoctorActivePatientPanel
            patient={activePatient}
            onClose={() => setActivePatient(null)}
            testName={testName}
            onTestNameChange={setTestName}
            prescriptionText={prescriptionText}
            onPrescriptionTextChange={setPrescriptionText}
            followupDays={followupDays}
            onFollowupDaysChange={setFollowupDays}
            onPrescribeTest={prescribeTest}
            onIssuePrescription={issuePrescription}
            onNotesSave={saveNotes}
          />
        )}
      </div>
    </div>
  );
}
