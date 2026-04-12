import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Skeleton({ width, height, borderRadius, className = '', style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${styles.skeleton} ${className}`}
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonHeader({ titleLines = 1, showRefresh = true }: { titleLines?: number; showRefresh?: boolean }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        {Array.from({ length: titleLines }).map((_, i) => (
          <Skeleton 
            key={i} 
            height={i === 0 ? 24 : 14} 
            width={i === 0 ? 140 : 90} 
            borderRadius="var(--radius-sm)" 
          />
        ))}
      </div>
      {showRefresh && <Skeleton height={36} width={36} borderRadius="50%" />}
    </div>
  );
}

export function SkeletonText({ lines = 1, lastWidth = '60%' }: { lines?: number; lastWidth?: string }) {
  return (
    <div className={styles.textGroup}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 && lines > 1 ? lastWidth : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div className={styles.card}>
      <Skeleton height={height} borderRadius="var(--radius-lg)" />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className={styles.page}>
      <SkeletonHeader titleLines={2} />
      <div className={styles.pageContent}>
        <Skeleton height={130} borderRadius="var(--radius-xl)" />
        <div className={styles.gap} />
        <Skeleton height={20} width="40%" />
        <div className={styles.gap8} />
        <Skeleton height={160} borderRadius="var(--radius-lg)" />
        <div className={styles.gap} />
        <Skeleton height={20} width="50%" />
        <div className={styles.gap8} />
        <Skeleton height={130} borderRadius="var(--radius-lg)" />
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className={styles.page}>
      <SkeletonHeader titleLines={1} />
      <div className={styles.pageContent}>
        <Skeleton height={36} borderRadius="var(--radius-full)" />
        <div className={styles.gap} />
        <div className={styles.calGrid}>
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} height={44} borderRadius="var(--radius-sm)" />
          ))}
        </div>
        <div className={styles.gap} />
        <Skeleton height={140} borderRadius="var(--radius-lg)" />
        <div className={styles.gap8} />
        <Skeleton height={140} borderRadius="var(--radius-lg)" />
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className={styles.page}>
      <SkeletonHeader titleLines={1} />
      <div className={styles.pageContent}>
        <div className={styles.statsGrid}>
          {[1,2,3,4].map((i) => <Skeleton key={i} height={90} borderRadius="var(--radius-lg)" />)}
        </div>
        <div className={styles.gap} />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={40} borderRadius="var(--radius-sm)" style={{ marginBottom: 6 }} />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <SkeletonHeader titleLines={1} />
      <div className={styles.pageContent}>
        <Skeleton height={110} borderRadius="var(--radius-xl)" />
        <div className={styles.gap} />
        {[1,2,3,4].map((i) => (
          <Skeleton key={i} height={56} borderRadius="var(--radius-md)" style={{ marginBottom: 8 }} />
        ))}
      </div>
    </div>
  );
}
