import React from 'react';
import { Activity, Clipboard, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import type { QueueEntry } from '../../types/api';

interface VitalsPanelProps {
  queue: QueueEntry[];
  vitalsForm: number | null;
  vitalsData: Record<string, string>;
  onVitalsFormChange: (id: number) => void;
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
        <Card className="glass-panel mb-6" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3>Input Vitals for Visit #{vitalsForm}</h3>
          <form onSubmit={onSubmitVitals} style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Weight (kg)" required placeholder="e.g. 70" value={vitalsData.weight} onChange={e => onVitalsDataChange({ ...vitalsData, weight: e.target.value })} />
            <Input label="Heart Rate (bpm)" required placeholder="e.g. 75" value={vitalsData.hr} onChange={e => onVitalsDataChange({ ...vitalsData, hr: e.target.value })} />
            <Input label="Blood Pressure (mmHg)" required placeholder="e.g. 120/80" value={vitalsData.bp} onChange={e => onVitalsDataChange({ ...vitalsData, bp: e.target.value })} />
            <Input label="Temperature (°F)" required placeholder="e.g. 98.6" value={vitalsData.temp} onChange={e => onVitalsDataChange({ ...vitalsData, temp: e.target.value })} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary"><CheckCircle size={18} /> Submit Vitals</Button>
              <Button type="button" variant="secondary" onClick={onCancelVitals}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card padding={false}>
        <table>
          <thead style={{ background: 'var(--bg-main)' }}>
            <tr>
              <th>ID</th><th>Patient</th><th>Doctor Assigned</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map(q => (
              <tr key={q.id} style={{ background: q.pain_level >= 8 ? 'var(--danger-bg)' : 'transparent', borderLeft: q.pain_level >= 8 ? '4px solid var(--danger)' : 'none' }}>
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
                    <Button variant="primary" size="sm" onClick={() => onVitalsFormChange(q.id)}>
                      <Clipboard size={16} /> Take Vitals
                    </Button>
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
      </Card>
    </>
  );
}
