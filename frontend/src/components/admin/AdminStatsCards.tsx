import type { AdminAnalytics } from '../../types/api';
import { Activity, Users, Stethoscope, Star, Pill } from 'lucide-react';
import StatCard from '../common/StatCard';

interface AdminStatsCardsProps {
  analytics: AdminAnalytics;
}

export default function AdminStatsCards({ analytics }: AdminStatsCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: 'var(--spacing-xl)' }}>
      <StatCard icon={<Activity />} label="Lab Revenue" value={`$${analytics.revenue}`} color="var(--chart-2)" bg="var(--success-bg)" />
      <StatCard icon={<Users />} label="Total Patients" value={analytics.users.patients} color="var(--role-patient)" bg="var(--role-patient-bg)" />
      <StatCard icon={<Stethoscope />} label="Appointments" value={analytics.appointments.total} color="var(--chart-3)" bg="var(--warning-bg)" />
      <StatCard icon={<Star />} label="Avg Rating" value={`${analytics.avg_rating} ★`} color="var(--chart-5)" bg="var(--role-superadmin-bg)" />
      <StatCard icon={<Pill />} label="Rx Dispensed" value={`${analytics.prescriptions.dispensed}/${analytics.prescriptions.total}`} color="var(--role-doctor)" bg="var(--role-doctor-bg)" />
    </div>
  );
}
