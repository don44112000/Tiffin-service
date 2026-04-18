import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ width, height = 16, borderRadius, className, style }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className || ''}`}
      style={{
        width: width || '100%',
        height,
        borderRadius: borderRadius || 'var(--radius-sm)',
        ...style,
      }}
    />
  );
}

export function DeliveryPageSkeleton() {
  return (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Skeleton height={40} style={{ marginBottom: 16 }} />
      <Skeleton height={48} borderRadius="var(--radius-md)" style={{ marginBottom: 16 }} />
      <Skeleton height={56} borderRadius="var(--radius-md)" style={{ marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="25%" height={64} borderRadius="var(--radius-md)" />
        ))}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={120} borderRadius="var(--radius-lg)" style={{ marginBottom: 12 }} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-content fade-in">
      <Skeleton width="50%" height={32} style={{ marginBottom: 8 }} />
      <Skeleton width="35%" height={18} style={{ marginBottom: 24 }} />
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={100} borderRadius="var(--radius-lg)" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} height={140} borderRadius="var(--radius-lg)" style={{ marginBottom: 16 }} />
      ))}
    </div>
  );
}

export function CustomerListSkeleton() {
  return (
    <div className="page-content fade-in">
      <Skeleton width="60%" height={32} style={{ marginBottom: 16 }} />
      <Skeleton height={48} borderRadius="var(--radius-md)" style={{ marginBottom: 16 }} />
      <Skeleton height={44} borderRadius="var(--radius-md)" style={{ marginBottom: 24 }} />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} height={80} borderRadius="var(--radius-lg)" style={{ marginBottom: 12 }} />
      ))}
    </div>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <div className="page-content fade-in">
      <Skeleton height={140} borderRadius="var(--radius-lg)" style={{ marginBottom: 16 }} />
      <Skeleton height={100} borderRadius="var(--radius-lg)" style={{ marginBottom: 16 }} />
      <Skeleton height={80} borderRadius="var(--radius-lg)" style={{ marginBottom: 24 }} />
      <Skeleton height={44} borderRadius="var(--radius-md)" style={{ marginBottom: 16 }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={56} borderRadius="var(--radius-md)" style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}

export function MenuSkeleton() {
  return (
    <div className="page-content fade-in">
      <Skeleton width="50%" height={32} style={{ marginBottom: 24 }} />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <Skeleton width="30%" height={22} style={{ marginBottom: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Skeleton height={100} borderRadius="var(--radius-lg)" />
            <Skeleton height={100} borderRadius="var(--radius-lg)" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReconciliationSkeleton() {
  return (
    <div className="page-content fade-in">
      <Skeleton width="50%" height={32} style={{ marginBottom: 24 }} />
      <Skeleton height={48} borderRadius="var(--radius-md)" style={{ marginBottom: 24 }} />
      <Skeleton height={200} borderRadius="var(--radius-lg)" style={{ marginBottom: 24 }} />
      <Skeleton height={120} borderRadius="var(--radius-lg)" />
    </div>
  );
}
