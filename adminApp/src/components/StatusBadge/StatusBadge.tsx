import { Check, Clock, Minus } from 'lucide-react';
import styles from './StatusBadge.module.css';

interface Props {
  status: 'delivered' | 'pending' | 'skipped';
  deliveredAt?: string;
}

export function StatusBadge({ status, deliveredAt }: Props) {
  const config = {
    delivered: { icon: Check, label: 'Delivered', className: styles.delivered },
    pending: { icon: Clock, label: 'Pending', className: styles.pending },
    skipped: { icon: Minus, label: 'Skipped', className: styles.skipped },
  };

  const { icon: Icon, label, className } = config[status];

  let timeStr = '';
  if (status === 'delivered' && deliveredAt) {
    try {
      const d = new Date(deliveredAt);
      timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { /* ignore */ }
  }

  return (
    <span className={`${styles.badge} ${className}`}>
      <Icon size={12} />
      <span>{label}</span>
      {timeStr && <span className={styles.time}>{timeStr}</span>}
    </span>
  );
}
