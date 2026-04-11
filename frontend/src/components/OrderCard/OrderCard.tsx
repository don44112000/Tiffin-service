import { useState } from 'react';
import { Sun, Moon, MapPin, Clock, Zap } from 'lucide-react';
import type { Order, UpdateOrderPayload } from '../../types';
import VegIndicator from '../VegIndicator/VegIndicator';
import BottomSheet from '../BottomSheet/BottomSheet';
import StepperInput from '../StepperInput/StepperInput';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { skipOrder, updateOrder } from '../../services/api';
import { formatTime, todayStr } from '../../utils/dates';
import styles from './OrderCard.module.css';

interface Props {
  order: Order;
  onRefresh: () => void;
}

function getStatusInfo(order: Order) {
  if (order.is_skipped) return { label: 'Skipped', cls: 'neutral', dot: '⬜' };
  if (order.is_delivered) return { label: 'Delivered', cls: 'success', dot: '✅' };
  return { label: 'Pending', cls: 'warning', dot: '🟡' };
}

function formatAMPM(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours || 12; // 0 becomes 12
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minStr} ${ampm}`;
}

function getAddressLabel(address: string, user: { address_1: string; address_2: string; address_3: string }) {
  if (address === user.address_1) return user.address_1 ? `📍 ${user.address_1}` : '';
  if (address === user.address_2) return user.address_2 ? `📍 ${user.address_2}` : '';
  if (address === user.address_3) return user.address_3 ? `📍 ${user.address_3}` : '';
  return `📍 ${address}`;
}

export default function OrderCard({ order, onRefresh }: Props) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [skipOpen, setSkipOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit state
  const [editType, setEditType] = useState<'veg' | 'non-veg'>(order.type);
  const [editAddress, setEditAddress] = useState(order.address);
  // Check if current order address is custom (not in saved addresses)
  const isCurrentlyCustom = user ? ![user.address_1, user.address_2, user.address_3].includes(order.address) : true;
  const [isCustomAddr, setIsCustomAddr] = useState(isCurrentlyCustom);
  const [editQty, setEditQty] = useState(order.quantity_ordered);

  // Cutoff state
  const [lockedOpen, setLockedOpen] = useState(false);
  const [lockedReason, setLockedReason] = useState('');

  const canAct = !order.is_delivered && !order.is_skipped;
  const status = getStatusInfo(order);

  const checkCutoff = () => {
    const today = todayStr();
    if (order.date < today) {
      return { blocked: true, reason: 'This order is in the past and cannot be modified.' };
    }
    if (order.date > today) return { blocked: false };

    // Today's order, check cutoff
    const envTime = order.slot === 'lunch' 
      ? import.meta.env.VITE_LUNCH_CUTOFF_TIME 
      : import.meta.env.VITE_DINNER_CUTOFF_TIME;
      
    if (!envTime) return { blocked: false };

    const [hrs, mins] = envTime.split(':').map(Number);
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(hrs, mins, 0, 0);

    if (now > cutoff) {
      const slotName = order.slot === 'lunch' ? 'Lunch' : 'Dinner';
      const formattedCutoff = formatAMPM(cutoff);
      return { blocked: true, reason: `The cutoff time for today's ${slotName} (${formattedCutoff}) has already passed.` };
    }
    return { blocked: false };
  };

  const cutoffInfo = checkCutoff();

  const handleIntent = (action: 'skip' | 'edit') => {
    if (cutoffInfo.blocked) {
      setLockedReason(cutoffInfo.reason!);
      setLockedOpen(true);
      return;
    }
    if (action === 'skip') setSkipOpen(true);
    if (action === 'edit') {
      setEditType(order.type);
      setEditAddress(order.address);
      setIsCustomAddr(user ? ![user.address_1, user.address_2, user.address_3].includes(order.address) : true);
      setEditQty(order.quantity_ordered);
      setEditOpen(true);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await skipOrder(order.order_id);
      showToast('Order skipped successfully');
      setSkipOpen(false);
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to skip order', 'error');
    } finally {
      setIsSkipping(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const payload: UpdateOrderPayload = { order_id: order.order_id };
      if (editType !== order.type) payload.type = editType;
      if (editAddress !== order.address) payload.address = editAddress;
      if (editQty !== order.quantity_ordered) payload.quantity_ordered = editQty;
      await updateOrder(payload);
      showToast('Order updated!');
      setEditOpen(false);
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update order', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const savedAddresses = user
    ? [user.address_1, user.address_2, user.address_3].filter(Boolean)
    : [];

  return (
    <>
      <div className={`${styles.card} ${order.is_skipped ? styles.skipped : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.slotBadge}>
            {order.slot === 'lunch'
              ? <Sun size={15} className={styles.lunchIcon} />
              : <Moon size={15} className={styles.dinnerIcon} />}
            <span>{order.slot === 'lunch' ? 'Lunch' : 'Dinner'}</span>
          </div>
          <span className={`badge badge-${status.cls}`}>{status.label}</span>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.typeRow}>
            <VegIndicator type={order.type} />
            <span className={styles.typeLabel}>
              {order.type === 'veg' ? 'Veg' : 'Non-Veg'}
            </span>
            <span className={styles.qty}>· Qty: {order.quantity_ordered}</span>
          </div>

          <div className={styles.infoRow}>
            <MapPin size={13} className={styles.infoIcon} />
            <span className={styles.address}>
              {user ? getAddressLabel(order.address, user) : order.address}
            </span>
          </div>

          {order.is_delivered && order.delivered_at && (
            <div className={styles.infoRow}>
              <Clock size={13} className={styles.infoIcon} />
              <span className={styles.deliveredAt}>Delivered at {formatTime(order.delivered_at)}</span>
            </div>
          )}

          {order.is_delivered && (
            <div className={styles.infoRow}>
              <Zap size={13} className={styles.infoIcon} />
              <span className={styles.credits}>{order.credits_used} credit{order.credits_used !== 1 ? 's' : ''} used</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {canAct && (
          <div className={styles.actionsWrap}>
            <div className={styles.actions} style={cutoffInfo.blocked ? { opacity: 0.6, filter: 'grayscale(1)' } : {}}>
              <button className={`btn btn-sm btn-danger ${styles.actionBtn}`} onClick={() => handleIntent('skip')}>
                Skip
              </button>
              <button className={`btn btn-sm btn-secondary ${styles.actionBtn}`} onClick={() => handleIntent('edit')}>
                Edit
              </button>
            </div>
            {cutoffInfo.blocked && (
              <div className={styles.lockedNote}>
                {cutoffInfo.reason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skip Confirmation */}
      <BottomSheet isOpen={skipOpen} onClose={() => setSkipOpen(false)} title="Skip this meal?">
        <p className={styles.confirmText}>
          Are you sure you want to skip {order.slot === 'lunch' ? 'lunch' : 'dinner'} for this day?
          You won't be charged credits for a skipped meal.
        </p>
        {import.meta.env.VITE_SKIP_NOTE && (
          <p className={styles.confirmText} style={{ marginTop: 8, fontSize: '13px', color: 'var(--color-text-tertiary)', background: 'var(--color-surface-2)', padding: 12, borderRadius: 'var(--radius-md)' }}>
            <strong>Note:</strong> {import.meta.env.VITE_SKIP_NOTE}
          </p>
        )}
        <div className={styles.confirmActions}>
          <button className="btn btn-secondary" onClick={() => setSkipOpen(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleSkip} disabled={isSkipping}>
            {isSkipping ? 'Skipping…' : 'Yes, Skip Meal'}
          </button>
        </div>
      </BottomSheet>

      {/* Edit Order */}
      <BottomSheet isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Order">
        <div className={styles.editForm}>
          <div className="input-group">
            <label className="input-label">Meal Type</label>
            <div className={styles.typeToggle}>
              {(['veg', 'non-veg'] as const).map((t) => (
                <button
                  key={t}
                  className={`${styles.typeOption} ${editType === t ? styles.typeSelected : ''}`}
                  onClick={() => setEditType(t)}
                >
                  <VegIndicator type={t} size="sm" />
                  {t === 'veg' ? 'Veg' : 'Non-Veg'}
                </button>
              ))}
            </div>
          </div>

          {savedAddresses.length > 0 && (
            <div className="input-group">
              <label className="input-label">Deliver To</label>
              <div className={styles.addressOptions}>
                {savedAddresses.map((addr) => (
                  <label key={addr} className={`${styles.addressOption} ${!isCustomAddr && editAddress === addr ? styles.addressSelected : ''}`}>
                    <input
                      type="radio"
                      name="editAddress"
                      value={addr}
                      checked={!isCustomAddr && editAddress === addr}
                      onChange={() => {
                        setIsCustomAddr(false);
                        setEditAddress(addr);
                      }}
                    />
                    <MapPin size={14} />
                    <span>{addr}</span>
                  </label>
                ))}
                
                {/* Custom Manual Entry Option */}
                <label className={`${styles.addressOption} ${isCustomAddr ? styles.addressSelected : ''}`}>
                  <input
                    type="radio"
                    name="editAddress"
                    value="custom"
                    checked={isCustomAddr}
                    onChange={() => {
                      setIsCustomAddr(true);
                      setEditAddress('');
                    }}
                  />
                  <MapPin size={14} />
                  <span>Custom Address</span>
                </label>
              </div>

              {isCustomAddr && (
                <input
                  className="input-field"
                  style={{ marginTop: 8 }}
                  placeholder="Enter manual delivery address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  autoFocus
                />
              )}
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Quantity</label>
            <StepperInput value={editQty} onChange={setEditQty} min={1} max={10} />
          </div>

          <button className="btn btn-primary" onClick={handleSaveEdit} disabled={isSaving || (isCustomAddr && !editAddress.trim())}>
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </BottomSheet>

      {/* Locked / Blocked Dialog */}
      <BottomSheet isOpen={lockedOpen} onClose={() => setLockedOpen(false)} title="Action Blocked">
        <p className={styles.confirmText} style={{ color: 'var(--color-error)' }}>
          {lockedReason}
        </p>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setLockedOpen(false)}>Close</button>
        </div>
      </BottomSheet>
    </>
  );
}
