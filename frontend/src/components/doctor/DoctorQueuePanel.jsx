import { User, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';

export default function DoctorQueuePanel({ queue, activePatient, onSelectPatient, isAvailable, onToggleAvailability }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User color="var(--primary)" /> My Queue</h1>
        <button className="btn" style={{
          padding: '0.4rem 0.8rem', fontSize: '0.85rem',
          background: isAvailable ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: isAvailable ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${isAvailable ? 'var(--success)' : 'var(--danger)'}`
        }} onClick={onToggleAvailability}>
          {isAvailable ? <><ToggleRight size={16} /> Available</> : <><ToggleLeft size={16} /> Unavailable</>}
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <p>Your queue is currently empty.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {queue.map(q => (
            <div
              key={q.id}
              className="card glass-panel"
              style={{
                cursor: 'pointer',
                border: activePatient?.id === q.id ? '2px solid var(--primary)' : q.pain_level >= 8 ? '2px solid var(--danger)' : '2px solid transparent',
                background: q.pain_level >= 8 ? '#fef2f2' : 'white',
                transition: 'all 0.2s ease'
              }}
              onClick={() => onSelectPatient(q)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: q.pain_level >= 8 ? 'var(--danger)' : 'var(--text-dark)' }}>
                  {q.patient_name}
                  {q.pain_level >= 8 && <AlertCircle size={16} color="var(--danger)" style={{ display: 'inline', marginLeft: '0.5rem', marginBottom: '-2px' }} />}
                </h3>
                <span style={{
                  fontSize: '0.8rem',
                  color: q.status === 'Consult_Pending_Review' ? 'var(--primary)' : q.status === 'Vitals_Taken' ? 'var(--success)' : 'var(--warning)',
                  fontWeight: 600
                }}>
                  {q.status === 'Consult_Pending_Review' ? 'Lab Review Ready' : q.status === 'Vitals_Taken' ? 'Ready' : 'Vitals / Lab Pending'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                <span>Age: {q.patient_age}</span>
                <span>Time: {q.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
