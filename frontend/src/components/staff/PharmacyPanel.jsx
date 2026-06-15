import { Activity, CheckCircle } from 'lucide-react';

export default function PharmacyPanel({ pharmacyQueue, onDispense }) {
  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--success)' }}><Activity /> Pharmacy Fulfillment Desk</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Dispense signed E-Prescriptions to departing patients.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {pharmacyQueue.map(rx => (
          <div key={rx.id} className="card glass-panel" style={{ borderLeft: '4px solid var(--success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-dark)' }}>{rx.patient_name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Prescribed by: {rx.doctor_name} | Rx #{rx.id}</p>
              <div style={{ marginTop: '0.5rem', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                {rx.medication}
              </div>
            </div>
            <div>
              <button className="btn btn-primary" style={{ background: 'var(--success)', border: 'none', padding: '1rem 2rem' }} onClick={() => onDispense(rx.id)}>
                <CheckCircle size={18} style={{ display: 'inline', marginRight: '0.5rem', marginBottom: '-4px' }} /> Mark Dispensed
              </button>
            </div>
          </div>
        ))}
        {pharmacyQueue.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No pending prescriptions at the desk.
          </div>
        )}
      </div>
    </>
  );
}
