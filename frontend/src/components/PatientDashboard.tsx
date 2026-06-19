import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '../stores/useNotificationStore';
import { apiFetch } from '../lib/api';
import { useApiQuery } from '../hooks/useApi';
import useSocketRefresh from '../hooks/useSocketRefresh';
import { downloadDischargeSummary } from '../lib/pdf';
import ActiveAppointments from './patient/ActiveAppointments';
import ActiveLabTests from './patient/ActiveLabTests';
import MedicalHistory from './patient/MedicalHistory';
import PatientBilling from './patient/PatientBilling';
import PatientProfile from './patient/PatientProfile';
import RescheduleModal from './patient/RescheduleModal';
import { DoctorBookingList, BookingForm } from './patient/PatientBookingPanel';
import { DashboardSkeleton } from './common/Skeleton';

export default function PatientDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>('dashboard');
  const [activeBookingDoctor, setActiveBookingDoctor] = useState<any>(null);
  const [symptoms, setSymptoms] = useState('');
  const [painLevel, setPainLevel] = useState<number>(5);
  const [bookingDate, setBookingDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);

  const { data: rawAppointments, isLoading, error: appointmentsError } = useApiQuery<any[]>(
    ['patient-appointments', user!.id],
    `/patients/${user!.id}/appointments`
  );
  const { data: labTests = [], error: labTestsError } = useApiQuery<any[]>(
    ['patient-lab-tests', user!.id],
    `/hospital/patient/${user!.id}/tests`
  );
  const { data: prescriptions = [], error: prescriptionsError } = useApiQuery<any[]>(
    ['patient-prescriptions', user!.id],
    `/patients/${user!.id}/prescriptions`
  );
  const { data: doctors = [], error: doctorsError } = useApiQuery<any[]>('patient-doctors', '/auth/doctors');
  const { data: allDoctors = [], error: allDoctorsError } = useApiQuery<any[]>('patient-doctors-all', '/auth/doctors/all');
  const { data: invoices = [], error: invoicesError } = useApiQuery<any[]>(
    ['patient-invoices', user!.id],
    `/hospital/patient/${user!.id}/invoices`,
    { enabled: false }
  );

  const fetchError = appointmentsError || labTestsError || prescriptionsError || doctorsError || allDoctorsError || invoicesError;

  const activeAppointments = useMemo(() =>
    (rawAppointments as any[])?.filter((a: any) => !['Completed', 'Cancelled'].includes(a.status)) ?? [],
  [rawAppointments]);
  const historyAppointments = useMemo(() =>
    (rawAppointments as any[])?.filter((a: any) => ['Completed', 'Cancelled'].includes(a.status)) ?? [],
  [rawAppointments]);

  const [profileForm, setProfileForm] = useState<Record<string, any>>({
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
  const [ratedAppointments, setRatedAppointments] = useState<number[]>([]);
  const [rescheduleAppt, setRescheduleAppt] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [ratingStars, setRatingStars] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');

  const refreshPatientData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['patient-appointments', user!.id] });
    queryClient.invalidateQueries({ queryKey: ['patient-lab-tests', user!.id] });
    queryClient.invalidateQueries({ queryKey: ['patient-prescriptions', user!.id] });
  }, [queryClient, user!.id]);

  useSocketRefresh(socket, ['appointment_booked', 'queue_updated'], useCallback((...args: unknown[]) => {
    const data = args[0] as any;
    if (data && data.patient_id && data.patient_id !== user!.id) return;
    refreshPatientData();
  }, [refreshPatientData, user!.id]));

  const fetchSlots = async (doctorId: number, date: string) => {
    setSlotsLoading(true);
    try {
      const res = await apiFetch(`/hospital/doctor/${doctorId}/slots?date=${date}`);
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (e) { console.error(e); }
    setSlotsLoading(false);
  };

  const bookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) { notify.warning('Please select a time slot.'); return; }
    if (socket && activeBookingDoctor) {
      socket.emit('action_book_appointment', {
        patientId: user!.id,
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

  const cancelAppointment = (appointmentId: number) => {
    if (socket && window.confirm('Are you sure you want to cancel this appointment?')) {
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
        refreshPatientData();
      } else {
        notify.error(data.error);
      }
    } catch (e) { notify.error('Reschedule failed.'); }
  };

  const fetchRescheduleSlots = async (date: string) => {
    try {
      const res = await apiFetch(`/hospital/doctor/${rescheduleAppt.doctor_id}/slots?date=${date}`);
      const data = await res.json();
      setRescheduleSlots(data.slots || []);
    } catch (e) { console.error(e); }
  };

  const payForTest = (testId: number) => {
    if (socket) {
      socket.emit('action_pay_test', { testId });
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await apiFetch(`/patients/${user!.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      notify.success('Profile successfully updated!');
    } catch (e) { console.error(e); }
    setProfileSaving(false);
  };

  if (fetchError) return <div style={{ padding: 'var(--spacing-lg)', color: 'var(--danger)' }}>Failed to load data: {fetchError.message}</div>;
  if (isLoading) {
    return <DashboardSkeleton rows={5} />;
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
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' as const }}>

      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: 'var(--spacing-xl)',
        borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' as const
      }}>
        {['dashboard', 'history', 'billing', 'profile'].map(t => (
          <button key={t} className="btn" style={{
            padding: '0.5rem 1rem', background: 'none',
            borderBottom: tab === t ? '3px solid var(--primary)' : '3px solid transparent',
            borderRadius: 0, fontWeight: tab === t ? 700 : 500,
            textTransform: 'capitalize' as const
          } as React.CSSProperties} onClick={() => {
            if (t === 'billing') queryClient.invalidateQueries({ queryKey: ['patient-invoices', user!.id] });
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
            downloadDischargeSummary={(apptId: number) => downloadDischargeSummary(apptId, user!.name, apiFetch, notify)}
            onBrowseDoctors={() => { setTab('bookingList'); }}
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
          onBrowseDoctors={() => setTab('bookingList')}
        />
      )}

      {tab === 'billing' && (
        <PatientBilling
          invoices={invoices}
          fetchInvoices={() => queryClient.invalidateQueries({ queryKey: ['patient-invoices', user!.id] })}
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
