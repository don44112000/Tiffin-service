import { useState } from 'react';
import { MapPin, Minus, Plus, Check } from 'lucide-react';
import { VegIndicator } from '../VegIndicator/VegIndicator';
import { formatTime } from '../../utils/dates';
import type { Order } from '../../types';
import styles from './OrderDeliveryCard.module.css';

interface Props {
  order: Order;
  customerName: string;
  onDeliver: (orderId: string, qty: number) => Promise<void>;
}

export function OrderDeliveryCard({ order, customerName, onDeliver }: Props) {
  const [qty, setQty] = useState(order.quantity_ordered);
  const [loading, setLoading] = useState(false);

  const handleDeliver = async () => {
    if (qty < 1) return;
    setLoading(true);
    try {
      await onDeliver(order.order_id, qty);
    } finally {
      setLoading(false);
    }
  };

  if (order.is_skipped) {
    return (
      <div className={`${styles.card} ${styles.skipped}`}>
        <div className={styles.header}>
          <div className={styles.name}>{customerName}</div>
          <span className={styles.skippedBadge}>Skipped</span>
        </div>
        <div className={styles.details}>
          <VegIndicator type={order.type} size="sm" />
          <span>{order.type === 'veg' ? 'Veg' : 'Non-veg'}</span>
          <span className={styles.dot} />
          <span>Qty: {order.quantity_ordered}</span>
        </div>
      </div>
    );
  }

  if (order.is_delivered) {
    return (
      <div className={`${styles.card} ${styles.delivered}`}>
        <div className={styles.header}>
          <div className={styles.name}>{customerName}</div>
          <span className={styles.deliveredBadge}>
            <Check size={14} />
            {formatTime(order.delivered_at)}
          </span>
        </div>
        <div className={styles.details}>
          <VegIndicator type={order.type} size="sm" />
          <span>{order.type === 'veg' ? 'Veg' : 'Non-veg'}</span>
          <span className={styles.dot} />
          <span>Delivered: {order.quantity_delivered}</span>
        </div>
        <div className={styles.address}>
          <MapPin size={14} />
          <span>{order.address}</span>
        </div>
      </div>
    );
  }

  // Pending order — editable qty + deliver button
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.name}>{customerName}</div>
      </div>
      <div className={styles.details}>
        <VegIndicator type={order.type} size="sm" />
        <span>{order.type === 'veg' ? 'Veg' : 'Non-veg'}</span>
        <span className={styles.dot} />
        <span>Ordered: {order.quantity_ordered}</span>
      </div>
      <div className={styles.address}>
        <MapPin size={14} />
        <span>{order.address}</span>
      </div>
      <div className={styles.actions}>
        <div className={styles.stepper}>
          <button
            className={styles.stepBtn}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1 || loading}
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            className={styles.stepInput}
            value={qty || ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { setQty(0); return; }
              const v = parseInt(raw, 10);
              if (!isNaN(v) && v >= 0) setQty(v);
            }}
            onBlur={() => { if (qty < 1) setQty(1); }}
            min={1}
            disabled={loading}
          />
          <button
            className={styles.stepBtn}
            onClick={() => setQty((q) => q + 1)}
            disabled={loading}
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleDeliver}
          disabled={loading || qty < 1}
        >
          {loading ? 'Delivering...' : 'Deliver'}
        </button>
      </div>
    </div>
  );
}
