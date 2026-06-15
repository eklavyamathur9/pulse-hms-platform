import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../lib/api';
import VitalsPanel from './staff/VitalsPanel';
import LabPanel from './staff/LabPanel';
import PharmacyPanel from './staff/PharmacyPanel';

export default function StaffDashboard() {
  const socket = useSocket();
  const [tab, setTab] = useState('vitals');
  const [queue, setQueue] = useState([]);
  const [labQueue, setLabQueue] = useState([]);
  const [pharmacyQueue, setPharmacyQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vitalsForm, setVitalsForm] = useState(null);
  const [vitalsData, setVitalsData] = useState({ weight: '', hr: '', bp: '', temp: '' });
  const [labUploadForm, setLabUploadForm] = useState(null);
  const [labResult, setLabResult] = useState('');

  const fetchQueue = async () => {
    try {
      const res = await apiFetch('/hospital/queue');
      const data = await res.json();
      const sortedQueue = data.sort((a,b) => (b.pain_level >= 8 ? 1 : 0) - (a.pain_level >= 8 ? 1 : 0));
      setQueue(sortedQueue);

      const labRes = await apiFetch('/hospital/lab/queue');
      const labData = await labRes.json();
      setLabQueue(labData);

      const rxRes = await apiFetch('/hospital/pharmacy/queue');
      const rxData = await rxRes.json();
      setPharmacyQueue(rxData);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('queue_updated', () => fetchQueue());
      socket.on('appointment_booked', () => fetchQueue());
    }
    return () => {
      if (socket) {
        socket.off('queue_updated');
        socket.off('appointment_booked');
      }
    };
  }, [socket]);

  const submitVitals = (e) => {
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

  const submitLabReport = (e) => {
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

  const dispenseMeds = (rxId) => {
    if (socket) socket.emit('action_dispense_meds', { prescriptionId: rxId });
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Staff Hub...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--spacing-xl)', borderBottom: '1px solid #e2e8f0' }}>
        <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'vitals' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'vitals' ? 700 : 500 }} onClick={() => setTab('vitals')}>Vitals Pipeline</button>
        <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'labs' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'labs' ? 700 : 500 }} onClick={() => setTab('labs')}>Laboratory Pipeline</button>
        <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'pharmacy' ? '3px solid var(--success)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'pharmacy' ? 700 : 500, color: tab === 'pharmacy' ? 'var(--success)' : 'inherit' }} onClick={() => setTab('pharmacy')}>Pharmacy Desk</button>
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
