import React from 'react';
import { Activity, User, FileText, AlertCircle } from 'lucide-react';

interface DoctorActivePatientPanelProps {
  patient: any;
  onClose: () => void;
  testName: string;
  onTestNameChange: (val: string) => void;
  prescriptionText: string;
  onPrescriptionTextChange: (val: string) => void;
  followupDays: number;
  onFollowupDaysChange: (val: number) => void;
  onPrescribeTest: (e: React.FormEvent<HTMLFormElement>) => void;
  onIssuePrescription: (e: React.FormEvent<HTMLFormElement>) => void;
  onNotesSave: (notes: string) => void;
}

export default function DoctorActivePatientPanel({ patient, onClose, testName, onTestNameChange, prescriptionText, onPrescriptionTextChange, followupDays, onFollowupDaysChange, onPrescribeTest, onIssuePrescription, onNotesSave }: DoctorActivePatientPanelProps) {
  return (
    <div className="card glass-panel animate-fade-in" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-dark)' }}>{patient.patient_name}</h2>
          <p style={{ color: 'var(--text-muted)' }}>Age: {patient.patient_age} • Visit #{patient.id}</p>
        </div>
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>

      {patient.vitals ? (
        <>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} color="var(--primary)" /> Fresh Vitals</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: 'var(--spacing-xl)' }}>
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Weight</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-dark)' }}>{patient.vitals.weight} <span style={{fontSize: '0.8rem'}}>kg</span></div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Heart Rate</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--danger)' }}>{patient.vitals.hr} <span style={{fontSize: '0.8rem'}}>bpm</span></div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Blood Pressure</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary)' }}>{patient.vitals.bp}</div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Temp</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--warning)' }}>{patient.vitals.temp} <span style={{fontSize: '0.8rem'}}>°F</span></div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: '1rem', background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-xl)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> Vitals have not been recorded by staff yet.
        </div>
      )}

      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={18} color="var(--primary)" /> Medical Demographics & Symptoms</h3>
        <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-dark)' }}>Primary Symptoms</h4>
          <div style={{ fontStyle: 'italic', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>"{patient.symptoms || 'Standard checkup'}"</div>
          <div style={{ fontWeight: 600, color: patient.pain_level > 6 ? 'var(--danger)' : 'var(--warning)' }}>Pain Level: {patient.pain_level || 0}/10</div>
        </div>
        <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div><strong>Height:</strong> {patient.patient_height || 'N/A'}</div>
          <div><strong>Base Weight:</strong> {patient.patient_weight_baseline || 'N/A'}</div>
          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--danger)' }}>
            <strong>Allergies:</strong> {patient.patient_allergies || 'None reported'}
          </div>
        </div>
      </div>

      {patient.lab_tests?.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--primary)" /> Laboratory Tests</h3>
          {patient.lab_tests.map((test: any, idx: number) => (
            <div key={idx} style={{ background: 'var(--success-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.2rem' }}>{test.test_name}</div>
              {test.status === 'Completed' ? (
                <div style={{ fontSize: '0.9rem' }}>Result: {test.result_text}</div>
              ) : (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Status: {test.status}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} color="var(--primary)" /> Consultation Actions</h3>
      <div style={{ background: 'var(--bg-main)', padding: '2rem', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Clinical Notes (Private)</h4>
        <textarea
          placeholder="Internal observations, differential diagnosis, exam findings..."
          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)', minHeight: '70px', marginBottom: '0.75rem' }}
          onBlur={(e) => onNotesSave(e.target.value)}
        />

        <hr style={{ border: 0, height: '1px', background: 'var(--border-color)', marginBottom: '1.5rem' }} />

        <h4 style={{ marginBottom: '1rem' }}>Order Laboratory Test</h4>
        <form onSubmit={onPrescribeTest} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <input type="text" required placeholder="e.g. Complete Blood Count (CBC)" value={testName} onChange={e => onTestNameChange(e.target.value)} style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} />
          <button type="submit" className="btn btn-secondary">Send to Lab Pipeline</button>
        </form>

        <hr style={{ border: 0, height: '1px', background: 'var(--border-color)', marginBottom: '2rem' }} />

        <h4 style={{ marginBottom: '1rem' }}>Finalize Consultation: Issue Digital Prescription</h4>
        <form onSubmit={onIssuePrescription} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <textarea required placeholder="Rx: Amoxicillin 500mg, take 1 cap twice daily for 7 days" value={prescriptionText} onChange={e => onPrescriptionTextChange(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)', minHeight: '80px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Follow-up in:</label>
            <select value={followupDays} onChange={e => onFollowupDaysChange(Number(e.target.value))} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--input-border)' }}>
              <option value={0}>No follow-up needed</option>
              <option value={3}>3 days</option>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>1 month</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Sign & Issue Prescription (Close Visit)</button>
        </form>
      </div>
    </div>
  );
}
