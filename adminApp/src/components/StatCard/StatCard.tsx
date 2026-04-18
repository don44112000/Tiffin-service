import type { ReactNode } from 'react';
import styles from './StatCard.module.css';

interface Props {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, icon, color, onClick }: Props) {
  return (
    <div
      className={`${styles.card} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      style={color ? { borderTop: `3px solid ${color}` } : undefined}
    >
      <div className={styles.iconWrap} style={color ? { color, background: `${color}15` } : undefined}>
        {icon}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
