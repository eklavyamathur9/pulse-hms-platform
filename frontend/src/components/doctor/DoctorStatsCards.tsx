import { User, Activity } from 'lucide-react';
import { Card } from '../ui/Card';

interface DoctorStatsCardsProps {
  stats: any;
}

export default function DoctorStatsCards({ stats }: DoctorStatsCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
      <Card className="glass-panel flex" padding={false}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'var(--primary-opacity)', color: 'var(--primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}><User size={24}/></div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Patients Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.patients_today}</div>
          </div>
        </div>
      </Card>
      <Card className="glass-panel flex" padding={false}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}><Activity size={24}/></div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Revenue</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{stats.revenue}</div>
          </div>
        </div>
      </Card>
      <Card className="glass-panel flex" padding={false}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>⭐</div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Clinic Rating</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.rating} / 5</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
