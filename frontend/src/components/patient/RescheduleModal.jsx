import React from 'react';

export default function RescheduleModal({
  rescheduleAppt, setRescheduleAppt,
  rescheduleDate, setRescheduleDate,
  rescheduleSlots, rescheduleSlot, setRescheduleSlot,
  fetchRescheduleSlots, handleReschedule
}) {
  if (!rescheduleAppt) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={() => setRescheduleAppt(null)}>
      <div className="card glass-panel animate-fade-in"
        style={{ padding: '2rem', maxWidth: '450px', width: '90%' }}
        onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
          Reschedule Appointment #{rescheduleAppt.id}
        </h2>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>New Date</label>
          <input type="date" value={rescheduleDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => {
              setRescheduleDate(e.target.value);
              setRescheduleSlot('');
              fetchRescheduleSlots(e.target.value);
            }}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        {rescheduleDate && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Available Slots</label>
            {rescheduleSlots.length === 0 ? (
              <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>No slots on this date.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {rescheduleSlots.map(s => (
                  <button key={s} type="button" onClick={() => setRescheduleSlot(s)}
                    style={{
                      padding: '0.5rem', borderRadius: '4px',
                      border: rescheduleSlot === s ? '2px solid var(--primary)' : '1px solid #ccc',
                      background: rescheduleSlot === s ? 'var(--primary-light)' : 'white',
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
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" disabled={!rescheduleSlot}
            style={{ flex: 1, opacity: rescheduleSlot ? 1 : 0.5 }}
            onClick={handleReschedule}>
            Confirm Reschedule
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }}
            onClick={() => setRescheduleAppt(null)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
