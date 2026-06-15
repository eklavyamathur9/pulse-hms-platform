import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import { User } from 'lucide-react';
import { apiFetch } from '../lib/api';
import DoctorStatsCards from './doctor/DoctorStatsCards';
import DoctorQueuePanel from './doctor/DoctorQueuePanel';
import DoctorActivePatientPanel from './doctor/DoctorActivePatientPanel';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const notify = useNotification();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePatient, setActivePatient] = useState(null);
  const [testName, setTestName] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [followupDays, setFollowupDays] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [stats, setStats] = useState({ patients_today: 0, revenue: 0, rating: 0 });

  const fetchQueue = useCallback(async () => {
    try {
      const res = await apiFetch(`/hospital/doctor/${user.id}/queue`);
      const data = await res.json();
      const sortedQueue = data.sort((a,b) => (b.pain_level >= 8 ? 1 : 0) - (a.pain_level >= 8 ? 1 : 0));
      setQueue(sortedQueue);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [user.id]);

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await apiFetch('/auth/admin/users');
      const users = await res.json();
      const me = users.find(u => u.id === user.id);
      if (me) setIsAvailable(me.is_available);
    } catch (e) { console.error(e); }
  }, [user.id]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch(`/hospital/doctor/${user.id}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
  }, [user.id]);

  useEffect(() => {
    fetchQueue();
    fetchAvailability();
    fetchStats();
  }, [fetchAvailability, fetchQueue, fetchStats]);

  useEffect(() => {
    if (socket) {
      socket.on('queue_updated', () => {
        fetchQueue();
        fetchStats();
      });
    }
    return () => {
      if (socket) socket.off('queue_updated');
    };
  }, [fetchQueue, fetchStats, socket]);

  const prescribeTest = (e) => {
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

  const issuePrescription = (e) => {
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
      const res = await apiFetch(`/hospital/doctor/${user.id}/availability`, { method: 'PUT' });
      const data = await res.json();
      setIsAvailable(data.is_available);
      notify.info(data.is_available ? 'You are now accepting patients.' : 'You are now marked unavailable.');
    } catch (e) { notify.error('Failed to toggle availability.'); }
  };

  const saveNotes = async (notes) => {
    if (!activePatient) return;
    try {
      await apiFetch(`/hospital/appointment/${activePatient.id}/notes`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      notify.info('Notes saved.');
    } catch(err) { console.error(err); }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Doctor Hub...</div>;

  return (
    <div className="animate-fade-in">
      <DoctorStatsCards stats={stats} />

      <div style={{ display: 'grid', gridTemplateColumns: activePatient ? '350px 1fr' : '1fr', gap: 'var(--spacing-xl)', alignItems: 'start' }}>
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
