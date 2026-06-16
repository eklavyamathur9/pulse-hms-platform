import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height = '20px', borderRadius = '8px', style }: SkeletonProps) {
  return (
    <div
      style={{
        width: width || '100%',
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--card-bg) 25%, var(--border-color) 50%, var(--card-bg) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card" style={{ padding: '1.25rem', border: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <Skeleton width="60%" height="14px" />
      <Skeleton width="40%" height="28px" />
    </div>
  );
}

interface DashboardSkeletonProps {
  rows?: number;
}

export function DashboardSkeleton({ rows = 4 }: DashboardSkeletonProps) {
  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <Skeleton width="250px" height="32px" style={{ marginBottom: '1rem' }} />
      <Skeleton width="180px" height="16px" style={{ marginBottom: '2rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height="60px" style={{ marginBottom: '0.5rem' }} />
      ))}
    </div>
  );
}
