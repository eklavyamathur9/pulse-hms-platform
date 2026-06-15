import { Activity, Users, Stethoscope, Star, Pill } from 'lucide-react';
import StatCard from '../common/StatCard';

export default function AdminStatsCards({ analytics }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: 'var(--spacing-xl)' }}>
      <StatCard icon={<Activity />} label="Lab Revenue" value={`$${analytics.revenue}`} color="#22c55e" bg="#f0fdf4" />
      <StatCard icon={<Users />} label="Total Patients" value={analytics.users.patients} color="#6366f1" bg="#eef2ff" />
      <StatCard icon={<Stethoscope />} label="Appointments" value={analytics.appointments.total} color="#f59e0b" bg="#fffbeb" />
      <StatCard icon={<Star />} label="Avg Rating" value={`${analytics.avg_rating} ★`} color="#8b5cf6" bg="#faf5ff" />
      <StatCard icon={<Pill />} label="Rx Dispensed" value={`${analytics.prescriptions.dispensed}/${analytics.prescriptions.total}`} color="#059669" bg="#ecfdf5" />
    </div>
  );
}
