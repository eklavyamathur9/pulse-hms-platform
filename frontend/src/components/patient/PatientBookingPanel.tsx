import React from 'react';

interface DoctorBookingListProps {
  allDoctors: any[];
  onSelectDoctor: (doctor: any) => void;
  onBack: () => void;
}

export function DoctorBookingList({ allDoctors, onSelectDoctor, onBack }: DoctorBookingListProps): React.ReactElement {
  const available = allDoctors;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-xl)' }} onClick={onBack}>
        &larr; Back to Dashboard
      </button>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>Available Specialists</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>
        Select a specialist to begin your consultation request.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--spacing-lg)' }}>
        {available.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', gridColumn: '1 / -1' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              No doctors are currently available. Please try again later.
            </p>
          </div>
        )}
        {available.map((d: any) => (
          <div key={d.id} className="card glass-panel" style={{
            display: 'flex', flexDirection: 'column', padding: '1.5rem',
            opacity: d.is_available ? 1 : 0.6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: '0.75rem' }}>
              <div style={{
                width: '55px', height: '55px', borderRadius: 'var(--radius-full)',
                background: 'var(--primary-opacity)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '1.4rem'
              }}>
                {d.name.split(' ')[1]?.[0] || 'D'}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{d.name}</h3>
                <span style={{ fontSize: '0.8rem', background: 'var(--bg-main)', padding: '0.2rem 0.6rem', borderRadius: '4px', display: 'inline-block' }}>
                  {d.specialization}
                </span>
                {d.is_available && (
                  <span style={{
                    fontSize: '0.7rem', background: 'var(--success-bg)', color: 'var(--success)',
                    padding: '0.15rem 0.5rem', borderRadius: '4px', marginLeft: '0.5rem',
                    fontWeight: 600, display: 'inline-block'
                  }}>
                    ● Available
                  </span>
                )}
              </div>
            </div>
            {d.qualification && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                🎓 {d.qualification}
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              {d.experience_years && <span>🏥 {d.experience_years} yrs experience</span>}
              {d.avg_rating && <span>⭐ {d.avg_rating} ({d.rating_count})</span>}
            </div>
            {d.bio && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {d.bio}
              </p>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)'
            }}>
              {d.consultation_fee > 0 ? (
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>
                  ₹{d.consultation_fee}
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Free consultation</span>
              )}
              <button className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}
                onClick={() => onSelectDoctor(d)}>
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BookingFormProps {
  doctor: any;
  onBack: () => void;
  bookingDate: string;
  setBookingDate: (date: string) => void;
  availableSlots: string[];
  slotsLoading: boolean;
  selectedSlot: string;
  setSelectedSlot: (slot: string) => void;
  symptoms: string;
  setSymptoms: (s: string) => void;
  painLevel: number;
  setPainLevel: (n: number) => void;
  onBook: (e: React.FormEvent) => void;
  fetchSlots: (doctorId: number, date: string) => void;
}

export function BookingForm({
  doctor, onBack, bookingDate, setBookingDate,
  availableSlots, slotsLoading, selectedSlot, setSelectedSlot,
  symptoms, setSymptoms, painLevel, setPainLevel,
  onBook, fetchSlots
}: BookingFormProps): React.ReactElement {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '650px', margin: '0 auto' }}>
      <button className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-xl)' }}
        onClick={() => { onBack(); setBookingDate(''); setSelectedSlot(''); }}>
        &larr; Cancel Request
      </button>
      <div className="card glass-panel" style={{ padding: '2rem' }}>
        <div style={{
          display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem',
          paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'var(--primary-opacity)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1.5rem'
          }}>
            {doctor.name.split(' ')[1]?.[0] || 'D'}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>{doctor.name}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {doctor.qualification || doctor.specialization}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', fontSize: '0.8rem' }}>
              {doctor.experience_years && <span>🏥 {doctor.experience_years} yrs exp</span>}
              {doctor.avg_rating && <span>⭐ {doctor.avg_rating} ({doctor.rating_count} reviews)</span>}
              {doctor.consultation_fee > 0 && (
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>₹{doctor.consultation_fee}</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={onBook} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Preferred Date</label>
            <input type="date" required value={bookingDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => {
                setBookingDate(e.target.value);
                setSelectedSlot('');
                fetchSlots(doctor.id, e.target.value);
              }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} />
          </div>

          {bookingDate && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Available Slots {slotsLoading && '(loading...)'}
              </label>
              {availableSlots.length === 0 && !slotsLoading ? (
                <div style={{
                  padding: '1rem', background: 'var(--danger-bg)', borderRadius: '4px',
                  color: 'var(--danger)', fontSize: '0.9rem'
                }}>
                  No slots available on this date. Try another date.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>
                  {availableSlots.map(slot => (
                    <button key={slot} type="button" onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '0.6rem', borderRadius: '6px',
                        border: selectedSlot === slot ? '2px solid var(--primary)' : '1px solid #ccc',
                        background: selectedSlot === slot ? 'var(--primary-light)' : 'white',
                        fontWeight: selectedSlot === slot ? 700 : 500,
                        cursor: 'pointer', fontSize: '0.85rem',
                        color: selectedSlot === slot ? 'var(--primary)' : 'var(--text-dark)'
                      }}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Primary Symptoms & Reason for Visit
            </label>
            <textarea required value={symptoms} onChange={e => setSymptoms(e.target.value)}
              placeholder="e.g. Sharp pain in lower abdomen, fever for 2 days..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)', minHeight: '80px' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Current Pain Level: {painLevel}/10
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>1 (Mild)</span>
              <input type="range" min="1" max="10" value={painLevel}
                onChange={e => setPainLevel(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>10 (Severe)</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary"
            disabled={!selectedSlot}
            style={{
              padding: '1rem', fontSize: '1.05rem', marginTop: '0.5rem',
              opacity: selectedSlot ? 1 : 0.5
            }}>
            Confirm Booking — {selectedSlot || 'Select a slot'}
          </button>
        </form>
      </div>
    </div>
  );
}
