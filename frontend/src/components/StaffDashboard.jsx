import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Activity, Clipboard, CheckCircle } from 'lucide-react';

export default function StaffDashboard() {
  const socket = useSocket();
  const [tab, setTab] = useState('vitals'); // 'vitals', 'labs', 'pharmacy'
  const [queue, setQueue] = useState([]);
  const [labQueue, setLabQueue] = useState([]);
  const [pharmacyQueue, setPharmacyQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vitalsForm, setVitalsForm] = useState(null); 
  const [vitalsData, setVitalsData] = useState({ weight: '', hr: '', bp: '', temp: '' });
  
  const [labUploadForm, setLabUploadForm] = useState(null); // id of test
  const [labResult, setLabResult] = useState('');

  const fetchQueue = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/hospital/queue');
      const data = await res.json();
      const sortedQueue = data.sort((a,b) => (b.pain_level >= 8 ? 1 : 0) - (a.pain_level >= 8 ? 1 : 0));
      setQueue(sortedQueue);
      
      const labRes = await fetch('http://localhost:5000/api/hospital/lab/queue');
      const labData = await labRes.json();
      setLabQueue(labData);

      const rxRes = await fetch('http://localhost:5000/api/hospital/pharmacy/queue');
      const rxData = await rxRes.json();
      setPharmacyQueue(rxData);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('queue_updated', () => {
        fetchQueue();
      });
      socket.on('appointment_booked', () => {
         fetchQueue();
      })
    }
    return () => {
      if (socket) {
        socket.off('queue_updated');
        socket.off('appointment_booked');
      }
    };
  }, [socket]);

  const submitVitals = (e) => {
    e.preventDefault();
    if (socket && vitalsForm) {
      socket.emit('action_submit_vitals', {
        appointmentId: vitalsForm,
        ...vitalsData
      });
      setVitalsForm(null);
      setVitalsData({ weight: '', hr: '', bp: '', temp: '' });
    }
  };

  const submitLabReport = (e) => {
    e.preventDefault();
    if (socket && labUploadForm) {
      socket.emit('action_upload_test_report', {
        testId: labUploadForm,
        result_text: labResult
      });
      setLabUploadForm(null);
      setLabResult('');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Staff Hub...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--spacing-xl)', borderBottom: '1px solid #e2e8f0' }}>
         <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'vitals' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'vitals' ? 700 : 500 }} onClick={() => setTab('vitals')}>Vitals Pipeline</button>
         <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'labs' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'labs' ? 700 : 500 }} onClick={() => setTab('labs')}>Laboratory Pipeline</button>
         <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'pharmacy' ? '3px solid var(--success)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'pharmacy' ? 700 : 500, color: tab === 'pharmacy' ? 'var(--success)' : 'inherit' }} onClick={() => setTab('pharmacy')}>Pharmacy Desk</button>
      </div>

      {tab === 'vitals' && (
      <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}><Activity color="var(--primary)" /> Vitals Hub & Waitlist</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Monitor arrived patients and input their preliminary vitals.</p>

      {vitalsForm ? (
        <div className="card glass-panel" style={{ borderLeft: '4px solid var(--primary)', marginBottom: 'var(--spacing-xl)' }}>
           <h3>Input Vitals for Visit #{vitalsForm}</h3>
           <form onSubmit={submitVitals} style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                 <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Weight (kg)</label>
                 <input required type="text" value={vitalsData.weight} onChange={e=>setVitalsData({...vitalsData, weight: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="e.g. 70" />
              </div>
              <div>
                 <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Heart Rate (bpm)</label>
                 <input required type="text" value={vitalsData.hr} onChange={e=>setVitalsData({...vitalsData, hr: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="e.g. 75" />
              </div>
              <div>
                 <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Blood Pressure (mmHg)</label>
                 <input required type="text" value={vitalsData.bp} onChange={e=>setVitalsData({...vitalsData, bp: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="e.g. 120/80" />
              </div>
              <div>
                 <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Temperature (°F)</label>
                 <input required type="text" value={vitalsData.temp} onChange={e=>setVitalsData({...vitalsData, temp: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="e.g. 98.6" />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                 <button type="submit" className="btn btn-primary"><CheckCircle size={18} /> Submit Vitals</button>
                 <button type="button" className="btn btn-secondary" onClick={() => setVitalsForm(null)}>Cancel</button>
              </div>
           </form>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead style={{ background: 'var(--bg-main)' }}>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Doctor Assigned</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map(q => (
              <tr key={q.id} style={{ background: q.pain_level >= 8 ? '#fef2f2' : 'transparent', borderLeft: q.pain_level >= 8 ? '4px solid var(--danger)' : 'none' }}>
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
                    <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => setVitalsForm(q.id)}>
                      <Clipboard size={16} /> Take Vitals
                    </button>
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
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No patients in queue today.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {tab === 'labs' && (
      <>
         <h1 style={{ marginBottom: 'var(--spacing-sm)' }}><Activity color="var(--primary)" /> Laboratory Queue</h1>
         <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Process patient samples and upload test results.</p>

         {labUploadForm ? (
         <div className="card glass-panel" style={{ borderLeft: '4px solid var(--primary)', marginBottom: 'var(--spacing-xl)' }}>
            <h3>Upload Results for Test #{labUploadForm}</h3>
            <form onSubmit={submitLabReport} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div>
                  <textarea required value={labResult} onChange={e=>setLabResult(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px' }} placeholder="Enter diagnostic results metrics here..."></textarea>
               </div>
               <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary"><CheckCircle size={18} /> Upload Report</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setLabUploadForm(null)}>Cancel</button>
               </div>
            </form>
         </div>
         ) : null}

         <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
         <table>
            <thead style={{ background: 'var(--bg-main)' }}>
               <tr>
               <th>ID</th>
               <th>Patient</th>
               <th>Test Required</th>
               <th>Action</th>
               </tr>
            </thead>
            <tbody>
               {labQueue.map(t => (
               <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td style={{ fontWeight: 500 }}>{t.patient_name}</td>
                  <td>{t.test_name}</td>
                  <td>
                     <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => setLabUploadForm(t.id)}>
                        Upload Findings
                     </button>
                  </td>
               </tr>
               ))}
               {labQueue.length === 0 && (
               <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No pending lab samples today.</td>
               </tr>
               )}
            </tbody>
         </table>
         </div>
      </>
      )}

      {tab === 'pharmacy' && (
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
                     <button className="btn btn-primary" style={{ background: 'var(--success)', border: 'none', padding: '1rem 2rem' }} onClick={() => {
                        if (socket) socket.emit('action_dispense_meds', { prescriptionId: rx.id });
                     }}>
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
      )}

    </div>
  );
}
