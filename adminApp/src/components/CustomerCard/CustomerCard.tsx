import { ChevronRight, AlertTriangle } from 'lucide-react';
import type { Customer } from '../../types';
import styles from './CustomerCard.module.css';

interface Props {
  customer: Customer;
  onClick: () => void;
}

export function CustomerCard({ customer, onClick }: Props) {
  const initials = customer.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isDebt = customer.credit_balance < 0;

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.avatar}>{initials}</div>
      <div className={styles.info}>
        <div className={styles.name}>
          {customer.name}
          {isDebt && (
            <span className={styles.debtBadge}>
              <AlertTriangle size={10} />
              DEBT
            </span>
          )}
        </div>
        <div className={styles.mobile}>{customer.mobile}</div>
      </div>
      <div className={styles.right}>
        <span className={`${styles.balance} ${isDebt ? styles.negative : styles.positive}`}>
          {customer.credit_balance} cr
        </span>
        <ChevronRight size={18} className={styles.arrow} />
      </div>
    </div>
  );
}
