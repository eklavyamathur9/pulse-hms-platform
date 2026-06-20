import React from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface RescheduleModalProps {
  rescheduleAppt: any;
  setRescheduleAppt: (a: any) => void;
  rescheduleDate: string;
  setRescheduleDate: (s: string) => void;
  rescheduleSlots: string[];
  rescheduleSlot: string;
  setRescheduleSlot: (s: string) => void;
  fetchRescheduleSlots: (date: string) => void;
  handleReschedule: () => void;
}

export default function RescheduleModal({
  rescheduleAppt, setRescheduleAppt,
  rescheduleDate, setRescheduleDate,
  rescheduleSlots, rescheduleSlot, setRescheduleSlot,
  fetchRescheduleSlots, handleReschedule
}: RescheduleModalProps): React.ReactElement | null {
  return (
    <Modal isOpen={!!rescheduleAppt} onClose={() => setRescheduleAppt(null)}
      title={`Reschedule Appointment #${rescheduleAppt?.id}`}>
      <Input label="New Date" type="date" value={rescheduleDate}
        min={new Date().toISOString().split('T')[0]}
        onChange={e => {
          setRescheduleDate(e.target.value);
          setRescheduleSlot('');
          fetchRescheduleSlots(e.target.value);
        }} />
      {rescheduleDate && (
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Available Slots</label>
          {rescheduleSlots.length === 0 ? (
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>No slots on this date.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {rescheduleSlots.map(s => (
                <button key={s} type="button" onClick={() => setRescheduleSlot(s)}
                  style={{
                    padding: '0.5rem', borderRadius: '4px',
                    border: rescheduleSlot === s ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: rescheduleSlot === s ? 'var(--primary-light)' : 'var(--card-bg)',
                    fontWeight: rescheduleSlot === s ? 700 : 400,
                    cursor: 'pointer', fontSize: '0.85rem'
                  }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <Button variant="primary" disabled={!rescheduleSlot}
          style={{ flex: 1, opacity: rescheduleSlot ? 1 : 0.5 }}
          onClick={handleReschedule}>
          Confirm Reschedule
        </Button>
        <Button variant="secondary" style={{ flex: 1 }}
          onClick={() => setRescheduleAppt(null)}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
