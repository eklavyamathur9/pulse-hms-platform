import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import { User, Activity, AlertCircle, FileText, ToggleLeft, ToggleRight } from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const notify = useNotification();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePatient, setActivePatient] = useState(null);
  const [testName, setTestName] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [followupDays, setFollowupDays] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [stats, setStats] = useState({ patients_today: 0, revenue: 0, rating: 0 });

  const fetchQueue = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/hospital/doctor/${user.id}/queue`);
      const data = await res.json();
      const sortedQueue = data.sort((a,b) => (b.pain_level >= 8 ? 1 : 0) - (a.pain_level >= 8 ? 1 : 0));
      setQueue(sortedQueue);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/auth/admin/users`);
      const users = await res.json();
      const me = users.find(u => u.id === user.id);
      if (me) setIsAvailable(me.is_available);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/hospital/doctor/${user.id}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchQueue();
    fetchAvailability();
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('queue_updated', () => {
        fetchQueue();
      });
    }
    return () => {
      if (socket) socket.off('queue_updated');
    };
  }, [socket]);

  const prescribeTest = (e) => {
    e.preventDefault();
    if (socket && activePatient) {
      socket.emit('action_prescribe_test', {
        appointmentId: activePatient.id,
        test_name: testName
      });
      setTestName('');
      setActivePatient(null);
    }
  };

  const issuePrescription = (e) => {
    e.preventDefault();
    if (socket && activePatient) {
      socket.emit('action_prescribe_meds', {
        appointmentId: activePatient.id,
        medication_details: prescriptionText,
        followup_days: followupDays > 0 ? followupDays : null
      });
      notify.success('Prescription issued & visit closed.');
      setPrescriptionText('');
      setFollowupDays(0);
      setActivePatient(null);
    }
  };

  const toggleAvailability = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/hospital/doctor/${user.id}/availability`, { method: 'PUT' });
      const data = await res.json();
      setIsAvailable(data.is_available);
      notify.info(data.is_available ? 'You are now accepting patients.' : 'You are now marked unavailable.');
    } catch (e) { notify.error('Failed to toggle availability.'); }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Doctor Hub...</div>;

  return (
    <div className="animate-fade-in">
      {/* PERFORMANCE HEADER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'var(--primary-opacity)', color: 'var(--primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}><User size={24}/></div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Patients Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.patients_today}</div>
          </div>
        </div>
        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}><Activity size={24}/></div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Revenue</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{stats.revenue}</div>
          </div>
        </div>
        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>⭐</div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Clinic Rating</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.rating} / 5</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activePatient ? '350px 1fr' : '1fr', gap: 'var(--spacing-xl)', alignItems: 'start' }}>
        {/* QUEUE SIDEBAR */}
        <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User color="var(--primary)" /> My Queue</h1>
          <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: isAvailable ? 'var(--success-bg)' : 'var(--danger-bg)', color: isAvailable ? 'var(--success)' : 'var(--danger)', border: `1px solid ${isAvailable ? 'var(--success)' : 'var(--danger)'}` }} onClick={toggleAvailability}>
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
                   style={{ cursor: 'pointer', border: activePatient?.id === q.id ? '2px solid var(--primary)' : q.pain_level >= 8 ? '2px solid var(--danger)' : '2px solid transparent', background: q.pain_level >= 8 ? '#fef2f2' : 'white', transition: 'all 0.2s ease' }}
                   onClick={() => setActivePatient(q)}
                 >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                       <h3 style={{ margin: 0, fontSize: '1.1rem', color: q.pain_level >= 8 ? 'var(--danger)' : 'var(--text-dark)' }}>
                          {q.patient_name}
                          {q.pain_level >= 8 && <AlertCircle size={16} color="var(--danger)" style={{ display: 'inline', marginLeft: '0.5rem', marginBottom: '-2px' }} />}
                       </h3>
                       <span style={{ fontSize: '0.8rem', color: q.status === 'Consult_Pending_Review' ? 'var(--primary)' : q.status === 'Vitals_Taken' ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
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

      {/* ACTIVE PATIENT VIEW */}
      {activePatient && (
         <div className="card glass-panel animate-fade-in" style={{ padding: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
               <div>
                  <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-dark)' }}>{activePatient.patient_name}</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Age: {activePatient.patient_age} • Visit #{activePatient.id}</p>
               </div>
               <button className="btn btn-secondary" onClick={() => setActivePatient(null)}>Close</button>
            </div>

            {/* Vitals Display */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} color="var(--primary)" /> Fresh Vitals</h3>
            {activePatient.vitals ? (
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: 'var(--spacing-xl)' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Weight</div>
                     <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-dark)' }}>{activePatient.vitals.weight} <span style={{fontSize: '0.8rem'}}>kg</span></div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Heart Rate</div>
                     <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--danger)' }}>{activePatient.vitals.hr} <span style={{fontSize: '0.8rem'}}>bpm</span></div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Blood Pressure</div>
                     <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary)' }}>{activePatient.vitals.bp}</div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Temp</div>
                     <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--warning)' }}>{activePatient.vitals.temp} <span style={{fontSize: '0.8rem'}}>°F</span></div>
                  </div>
               </div>
            ) : (
               <div style={{ padding: '1rem', background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-xl)' }}>
                  Vitals have not been recorded by staff yet.
               </div>
            )}

            {/* Medical Profile Display */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
               <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={18} color="var(--primary)" /> Medical Demographics & Symptoms</h3>
               
               <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-dark)' }}>Primary Symptoms</h4>
                  <div style={{ fontStyle: 'italic', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>"{activePatient.symptoms || "Standard checkup"}"</div>
                  <div style={{ fontWeight: 600, color: activePatient.pain_level > 6 ? 'var(--danger)' : 'var(--warning)' }}>Pain Level: {activePatient.pain_level || 0}/10</div>
               </div>

               <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><strong>Height:</strong> {activePatient.patient_height || 'N/A'}</div>
                  <div><strong>Base Weight:</strong> {activePatient.patient_weight_baseline || 'N/A'}</div>
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', background: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '4px', border: '1px solid #fecaca' }}>
                     <strong>Allergies:</strong> {activePatient.patient_allergies || 'None reported'}
                  </div>
               </div>
            </div>

            {/* Lab Test Results Display */}
            {activePatient.lab_tests && activePatient.lab_tests.length > 0 && (
               <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--primary)" /> Laboratory Tests</h3>
                  {activePatient.lab_tests.map((test, idx) => (
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
               {/* Private Clinical Notes */}
               <h4 style={{ marginBottom: '0.5rem' }}>📝 Clinical Notes (Private)</h4>
               <textarea placeholder="Internal observations, differential diagnosis, exam findings..." 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '70px', marginBottom: '0.75rem' }}
                  onBlur={async (e) => {
                     try {
                        await fetch(`http://localhost:5000/api/hospital/appointment/${activePatient.id}/notes`, {
                           method: 'PUT', headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ notes: e.target.value })
                        });
                        notify.info('Notes saved.');
                     } catch(err) { console.error(err); }
                  }}
               />
               
               <hr style={{ border: 0, height: '1px', background: '#ccc', marginBottom: '1.5rem' }} />
               
               <h4 style={{ marginBottom: '1rem' }}>Order Laboratory Test</h4>
               <form onSubmit={prescribeTest} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                  <input type="text" required placeholder="e.g. Complete Blood Count (CBC)" value={testName} onChange={e=>setTestName(e.target.value)} style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                  <button type="submit" className="btn btn-secondary">Send to Lab Pipeline</button>
               </form>
               
               <hr style={{ border: 0, height: '1px', background: '#ccc', marginBottom: '2rem' }} />
               
               <h4 style={{ marginBottom: '1rem' }}>Finalize Consultation: Issue Digital Prescription</h4>
               <form onSubmit={issuePrescription} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <textarea required placeholder="Rx: Amoxicillin 500mg, take 1 cap twice daily for 7 days" value={prescriptionText} onChange={e=>setPrescriptionText(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}></textarea>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'white', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                     <label style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Follow-up in:</label>
                     <select value={followupDays} onChange={e => setFollowupDays(Number(e.target.value))} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}>
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
      )}
    </div>
  </div>
);
}
