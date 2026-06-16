import React from 'react';
import { CalendarPlus, MapPin } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ActiveAppointmentsProps {
  activeAppointments: any[];
  historyAppointments: any[];
  allDoctors: any[];
  socket: any;
  cancelAppointment: (id: number) => void;
  downloadDischargeSummary: (apptId: number) => void;
  onBrowseDoctors: () => void;
  setRescheduleAppt: (appt: any) => void;
  setRescheduleDate: (date: string) => void;
  setRescheduleSlots: (slots: string[]) => void;
  setRescheduleSlot: (slot: string) => void;
}

export default function ActiveAppointments({
  activeAppointments, historyAppointments, allDoctors,
  socket, cancelAppointment, downloadDischargeSummary,
  onBrowseDoctors, setRescheduleAppt,
  setRescheduleDate, setRescheduleSlots, setRescheduleSlot
}: ActiveAppointmentsProps): React.ReactElement {
  if (activeAppointments.length === 0) {
    return (
      <Card className="text-center" padding={false}>
        <div style={{ padding: '4rem 2rem' }}>
          <CalendarPlus size={64} color="var(--primary)" style={{ margin: '0 auto var(--spacing-md) auto' }} />
          <h2 style={{ fontSize: '1.8rem' }}>You have no active visits</h2>
          <p style={{ marginBottom: 'var(--spacing-xl)', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
            Ready to see a doctor? Book an appointment to get your allocated time slot.
          </p>
          <Button variant="primary" size="lg" onClick={onBrowseDoctors}>
            Browse Doctors & Book
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-lg)' }}>Your Active Journey</h1>
      {activeAppointments.map(appt => {
        const doctor = allDoctors.find(d => d.id === appt.doctor_id);
        return (
          <Card key={appt.id} className="glass-panel overflow-hidden mb-6" padding={false}>
            <div style={{
              background: 'var(--primary)', color: 'white',
              padding: 'var(--spacing-lg)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <p style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', opacity: 0.9 }}>
                  Visit ID
                </p>
                <h2 style={{ fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '1px' }}>
                  #{appt.id}
                </h2>
              </div>
              {appt.status === 'Scheduled' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="ghost" size="sm" style={{ color: 'white' }}
                    onClick={() => {
                      setRescheduleAppt(appt);
                      setRescheduleDate('');
                      setRescheduleSlots([]);
                      setRescheduleSlot('');
                    }}>
                    Reschedule
                  </Button>
                  <Button variant="danger" size="sm"
                    onClick={() => cancelAppointment(appt.id)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            <div style={{ padding: 'var(--spacing-xl)' }}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <p style={{
                  color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase',
                  fontSize: '0.85rem', marginBottom: '1.5rem'
                }}>
                  Journey Progress
                </p>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  position: 'relative', maxWidth: '600px', margin: '0 auto 2rem auto'
                }}>
                  <div style={{
                    position: 'absolute', top: '15px', left: '0', right: '0',
                    height: '4px', background: 'var(--border-color)', zIndex: 0
                  }} />
                  <div style={{
                    position: 'absolute', top: '15px', left: '17px',
                    width: `calc(${appt.status === 'Scheduled' ? '0%' : appt.status === 'Arrived' ? '33.3%' : appt.status === 'Vitals_Taken' ? '66.6%' : '100%'} - 17px)`,
                    height: '4px', background: 'var(--primary)', zIndex: 0, transition: 'width 0.5s ease'
                  }} />

                  {['Scheduled', 'Arrived', 'Vitals_Taken', 'Consultation'].map(step => {
                    const stepMap: Record<string, number> = { 'Scheduled': 0, 'Arrived': 1, 'Vitals_Taken': 2, 'Consultation': 3 };
                    const currentMap: Record<string, number> = { 'Scheduled': 0, 'Arrived': 1, 'Vitals_Taken': 2, 'Lab_Pending': 3, 'Consult_Pending_Review': 3 };
                    const isPassed = currentMap[appt.status] >= stepMap[step];
                    const isActive = currentMap[appt.status] === stepMap[step];

                    return (
                      <div key={step} style={{
                        position: 'relative', zIndex: 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                      }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: isPassed ? 'var(--primary)' : 'white',
                          border: isPassed ? '4px solid var(--bg-surface)' : '4px solid var(--border-color)',
                          boxShadow: isActive ? '0 0 0 4px var(--primary-opacity)' : 'none',
                          transition: 'all 0.3s ease'
                        }} />
                        <span style={{
                          fontSize: '0.8rem', fontWeight: isPassed ? 700 : 500,
                          color: isPassed ? 'var(--primary)' : 'var(--text-muted)'
                        }}>
                          {step.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {appt.status === 'Scheduled' && (
                  <Button variant="primary" size="lg" className="animate-fade-in"
                    style={{ maxWidth: '400px' }}
                    onClick={() => socket?.emit('action_arrive', { appointmentId: appt.id })}>
                    <MapPin /> I have arrived at the Hospital
                  </Button>
                )}
              </div>

              <hr style={{ border: 0, height: '1px', background: '#E2E8F0', margin: 'var(--spacing-lg) 0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div style={{
                  width: '50px', height: '50px', borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-main)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '1.2rem'
                }}>
                  {doctor ? doctor.name.split(' ')[1]?.[0] : '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    {doctor ? doctor.name : 'Loading...'}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {doctor ? doctor.specialization : ''}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{appt.time}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{appt.date}</div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {historyAppointments.filter((a: any) => a.status === 'Completed').length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.3rem' }}>Visit Summaries</h2>
          {historyAppointments.filter((a: any) => a.status === 'Completed').map(a => {
            const doctor = allDoctors.find(d => d.id === a.doctor_id);
            return (
              <Card key={`summary-${a.id}`} className="glass-panel"
                padding={false}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-dark)' }}>
                      Visit #{a.id} with Dr. {doctor ? doctor.name : 'Unknown'}
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {a.date} | Consultation Completed
                    </p>
                  </div>
                  <Button variant="secondary"
                    onClick={() => downloadDischargeSummary(a.id)}>
                    Download Summary
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
