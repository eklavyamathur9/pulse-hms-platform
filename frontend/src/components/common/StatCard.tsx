import React from 'react';

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
  bg?: string;
}

export default function StatCard({ icon, label, value, color, bg }: StatCardProps) {
  return (
    <div className="card" style={{ padding: '1.25rem', background: bg, border: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ color, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>{icon} {label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-dark)' }}>{value}</div>
    </div>
  );
}
