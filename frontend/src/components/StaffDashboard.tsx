import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '../hooks/useApi';
import useSocketRefresh from '../hooks/useSocketRefresh';
import LabPanel from './staff/LabPanel';
import PharmacyPanel from './staff/PharmacyPanel';
import VitalsPanel from './staff/VitalsPanel';
import { sortQueue } from '../lib/utils';
import { DashboardSkeleton } from './common/Skeleton';
import type { QueueEntry, LabQueueEntry, PharmacyQueueEntry } from '../types/api';

export default function StaffDashboard() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>('vitals');
  const [vitalsForm, setVitalsForm] = useState<number | null>(null);
  const [vitalsData, setVitalsData] = useState<Record<string, string>>({ weight: '', hr: '', bp: '', temp: '' });
  const [labUploadForm, setLabUploadForm] = useState<number | null>(null);
  const [labResult, setLabResult] = useState('');

  const { data: queue = [], isLoading, error: queueError } = useApiQuery<QueueEntry[]>('staff-queue', '/hospital/queue', {
    transform: sortQueue, refetchInterval: 15_000,
  });
  const { data: labQueue = [], error: labError } = useApiQuery<LabQueueEntry[]>('staff-lab-queue', '/hospital/lab/queue');
  const { data: pharmacyQueue = [], error: pharmError } = useApiQuery<PharmacyQueueEntry[]>('staff-pharmacy-queue', '/hospital/pharmacy/queue');

  const fetchError = queueError || labError || pharmError;

  useSocketRefresh(socket, ['queue_updated', 'appointment_booked'], () => {
    queryClient.invalidateQueries({ queryKey: ['staff-queue'] });
    queryClient.invalidateQueries({ queryKey: ['staff-lab-queue'] });
    queryClient.invalidateQueries({ queryKey: ['staff-pharmacy-queue'] });
  });

  const submitVitals = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket && vitalsForm) {
      socket.emit('action_submit_vitals', {
        appointmentId: vitalsForm,
        ...vitalsData
      });
      setVitalsForm(null);
      setVitalsData({ weight: '', hr: '', bp: '', temp: '' });
    }
  };

  const submitLabReport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket && labUploadForm) {
      socket.emit('action_upload_test_report', {
        testId: labUploadForm,
        result_text: labResult
      });
      setLabUploadForm(null);
      setLabResult('');
    }
  };

  const dispenseMeds = (rxId: number) => {
    if (socket) socket.emit('action_dispense_meds', { prescriptionId: rxId });
  };

  if (fetchError) return <div style={{ padding: 'var(--spacing-lg)', color: 'var(--danger)' }}>Failed to load data: {fetchError.message}</div>;
  if (isLoading) return <DashboardSkeleton rows={3} />;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' } as React.CSSProperties}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--spacing-xl)', borderBottom: '1px solid var(--border-color)' } as React.CSSProperties}>
        <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'vitals' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'vitals' ? 700 : 500 } as React.CSSProperties} onClick={() => setTab('vitals')}>Vitals Pipeline</button>
        <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'labs' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'labs' ? 700 : 500 } as React.CSSProperties} onClick={() => setTab('labs')}>Laboratory Pipeline</button>
        <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'pharmacy' ? '3px solid var(--success)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'pharmacy' ? 700 : 500, color: tab === 'pharmacy' ? 'var(--success)' : 'inherit' } as React.CSSProperties} onClick={() => setTab('pharmacy')}>Pharmacy Desk</button>
      </div>

      {tab === 'vitals' && (
        <VitalsPanel
          queue={queue}
          vitalsForm={vitalsForm}
          vitalsData={vitalsData}
          onVitalsFormChange={setVitalsForm}
          onVitalsDataChange={setVitalsData}
          onSubmitVitals={submitVitals}
          onCancelVitals={() => { setVitalsForm(null); setVitalsData({ weight: '', hr: '', bp: '', temp: '' }); }}
        />
      )}

      {tab === 'labs' && (
        <LabPanel
          labQueue={labQueue}
          labUploadForm={labUploadForm}
          labResult={labResult}
          onLabUploadFormChange={setLabUploadForm}
          onLabResultChange={setLabResult}
          onSubmitLabReport={submitLabReport}
          onCancelLabUpload={() => { setLabUploadForm(null); setLabResult(''); }}
        />
      )}

      {tab === 'pharmacy' && (
        <PharmacyPanel
          pharmacyQueue={pharmacyQueue}
          onDispense={dispenseMeds}
        />
      )}
    </div>
  );
}
