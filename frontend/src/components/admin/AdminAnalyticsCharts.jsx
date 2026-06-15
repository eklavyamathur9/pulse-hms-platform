import { Activity, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AdminAnalyticsCharts({ analytics }) {
  const barData = [
    { name: 'Active', value: analytics.appointments.active, fill: '#6366f1' },
    { name: 'Completed', value: analytics.appointments.completed, fill: '#22c55e' },
    { name: 'Cancelled', value: analytics.appointments.cancelled, fill: '#ef4444' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
      <div className="card glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
        <h3 style={{ marginBottom: '1rem' }}><Activity size={18} color="var(--primary)" /> Status Mix</h3>
        {analytics.status_breakdown.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={analytics.status_breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                {analytics.status_breakdown.map((_, idx) => (<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No data yet.</div>}
      </div>
      <div className="card glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
        <h3 style={{ marginBottom: '1rem' }}><TrendingUp size={18} color="var(--primary)" /> Throughput</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" /><YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>{barData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
