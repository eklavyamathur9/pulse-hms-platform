import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import { apiFetch } from '../lib/api';
import { downloadDischargeSummary } from '../lib/pdf';
import ActiveAppointments from './patient/ActiveAppointments';
import ActiveLabTests from './patient/ActiveLabTests';
import MedicalHistory from './patient/MedicalHistory';
import PatientBilling from './patient/PatientBilling';
import PatientProfile from './patient/PatientProfile';
import RescheduleModal from './patient/RescheduleModal';
import { DoctorBookingList, BookingForm } from './patient/PatientBookingPanel';

export default function PatientDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const notify = useNotification();

  const [tab, setTab] = useState('dashboard');
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

  const fetchAllDoctors = useCallback(async () => {
    try {
      const res = await apiFetch('/auth/doctors/all');
      const data = await res.json();
      setAllDoctors(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch(`/patients/${user.id}/appointments`);
      const data = await res.json();

      setActiveAppointments(data.filter(a => !['Completed', 'Cancelled'].includes(a.status)));
      setHistoryAppointments(data.filter(a => ['Completed', 'Cancelled'].includes(a.status)));

      const labRes = await apiFetch(`/hospital/patient/${user.id}/tests`);
      const labData = await labRes.json();
      setLabTests(labData);

      const rxRes = await apiFetch(`/patients/${user.id}/prescriptions`);
      const rxData = await rxRes.json();
      setPrescriptions(rxData);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [user.id]);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await apiFetch('/auth/doctors');
      const data = await res.json();
      setDoctors(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await apiFetch(`/hospital/patient/${user.id}/invoices`);
      const data = await res.json();
      setInvoices(data);
    } catch (e) { console.error(e); }
  }, [user.id]);

  useEffect(() => {
    fetchData();
    fetchDoctors();
    fetchAllDoctors();
    fetchInvoices();
  }, [fetchAllDoctors, fetchData, fetchDoctors, fetchInvoices]);

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
    };
  }, [fetchData, socket, user.id]);

  const fetchSlots = async (doctorId, date) => {
    setSlotsLoading(true);
    try {
      const res = await apiFetch(`/hospital/doctor/${doctorId}/slots?date=${date}`);
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
      const res = await apiFetch(`/hospital/appointment/${rescheduleAppt.id}/reschedule`, {
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
      const res = await apiFetch(`/hospital/doctor/${rescheduleAppt.doctor_id}/slots?date=${date}`);
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
      const res = await apiFetch(`/patients/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        notify.success("Profile successfully updated!");
      }
    } catch (e) {
      console.error(e);
    }
    setProfileSaving(false);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your dashboard...</div>;
  }

  if (activeBookingDoctor) {
    return (
      <BookingForm
        doctor={activeBookingDoctor}
        onBack={() => setActiveBookingDoctor(null)}
        bookingDate={bookingDate}
        setBookingDate={setBookingDate}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading}
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        symptoms={symptoms}
        setSymptoms={setSymptoms}
        painLevel={painLevel}
        setPainLevel={setPainLevel}
        onBook={bookAppointment}
        fetchSlots={fetchSlots}
      />
    );
  }

  if (tab === 'bookingList') {
    return (
      <DoctorBookingList
        allDoctors={allDoctors}
        onSelectDoctor={setActiveBookingDoctor}
        onBack={() => setTab('dashboard')}
      />
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>

      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: 'var(--spacing-xl)',
        borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap'
      }}>
        {['dashboard', 'history', 'billing', 'profile'].map(t => (
          <button key={t} className="btn" style={{
            padding: '0.5rem 1rem', background: 'none',
            borderBottom: tab === t ? '3px solid var(--primary)' : '3px solid transparent',
            borderRadius: 0, fontWeight: tab === t ? 700 : 500,
            textTransform: 'capitalize'
          }} onClick={() => {
            if (t === 'billing') fetchInvoices();
            setTab(t);
          }}>
            {t === 'dashboard' ? 'Active Portal' : t}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <>
          <ActiveAppointments
            activeAppointments={activeAppointments}
            historyAppointments={historyAppointments}
            allDoctors={allDoctors}
            socket={socket}
            cancelAppointment={cancelAppointment}
            downloadDischargeSummary={(apptId) => downloadDischargeSummary(apptId, user.name, apiFetch, notify)}
            onBrowseDoctors={() => { fetchDoctors(); setTab('bookingList'); }}
            setRescheduleAppt={setRescheduleAppt}
            setRescheduleDate={setRescheduleDate}
            setRescheduleSlots={setRescheduleSlots}
            setRescheduleSlot={setRescheduleSlot}
          />

          <ActiveLabTests labTests={labTests} payForTest={payForTest} />
        </>
      )}

      {tab === 'history' && (
        <MedicalHistory
          historyAppointments={historyAppointments}
          allDoctors={allDoctors}
          doctors={doctors}
          prescriptions={prescriptions}
          labTests={labTests}
          user={user}
          notify={notify}
          ratingStars={ratingStars}
          setRatingStars={setRatingStars}
          ratingComment={ratingComment}
          setRatingComment={setRatingComment}
          ratedAppointments={ratedAppointments}
          setRatedAppointments={setRatedAppointments}
          onBrowseDoctors={() => { fetchDoctors(); fetchAllDoctors(); setTab('bookingList'); }}
        />
      )}

      {tab === 'billing' && (
        <PatientBilling
          invoices={invoices}
          fetchInvoices={fetchInvoices}
          user={user}
          notify={notify}
          apiFetch={apiFetch}
        />
      )}

      {tab === 'profile' && (
        <PatientProfile
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          profileSaving={profileSaving}
          saveProfile={saveProfile}
        />
      )}

      <RescheduleModal
        rescheduleAppt={rescheduleAppt}
        setRescheduleAppt={setRescheduleAppt}
        rescheduleDate={rescheduleDate}
        setRescheduleDate={setRescheduleDate}
        rescheduleSlots={rescheduleSlots}
        rescheduleSlot={rescheduleSlot}
        setRescheduleSlot={setRescheduleSlot}
        fetchRescheduleSlots={fetchRescheduleSlots}
        handleReschedule={handleReschedule}
      />
    </div>
  );
}
