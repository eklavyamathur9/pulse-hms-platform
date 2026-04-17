import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { CalendarPlus, MapPin, Clock, User as UserIcon, Activity, FileText } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import jsPDF from 'jspdf';

export default function PatientDashboard() {
  const { user, login } = useAuth(); // Assuming login updates user context if passed
  const socket = useSocket();
  const notify = useNotification();
  
  const [tab, setTab] = useState('dashboard'); // 'dashboard', 'history', 'profile', 'billing'
  const [activeBookingDoctor, setActiveBookingDoctor] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [painLevel, setPainLevel] = useState(5);
  const [bookingDate, setBookingDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [historyAppointments, setHistoryAppointments] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    contact: user?.contact || '',
    age: user?.age || '',
    gender: user?.gender || '',
    blood_type: user?.blood_type || '',
    height: user?.height || '',
    weight_baseline: user?.weight_baseline || '',
    allergies: user?.allergies || ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratedAppointments, setRatedAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlot, setRescheduleSlot] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/patients/${user.id}/appointments`);
      const data = await res.json();
      
      setActiveAppointments(data.filter(a => !['Completed', 'Cancelled'].includes(a.status)));
      setHistoryAppointments(data.filter(a => ['Completed', 'Cancelled'].includes(a.status)));
      
      // Ensure we have doctor metadata for all appointments
      if (allDoctors.length === 0) fetchAllDoctors();
      
      const labRes = await fetch(`http://localhost:5000/api/hospital/patient/${user.id}/tests`);
      const labData = await labRes.json();
      setLabTests(labData);

      const rxRes = await fetch(`http://localhost:5000/api/patients/${user.id}/prescriptions`);
      const rxData = await rxRes.json();
      setPrescriptions(rxData);
      
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/auth/doctors`);
      const data = await res.json();
      setDoctors(data);
    } catch (e) { console.error(e); }
  };

  const fetchAllDoctors = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/auth/doctors/all`);
      const data = await res.json();
      setAllDoctors(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    fetchDoctors();
    fetchAllDoctors();
    fetchInvoices();
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('appointment_booked', (data) => {
        if (data.patient_id === user.id) fetchData();
      });
      socket.on('queue_updated', () => {
        fetchData(); 
      });
    }
    return () => {
      if (socket) {
        socket.off('appointment_booked');
        socket.off('queue_updated');
      }
    }
  }, [socket, user]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/hospital/patient/${user.id}/invoices`);
      const data = await res.json();
      setInvoices(data);
    } catch (e) { console.error(e); }
  };

  const fetchSlots = async (doctorId, date) => {
    setSlotsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/hospital/doctor/${doctorId}/slots?date=${date}`);
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (e) { console.error(e); }
    setSlotsLoading(false);
  };

  const bookAppointment = (e) => {
    e.preventDefault();
    if (!selectedSlot) { notify.warning('Please select a time slot.'); return; }
    if (socket && activeBookingDoctor) {
      socket.emit('action_book_appointment', {
        patientId: user.id,
        doctorId: activeBookingDoctor.id,
        date: bookingDate,
        time_slot: selectedSlot,
        symptoms: symptoms,
        pain_level: painLevel
      });
      notify.success('Appointment booked successfully!');
      setActiveBookingDoctor(null);
      setSymptoms('');
      setPainLevel(5);
      setBookingDate('');
      setSelectedSlot('');
      setAvailableSlots([]);
      setTab('dashboard');
    }
  };

  const cancelAppointment = (appointmentId) => {
    if (socket && window.confirm("Are you sure you want to cancel this appointment?")) {
      socket.emit('action_cancel_appointment', { appointmentId });
      notify.info('Appointment cancelled.');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleSlot) { notify.warning('Please select a new time slot.'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/hospital/appointment/${rescheduleAppt.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: rescheduleDate, time: rescheduleSlot })
      });
      const data = await res.json();
      if (res.ok) {
        notify.success('Appointment rescheduled!');
        setRescheduleAppt(null);
        setRescheduleDate('');
        setRescheduleSlot('');
        setRescheduleSlots([]);
        fetchData();
      } else {
        notify.error(data.error);
      }
    } catch (e) { notify.error('Reschedule failed.'); }
  };

  const fetchRescheduleSlots = async (date) => {
    try {
      const res = await fetch(`http://localhost:5000/api/hospital/doctor/${rescheduleAppt.doctor_id}/slots?date=${date}`);
      const data = await res.json();
      setRescheduleSlots(data.slots || []);
    } catch (e) { console.error(e); }
  };

  const payForTest = (testId) => {
    if (socket) {
      socket.emit('action_pay_test', { testId });
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/patients/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Profile successfully updated!");
        // We'd ideally update Context here, but fetching next time will pull it
      }
    } catch(e) {
      console.error(e);
    }
    setProfileSaving(false);
  };

  const downloadPrescriptionPDF = (rx) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); // Pulse Primary Color
    doc.text("PULSE HOSPITAL", 105, 20, null, null, "center");
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Official E-Prescription Document", 105, 28, null, null, "center");
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Patient Name:`, 20, 50);
    doc.setFont("helvetica", "normal");
    doc.text(`${user.name}`, 60, 50);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Prescription ID:`, 120, 50);
    doc.setFont("helvetica", "normal");
    doc.text(`#${rx.id}`, 160, 50);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Date Issued:`, 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date(rx.issued_at).toLocaleDateString()}`, 60, 60);
    
    doc.setFont("helvetica", "bold");
    doc.text("Medication Details / Rx:", 20, 80);
    doc.setFont("courier", "normal");
    
    const splitText = doc.splitTextToSize(rx.medication_details, 170);
    doc.text(splitText, 20, 90);
    
    doc.line(20, 200, 190, 200);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Authorizing Signature:", 20, 210);
    
    doc.setFont("times", "italic");
    doc.setFontSize(16);
    doc.text(rx.digital_signature, 20, 220);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("This document is cryptographically generated and legally binding by the Pulse Healthcare Network.", 105, 280, null, null, "center");
    
    doc.save(`Pulse_Rx_${rx.id}_${user.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadDischargeSummary = async (apptId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/hospital/appointment/${apptId}/summary`);
      const data = await res.json();
      
      const doc = new jsPDF();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('PULSE HOSPITAL', margin, y);
      
      y += 10;
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.text('COMPREHENSIVE CLINICAL DISCHARGE SUMMARY', margin, y);
      
      y += 15;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, 190, y);
      
      // Patient & Visit Info
      y += 15;
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont(undefined, 'bold');
      doc.text('PATIENT INFORMATION', margin, y);
      doc.setFont(undefined, 'normal');
      y += 10;
      doc.text(`Name: ${data.patient.name}`, margin, y);
      doc.text(`Age/Gender: ${data.patient.age} / ${data.patient.gender}`, margin + 80, y);
      y += 8;
      doc.text(`Blood Type: ${data.patient.blood_type}`, margin, y);
      doc.text(`Visit ID: #${data.appointment.id}`, margin + 80, y);
      y += 8;
      doc.text(`Date: ${data.appointment.date}`, margin, y);
      doc.text(`Consultant: Dr. ${data.doctor.name}`, margin + 80, y);

      // Clinical Details
      y += 20;
      doc.setFont(undefined, 'bold');
      doc.text('CLINICAL ASSESSMENT', margin, y);
      doc.setFont(undefined, 'normal');
      y += 10;
      doc.text('Symptoms:', margin, y);
      doc.setFontSize(10);
      doc.text(data.appointment.symptoms || 'None reported', margin + 5, y + 6);
      
      y += 15;
      doc.setFontSize(12);
      doc.text('Clinical Notes:', margin, y);
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(data.appointment.clinical_notes || 'No notes recorded.', 160);
      doc.text(splitNotes, margin + 5, y + 6);
      y += (splitNotes.length * 5) + 5;

      // Vitals
      y += 10;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('VITAL SIGNS', margin, y);
      doc.setFont(undefined, 'normal');
      y += 10;
      doc.text(`BP: ${data.vitals.bp}`, margin, y);
      doc.text(`HR: ${data.vitals.hr} bpm`, margin + 45, y);
      doc.text(`Temp: ${data.vitals.temp}°F`, margin + 90, y);
      doc.text(`Weight: ${data.vitals.weight} kg`, margin + 135, y);

      // Lab Results
      if (data.labs.length > 0) {
          y += 15;
          doc.setFont(undefined, 'bold');
          doc.text('LABORATORY INVESTIGATIONS', margin, y);
          doc.setFont(undefined, 'normal');
          data.labs.forEach(lab => {
              y += 10;
              doc.text(`- ${lab.test_name}: ${lab.result || 'Pending'}`, margin + 5, y);
          });
      }

      // Prescription
      y += 20;
      doc.setFont(undefined, 'bold');
      doc.text('PRESCRIPTION & PLAN', margin, y);
      doc.setFont(undefined, 'normal');
      y += 10;
      const splitRx = doc.splitTextToSize(data.prescription, 160);
      doc.text(splitRx, margin + 5, y);
      
      y += (splitRx.length * 5) + 10;
      doc.text(`Follow-up Recommended: within ${data.appointment.followup || 0} days`, margin, y);

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('This is a computer-generated medical summary from Pulse HMS.', margin, 280);
      doc.text(`Printed on: ${new Date().toLocaleString()}`, 130, 280);

      doc.save(`Summary_Visit_${apptId}.pdf`);
      notify.success('Discharge summary downloaded.');
    } catch (e) { notify.error('Failed to generate summary.'); }
  };


  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your dashboard...</div>;

  if (activeBookingDoctor) {
    const d = activeBookingDoctor;
    return (
      <div className="animate-fade-in" style={{ maxWidth: '650px', margin: '0 auto' }}>
        <button className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-xl)' }} onClick={() => { setActiveBookingDoctor(null); setBookingDate(''); setAvailableSlots([]); setSelectedSlot(''); }}>
          &larr; Cancel Request
        </button>
        <div className="card glass-panel" style={{ padding: '2rem' }}>
           {/* Doctor Profile Header */}
           <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-opacity)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.5rem' }}>
                 {d.name.split(' ')[1]?.[0] || 'D'}
              </div>
              <div style={{ flex: 1 }}>
                 <h2 style={{ margin: 0, color: 'var(--primary)' }}>{d.name}</h2>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{d.qualification || d.specialization}</div>
                 <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', fontSize: '0.8rem' }}>
                    {d.experience_years && <span>🏥 {d.experience_years} yrs exp</span>}
                    {d.avg_rating && <span>⭐ {d.avg_rating} ({d.rating_count} reviews)</span>}
                    {d.consultation_fee > 0 && <span style={{ fontWeight: 700, color: 'var(--success)' }}>₹{d.consultation_fee}</span>}
                 </div>
              </div>
           </div>

           <form onSubmit={bookAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Date Picker */}
              <div>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Preferred Date</label>
                 <input type="date" required value={bookingDate} min={new Date().toISOString().split('T')[0]}
                    onChange={e => { setBookingDate(e.target.value); setSelectedSlot(''); fetchSlots(d.id, e.target.value); }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              {/* Time Slots Grid */}
              {bookingDate && (
                 <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Available Slots {slotsLoading && '(loading...)'}</label>
                    {availableSlots.length === 0 && !slotsLoading ? (
                       <div style={{ padding: '1rem', background: 'var(--danger-bg)', borderRadius: '4px', color: 'var(--danger)', fontSize: '0.9rem' }}>No slots available on this date. Try another date.</div>
                    ) : (
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>
                          {availableSlots.map(slot => (
                             <button key={slot} type="button" onClick={() => setSelectedSlot(slot)}
                                style={{ padding: '0.6rem', borderRadius: '6px', border: selectedSlot === slot ? '2px solid var(--primary)' : '1px solid #ccc', background: selectedSlot === slot ? 'var(--primary-light)' : 'white', fontWeight: selectedSlot === slot ? 700 : 500, cursor: 'pointer', fontSize: '0.85rem', color: selectedSlot === slot ? 'var(--primary)' : 'var(--text-dark)' }}>
                                {slot}
                             </button>
                          ))}
                       </div>
                    )}
                 </div>
              )}

              {/* Symptoms */}
              <div>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Primary Symptoms & Reason for Visit</label>
                 <textarea required value={symptoms} onChange={e=>setSymptoms(e.target.value)} placeholder="e.g. Sharp pain in lower abdomen, fever for 2 days..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}></textarea>
              </div>

              {/* Pain Level */}
              <div>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Current Pain Level: {painLevel}/10</label>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>1 (Mild)</span>
                    <input type="range" min="1" max="10" value={painLevel} onChange={e=>setPainLevel(Number(e.target.value))} style={{ flex: 1, cursor: 'pointer' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>10 (Severe)</span>
                 </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={!selectedSlot} style={{ padding: '1rem', fontSize: '1.05rem', marginTop: '0.5rem', opacity: selectedSlot ? 1 : 0.5 }}>
                 Confirm Booking — {selectedSlot || 'Select a slot'}
              </button>
           </form>
        </div>
      </div>
    );
  }

  if (tab === 'bookingList') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-xl)' }} onClick={() => setTab('dashboard')}>
          &larr; Back to Dashboard
        </button>
        <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>Available Specialists</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Select a specialist to begin your consultation request.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--spacing-lg)' }}>
           {(doctors.length === 0 && allDoctors.length === 0) && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', gridColumn: '1 / -1' }}>
                 <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No doctors are currently available. Please try again later.</p>
              </div>
           )}
           {/* Combine doctors and allDoctors to ensure newly added or unavailable but relevant doctors show up */}
           {Array.from(new Set([...doctors, ...allDoctors])).filter(d => d.role === 'doctor' && d.is_active).map(d => (
              <div key={d.id} className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', opacity: d.is_available ? 1 : 0.6 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: '0.75rem' }}>
                    <div style={{ width: '55px', height: '55px', borderRadius: 'var(--radius-full)', background: 'var(--primary-opacity)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.4rem' }}>
                       {d.name.split(' ')[1]?.[0] || 'D'}
                    </div>
                    <div>
                       <h3 style={{ margin: 0 }}>{d.name}</h3>
                       <span style={{ fontSize: '0.8rem', background: 'var(--bg-main)', padding: '0.2rem 0.6rem', borderRadius: '4px', display: 'inline-block' }}>{d.specialization}</span>
                       <span style={{ fontSize: '0.7rem', background: 'var(--success-bg)', color: 'var(--success)', padding: '0.15rem 0.5rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 600, display: 'inline-block' }}>● Available</span>
                    </div>
                 </div>
                 {d.qualification && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>🎓 {d.qualification}</div>}
                 <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                    {d.experience_years && <span>🏥 {d.experience_years} yrs experience</span>}
                    {d.avg_rating && <span>⭐ {d.avg_rating} ({d.rating_count})</span>}
                 </div>
                 {d.bio && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{d.bio}</p>}
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                    {d.consultation_fee > 0 ? (
                       <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>₹{d.consultation_fee}</span>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Free consultation</span>}
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }} onClick={() => setActiveBookingDoctor(d)}>Book Now</button>
                 </div>
              </div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 'var(--spacing-xl)', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
         <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'dashboard' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'dashboard' ? 700 : 500 }} onClick={() => setTab('dashboard')}>Active Portal</button>
         <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'history' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'history' ? 700 : 500 }} onClick={() => setTab('history')}>Medical History</button>
         <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'billing' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'billing' ? 700 : 500 }} onClick={() => { setTab('billing'); fetchInvoices(); }}>Billing</button>
         <button className="btn" style={{ padding: '0.5rem 1rem', background: 'none', borderBottom: tab === 'profile' ? '3px solid var(--primary)' : '3px solid transparent', borderRadius: 0, fontWeight: tab === 'profile' ? 700 : 500 }} onClick={() => setTab('profile')}>Profile</button>
      </div>

      {tab === 'dashboard' && (
         <>
         {activeAppointments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
               <CalendarPlus size={64} color="var(--primary)" style={{ margin: '0 auto var(--spacing-md) auto' }} />
               <h2 style={{ fontSize: '1.8rem' }}>You have no active visits</h2>
               <p style={{ marginBottom: 'var(--spacing-xl)', fontSize: '1.1rem', color: 'var(--text-muted)' }}>Ready to see a doctor? Book an appointment to get your allocated time slot.</p>
               <button className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }} onClick={() => { fetchDoctors(); setTab('bookingList'); }}>Browse Doctors & Book</button>
            </div>
         ) : (
            <>
               <h1 style={{ marginBottom: 'var(--spacing-lg)' }}>Your Active Journey</h1>
               {activeAppointments.map(appt => {
               const doctor = allDoctors.find(d => d.id === appt.doctor_id);
               return (
                  <div key={appt.id} className="card glass-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
                     <div style={{ background: 'var(--primary)', color: 'white', padding: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                           <p style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', opacity: 0.9 }}>Visit ID</p>
                           <h2 style={{ fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '1px' }}>#{appt.id}</h2>
                        </div>
                        {appt.status === 'Scheduled' && (
                           <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', fontSize: '0.85rem' }} onClick={() => { setRescheduleAppt(appt); setRescheduleDate(''); setRescheduleSlots([]); setRescheduleSlot(''); }}>Reschedule</button>
                              <button className="btn" style={{ background: 'rgba(239,68,68,0.3)', color: 'white', border: '1px solid #fca5a5', fontSize: '0.85rem' }} onClick={() => cancelAppointment(appt.id)}>Cancel</button>
                           </div>
                        )}
                     </div>

                     <div style={{ padding: 'var(--spacing-xl)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                           <p style={{ color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Journey Progress</p>
                           
                           {/* Stepper UI */}
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                              <div style={{ position: 'absolute', top: '15px', left: '0', right: '0', height: '4px', background: '#e2e8f0', zIndex: 0 }}></div>
                              <div style={{ position: 'absolute', top: '15px', left: '17px', width: `calc(${appt.status === 'Scheduled' ? '0%' : appt.status === 'Arrived' ? '33.3%' : appt.status === 'Vitals_Taken' ? '66.6%' : '100%'} - 17px)`, height: '4px', background: 'var(--primary)', zIndex: 0, transition: 'width 0.5s ease' }}></div>
                              
                              {['Scheduled', 'Arrived', 'Vitals_Taken', 'Consultation'].map((step, idx) => {
                                 const stepMap = { 'Scheduled': 0, 'Arrived': 1, 'Vitals_Taken': 2, 'Consultation': 3 };
                                 const currentMap = { 'Scheduled': 0, 'Arrived': 1, 'Vitals_Taken': 2, 'Lab_Pending': 3, 'Consult_Pending_Review': 3 };
                                 const isPassed = currentMap[appt.status] >= stepMap[step];
                                 const isActive = currentMap[appt.status] === stepMap[step];
                                 
                                 return (
                                    <div key={step} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                       <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isPassed ? 'var(--primary)' : 'white', border: isPassed ? '4px solid #fff' : '4px solid #e2e8f0', boxShadow: isActive ? '0 0 0 4px var(--primary-opacity)' : 'none', transition: 'all 0.3s ease' }}></div>
                                       <span style={{ fontSize: '0.8rem', fontWeight: isPassed ? 700 : 500, color: isPassed ? 'var(--primary)' : 'var(--text-muted)' }}>{step.replace('_', ' ')}</span>
                                    </div>
                                 )
                              })}
                           </div>
                           
                           {appt.status === 'Scheduled' && (
                              <button className="btn btn-primary animate-fade-in" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', maxWidth: '400px' }} onClick={() => socket?.emit('action_arrive', { appointmentId: appt.id })}>
                                 <MapPin style={{ marginRight: '0.5rem' }} /> I have arrived at the Hospital
                              </button>
                           )}
                        </div>

                        <hr style={{ border: 0, height: '1px', background: '#E2E8F0', margin: 'var(--spacing-lg) 0' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                           <div style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-full)', background: 'var(--bg-main)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                              {doctor ? doctor.name.split(' ')[1]?.[0] : '?'}
                           </div>
                           <div>
                              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{doctor ? doctor.name : 'Loading...'}</div>
                              <div style={{ color: 'var(--text-muted)' }}>{doctor ? doctor.specialization : ''}</div>
                           </div>
                           <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                              <div style={{ fontWeight: 600 }}>{appt.time}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{appt.date}</div>
                           </div>
                        </div>
                     </div>
                  </div>
               );
               })}
               {/* Visit Summaries */}
             {historyAppointments.filter(a => a.status === 'Completed').length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.3rem' }}>Visit Summaries</h2>
                    {historyAppointments.filter(a => a.status === 'Completed').map(a => {
                        const doctor = allDoctors.find(d => d.id === a.doctor_id);
                        return (
                            <div key={`summary-${a.id}`} className="card glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-dark)' }}>Visit #{a.id} with Dr. {doctor ? doctor.name : 'Unknown'}</strong>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.date} | Consultation Completed</p>
                                </div>
                                <button className="btn btn-secondary" onClick={() => downloadDischargeSummary(a.id)}>Download Summary</button>
                            </div>
                        );
                    })}
                </div>
             )}
          </>
         )}

         {/* LABS IN DASHBOARD */}
         {labTests.filter(t => t.status !== 'Completed').length > 0 && (
             <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Active Laboratory Needs</h2>
                {labTests.filter(t => t.status !== 'Completed').map(test => (
                   <div key={test.id} className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                         <h3 style={{ margin: 0 }}>{test.test_name}</h3>
                         <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status: {test.status}</span>
                      </div>
                      {test.status === 'Pending Payment' && (
                         <button className="btn btn-warning" style={{ background: 'var(--warning)', color: 'white' }} onClick={() => payForTest(test.id)}>
                            Pay ₹50 Now
                         </button>
                      )}
                      {test.status === 'Paid - Needs Sample' && (
                         <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Please visit the Lab</span>
                      )}
                   </div>
                ))}
             </div>
          )}
         </>
      )}

      {tab === 'history' && (
         <>
            <h1 style={{ marginBottom: 'var(--spacing-sm)' }}><FileText color="var(--primary)" /> Medical History Vault</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>All your past diagnostics, doctor visits, and e-prescriptions.</p>

            {historyAppointments.length === 0 && prescriptions.length === 0 && labTests.filter(t=>t.status === 'Completed').length === 0 && (
               <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>No history found.</div>
            )}

            {/* Follow-up Banners */}
            {historyAppointments.filter(a => a.followup_days && a.followup_days > 0).map(a => {
               const doctor = allDoctors.find(d => d.id === a.doctor_id);
               return (
                  <div key={`fu-${a.id}`} className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--warning)', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                     <div>
                        <strong style={{ color: 'var(--warning)' }}>Follow-up Recommended</strong>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                           {doctor ? doctor.name : 'Your doctor'} recommends a follow-up visit within <strong>{a.followup_days} days</strong>.
                        </p>
                     </div>
                     <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => { fetchDoctors(); fetchAllDoctors(); setTab('bookingList'); }}>Book Follow-up</button>
                  </div>
               );
            })}

            {/* Rating Prompt for Completed Unrated Visits */}
            {historyAppointments.filter(a => a.status === 'Completed' && !ratedAppointments.includes(a.id)).map(a => {
               const doctor = doctors.find(d => d.id === a.doctor_id);
               return (
                  <div key={`rate-${a.id}`} className="card glass-panel" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
                     <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Rate your visit #{a.id} {doctor ? `with ${doctor.name}` : ''}</h3>
                     <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
                        {[1,2,3,4,5].map(star => (
                           <span key={star} onClick={() => setRatingStars(star)} style={{ cursor: 'pointer', fontSize: '1.8rem', color: star <= ratingStars ? '#f59e0b' : '#e2e8f0', transition: 'color 0.15s' }}>★</span>
                        ))}
                     </div>
                     <input type="text" placeholder="Optional feedback..." value={ratingComment} onChange={e => setRatingComment(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '0.75rem' }} />
                     <button className="btn btn-primary" disabled={ratingStars === 0} onClick={async () => {
                        try {
                           const res = await fetch('http://localhost:5000/api/hospital/rating', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ appointment_id: a.id, patient_id: user.id, doctor_id: a.doctor_id, stars: ratingStars, comment: ratingComment })
                           });
                           if (res.ok) {
                              notify.success('Thank you for your feedback!');
                              setRatedAppointments(prev => [...prev, a.id]);
                              setRatingStars(0);
                              setRatingComment('');
                           } else {
                              const err = await res.json();
                              notify.info(err.error || 'Rating already submitted.');
                              setRatedAppointments(prev => [...prev, a.id]);
                           }
                        } catch (e) { notify.error('Failed to submit rating.'); }
                     }}>Submit Rating</button>
                  </div>
               );
            })}

            {/* Past Prescriptions */}
            {prescriptions.length > 0 && (
             <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.3rem' }}>E-Prescriptions</h2>
                {prescriptions.map(rx => (
                   <div key={rx.id} className="card glass-panel" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--success)' }}>
                      <div style={{ marginBottom: '1rem' }}>
                         <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prescription ID: #{rx.id} | Issued: {new Date(rx.issued_at).toLocaleDateString()}</span>
                         <p style={{ marginTop: '0.5rem', fontSize: '1.05rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: 'var(--bg-main)', padding: '1rem', borderRadius: '4px' }}>
                            {rx.medication_details}
                         </p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                         <div style={{ color: 'var(--primary)' }}>
                            <small>Digitally Signed by</small><br />
                            <strong>{rx.digital_signature}</strong>
                         </div>
                         <div>
                            <button className="btn btn-secondary" onClick={() => downloadPrescriptionPDF(rx)}>Download PDF</button>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
            )}

            {/* Past Labs */}
            {labTests.filter(t=>t.status === 'Completed').length > 0 && (
               <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                  <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.3rem' }}>Completed Lab Reports</h2>
                  {labTests.filter(t=>t.status==='Completed').map(test => (
                     <div key={test.id} className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-dark)' }}>{test.test_name}</h3>
                        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '1rem', marginTop: '1rem', borderRadius: '4px' }}>
                           <strong>Result:</strong><br/>
                           {test.result_text}
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </>
      )}

      {tab === 'billing' && (
         <>
            <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>💳 Billing & Invoices</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>View and pay your invoices for consultations, labs, and pharmacy.</p>
            
            {invoices.length === 0 ? (
               <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>No invoices yet.</div>
            ) : (
               <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table>
                     <thead style={{ background: 'var(--bg-main)' }}>
                        <tr><th>Invoice</th><th>Doctor</th><th>Date</th><th>Consultation</th><th>Lab</th><th>Total</th><th>Status</th><th>Action</th></tr>
                     </thead>
                     <tbody>
                        {invoices.map(inv => (
                           <tr key={inv.id}>
                              <td style={{ fontWeight: 600 }}>#{inv.id}</td>
                              <td>{inv.doctor_name}</td>
                              <td>{inv.date}</td>
                              <td>₹{inv.consultation_fee}</td>
                              <td>₹{inv.lab_charges}</td>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{inv.total}</td>
                              <td>
                                 <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                    background: inv.status === 'Paid' ? 'var(--success-bg)' : 'var(--warning-bg)',
                                    color: inv.status === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>{inv.status}</span>
                              </td>
                              <td>
                                 {inv.status === 'Unpaid' && (
                                    <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                                       onClick={async () => {
                                          try {
                                             const res = await fetch(`http://localhost:5000/api/hospital/invoice/${inv.id}/pay`, { method: 'PUT' });
                                             if (res.ok) { notify.success('Invoice paid!'); fetchInvoices(); }
                                          } catch (e) { notify.error('Payment failed.'); }
                                       }}>Pay Now</button>
                                 )}
                                 {inv.status === 'Paid' && (
                                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                                       onClick={() => {
                                          const doc = new jsPDF();
                                          doc.setFontSize(20); doc.setTextColor(37,99,235);
                                          doc.text('PULSE HOSPITAL', 105, 20, null, null, 'center');
                                          doc.setFontSize(12); doc.setTextColor(100,100,100);
                                          doc.text('Tax Invoice', 105, 28, null, null, 'center');
                                          doc.line(20, 35, 190, 35);
                                          doc.setTextColor(0,0,0); doc.setFontSize(11);
                                          doc.text(`Invoice #${inv.id}`, 20, 45);
                                          doc.text(`Date: ${inv.date}`, 20, 55);
                                          doc.text(`Doctor: ${inv.doctor_name}`, 20, 65);
                                          doc.text(`Patient: ${user.name}`, 20, 75);
                                          doc.line(20, 85, 190, 85);
                                          doc.text(`Consultation Fee:`, 20, 95);
                                          doc.text(`₹${inv.consultation_fee}`, 170, 95, null, null, 'right');
                                          doc.text(`Lab Charges:`, 20, 105);
                                          doc.text(`₹${inv.lab_charges}`, 170, 105, null, null, 'right');
                                          doc.line(20, 115, 190, 115);
                                          doc.setFontSize(14); doc.setFont('helvetica', 'bold');
                                          doc.text(`Total: ₹${inv.total}`, 170, 125, null, null, 'right');
                                          doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                                          doc.setTextColor(150,150,150);
                                          doc.text('Paid - Thank you for choosing Pulse Hospital', 105, 280, null, null, 'center');
                                          doc.save(`Pulse_Invoice_${inv.id}.pdf`);
                                       }}>Download PDF</button>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleAppt && (
         <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setRescheduleAppt(null)}>
            <div className="card glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '450px', width: '90%' }} onClick={e => e.stopPropagation()}>
               <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Reschedule Appointment #{rescheduleAppt.id}</h2>
               <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>New Date</label>
                  <input type="date" value={rescheduleDate} min={new Date().toISOString().split('T')[0]}
                     onChange={e => { setRescheduleDate(e.target.value); setRescheduleSlot(''); fetchRescheduleSlots(e.target.value); }}
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
                                 style={{ padding: '0.5rem', borderRadius: '4px', border: rescheduleSlot === s ? '2px solid var(--primary)' : '1px solid #ccc', background: rescheduleSlot === s ? 'var(--primary-light)' : 'white', fontWeight: rescheduleSlot === s ? 700 : 400, cursor: 'pointer', fontSize: '0.85rem' }}>{s}</button>
                           ))}
                        </div>
                     )}
                  </div>
               )}
               <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-primary" disabled={!rescheduleSlot} style={{ flex: 1, opacity: rescheduleSlot ? 1 : 0.5 }} onClick={handleReschedule}>Confirm Reschedule</button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRescheduleAppt(null)}>Cancel</button>
               </div>
            </div>
         </div>
      )}

      {tab === 'profile' && (
         <>
            <h1 style={{ marginBottom: 'var(--spacing-sm)' }}><UserIcon color="var(--primary)" /> Profile Settings</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Update your clinical demographics to ensure accurate prescriptions.</p>

            <form onSubmit={saveProfile} className="card glass-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               
               <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Full Name</label>
                  <input type="text" value={profileForm.name} onChange={e=>setProfileForm({...profileForm, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
               </div>

               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Age</label>
                  <input type="number" value={profileForm.age} onChange={e=>setProfileForm({...profileForm, age: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
               </div>
               
               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Gender</label>
                  <select value={profileForm.gender} onChange={e=>setProfileForm({...profileForm, gender: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                     <option value="">Select...</option>
                     <option value="Male">Male</option>
                     <option value="Female">Female</option>
                     <option value="Other">Other</option>
                  </select>
               </div>

               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Blood Type</label>
                  <input type="text" value={profileForm.blood_type} placeholder="e.g. O+, A-" onChange={e=>setProfileForm({...profileForm, blood_type: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
               </div>

               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Mobile Contact</label>
                  <input type="text" value={profileForm.contact} onChange={e=>setProfileForm({...profileForm, contact: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
               </div>

               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Height (cm/in)</label>
                  <input type="text" value={profileForm.height} placeholder="e.g. 175cm" onChange={e=>setProfileForm({...profileForm, height: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
               </div>

               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Weight Baseline (kg/lbs)</label>
                  <input type="text" value={profileForm.weight_baseline} placeholder="e.g. 70kg" onChange={e=>setProfileForm({...profileForm, weight_baseline: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
               </div>

               <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Medical Allergies</label>
                  <textarea value={profileForm.allergies} placeholder="List any drug or food allergies here..." onChange={e=>setProfileForm({...profileForm, allergies: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}></textarea>
               </div>

               <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                  <button type="submit" disabled={profileSaving} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                     {profileSaving ? 'Saving...' : 'Update Health Profile'}
                  </button>
               </div>
            </form>
         </>
      )}
    </div>
  );
}
