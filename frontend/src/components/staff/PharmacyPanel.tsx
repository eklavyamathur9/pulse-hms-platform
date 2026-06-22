import { Activity, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { PharmacyQueueEntry } from '../../types/api';

interface PharmacyPanelProps {
  pharmacyQueue: PharmacyQueueEntry[];
  onDispense: (id: number) => void;
}

export default function PharmacyPanel({ pharmacyQueue, onDispense }: PharmacyPanelProps) {
  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--success)' }}><Activity /> Pharmacy Fulfillment Desk</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Dispense signed E-Prescriptions to departing patients.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {pharmacyQueue.map(rx => (
          <Card key={rx.id} className="glass-panel" style={{ borderLeft: '4px solid var(--success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-dark)' }}>{rx.patient_name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Prescribed by: {rx.doctor_name} | Rx #{rx.id}</p>
                <div style={{ marginTop: '0.5rem', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                  {rx.medication}
                </div>
              </div>
              <div>
                <Button variant="primary"
                  onClick={() => onDispense(rx.id)}>
                  <CheckCircle size={18} /> Mark Dispensed
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {pharmacyQueue.length === 0 && (
          <Card className="text-center" style={{ color: 'var(--text-muted)' }}>
            No pending prescriptions at the desk.
          </Card>
        )}
      </div>
    </>
  );
}
