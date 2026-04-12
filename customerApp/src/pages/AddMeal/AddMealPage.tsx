import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sun, Moon, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { addOrderSlot } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { todayStr } from '../../utils/dates';
import { checkCutoff } from '../../utils/business';
import { ROUTES } from '../../utils/constants';
import VegIndicator from '../../components/VegIndicator/VegIndicator';
import StepperInput from '../../components/StepperInput/StepperInput';
import DatePickerInput from '../../components/DatePickerInput/DatePickerInput';
import styles from './AddMealPage.module.css';

export default function AddMealPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState<'lunch' | 'dinner'>('lunch');
  const [type, setType] = useState<'veg' | 'non-veg'>('veg');
  const [qty, setQty] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const savedAddresses = [user?.address_1, user?.address_2, user?.address_3].filter(Boolean) as string[];
  const [selectedAddress, setSelectedAddress] = useState(savedAddresses[0] ?? '');

  const cutoffInfo = checkCutoff(date, slot);

  const handleSubmit = async () => {
    if (!selectedAddress) { showToast('Please select an address', 'error'); return; }
    setIsLoading(true);
    try {
      await addOrderSlot({
        user_id: user!.user_id,
        date, slot,
        address: selectedAddress,
        type, quantity_ordered: qty,
      });
      showToast('Meal added successfully! 🍱');
      navigate(ROUTES.ORDERS);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add meal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className={styles.pageTitle}>Add a Meal</h1>
      </div>

      <div className={`${styles.content} page-content`}>
        {/* Date */}
        <div className="input-group">
          <label className="input-label">📅 Date</label>
          <DatePickerInput value={date} onChange={setDate} minDate={todayStr()} />
        </div>

        {/* Slot */}
        <div className="input-group">
          <label className="input-label">Meal Time</label>
          <div className={styles.toggle}>
            {(['lunch', 'dinner'] as const).map((s) => (
              <button
                key={s}
                className={`${styles.toggleBtn} ${slot === s ? styles.toggleSelected : ''}`}
                onClick={() => setSlot(s)}
              >
                {s === 'lunch' ? <Sun size={18} className={styles.lunchIcon} /> : <Moon size={18} className={styles.dinnerIcon} />}
                <span>{s === 'lunch' ? 'Lunch' : 'Dinner'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="input-group">
          <label className="input-label">Meal Type</label>
          <div className={styles.toggle}>
            {(['veg', 'non-veg'] as const).map((t) => (
              <button
                key={t}
                className={`${styles.toggleBtn} ${type === t ? styles.toggleSelected : ''}`}
                onClick={() => setType(t)}
              >
                <VegIndicator type={t} size="sm" />
                <span>{t === 'veg' ? 'Veg' : 'Non-Veg'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        {savedAddresses.length > 0 && (
          <div className="input-group">
            <label className="input-label">📍 Deliver To</label>
            <div className={styles.addressList}>
              {savedAddresses.map((addr) => (
                <label
                  key={addr}
                  className={`${styles.addressOption} ${selectedAddress === addr ? styles.addressSelected : ''}`}
                >
                  <input type="radio" name="address" value={addr} checked={selectedAddress === addr}
                    onChange={() => setSelectedAddress(addr)} className={styles.radioHidden} />
                  <MapPin size={15} className={styles.addrIcon} />
                  <span className={styles.addrText}>{addr}</span>
                  {selectedAddress === addr && <span className={styles.addrCheck}>✓</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Cutoff Warning */}
        {cutoffInfo.blocked && (
          <div className={styles.cutoffWarning}>
            <p className={styles.warningText}>
              <strong>⚠️ Action Blocked:</strong> {cutoffInfo.reason}
            </p>
          </div>
        )}

        {/* Quantity */}
        <div className="input-group">
          <label className="input-label">Quantity</label>
          <StepperInput value={qty} onChange={setQty} min={1} max={10} />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading || cutoffInfo.blocked}>
          {isLoading ? 'Adding meal…' : '🍱 Add Meal'}
        </button>
      </div>
    </div>
  );
}
