import React from 'react';
import { Activity, Clipboard, CheckCircle } from 'lucide-react';

interface VitalsPanelProps {
  queue: any[];
  vitalsForm: any;
  vitalsData: Record<string, string>;
  onVitalsFormChange: (id: any) => void;
  onVitalsDataChange: (data: Record<string, string>) => void;
  onSubmitVitals: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancelVitals: () => void;
}

export default function VitalsPanel({ queue, vitalsForm, vitalsData, onVitalsFormChange, onVitalsDataChange, onSubmitVitals, onCancelVitals }: VitalsPanelProps) {
  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}><Activity color="var(--primary)" /> Vitals Hub & Waitlist</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Monitor arrived patients and input their preliminary vitals.</p>

      {vitalsForm ? (
        <div className="card glass-panel" style={{ borderLeft: '4px solid var(--primary)', marginBottom: 'var(--spacing-xl)' }}>
          <h3>Input Vitals for Visit #{vitalsForm}</h3>
          <form onSubmit={onSubmitVitals} style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Weight (kg)</label>
              <input required type="text" value={vitalsData.weight} onChange={e => onVitalsDataChange({ ...vitalsData, weight: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} placeholder="e.g. 70" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Heart Rate (bpm)</label>
              <input required type="text" value={vitalsData.hr} onChange={e => onVitalsDataChange({ ...vitalsData, hr: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} placeholder="e.g. 75" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Blood Pressure (mmHg)</label>
              <input required type="text" value={vitalsData.bp} onChange={e => onVitalsDataChange({ ...vitalsData, bp: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} placeholder="e.g. 120/80" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Temperature (°F)</label>
              <input required type="text" value={vitalsData.temp} onChange={e => onVitalsDataChange({ ...vitalsData, temp: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} placeholder="e.g. 98.6" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary"><CheckCircle size={18} /> Submit Vitals</button>
              <button type="button" className="btn btn-secondary" onClick={onCancelVitals}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead style={{ background: 'var(--bg-main)' }}>
            <tr>
              <th>ID</th><th>Patient</th><th>Doctor Assigned</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map(q => (
              <tr key={q.id} style={{ background: q.pain_level >= 8 ? '#fef2f2' : 'transparent', borderLeft: q.pain_level >= 8 ? '4px solid var(--danger)' : 'none' }}>
                <td>#{q.id}</td>
                <td style={{ fontWeight: 500, color: q.pain_level >= 8 ? 'var(--danger)' : 'inherit' }}>
                  {q.patient_name}
                  {q.pain_level >= 8 && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'var(--danger)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>EMERGENCY</span>}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{q.doctor_name}</td>
                <td>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                    background: q.status === 'Arrived' ? 'var(--warning-bg)' : q.status === 'Vitals_Taken' ? 'var(--success-bg)' : 'var(--bg-main)',
                    color: q.status === 'Arrived' ? 'var(--warning)' : q.status === 'Vitals_Taken' ? 'var(--success)' : 'var(--text-muted)'
                  }}>
                    {q.status}
                  </span>
                </td>
                <td>
                  {q.status === 'Arrived' && !vitalsForm && (
                    <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => onVitalsFormChange(q.id)}>
                      <Clipboard size={16} /> Take Vitals
                    </button>
                  )}
                  {q.status === 'Vitals_Taken' && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}><CheckCircle size={16}/> Ready for Doctor</span>
                  )}
                  {q.status === 'Scheduled' && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Awaiting Arrival</span>
                  )}
                </td>
              </tr>
            ))}
            {queue.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No patients in queue today.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
