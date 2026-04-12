import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { extendPlan } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { todayStr, addDays } from '../../utils/dates';
import { ROUTES } from '../../utils/constants';
import StepperInput from '../../components/StepperInput/StepperInput';
import DatePickerInput from '../../components/DatePickerInput/DatePickerInput';
import ActionProcessingLoader from '../../components/Loader/ActionProcessingLoader';
import styles from './ExtendPlanPage.module.css';

type Plan = 'lunch' | 'dinner' | 'both';

export default function ExtendPlanPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<Plan>('both');
  const [startDate, setStartDate] = useState(todayStr());
  const [days, setDays] = useState(7);
  const [hasDaysError, setHasDaysError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const endDate = useMemo(() => addDays(startDate, days - 1), [startDate, days]);
  const totalOrders = days * (plan === 'both' ? 2 : 1);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await extendPlan({ user_id: user!.user_id, plan, days, start_date: startDate });
      showToast(`Plan extended! ${res.orders_created} orders created 🎉`);
      navigate(ROUTES.ORDERS);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to extend plan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const planOptions: { value: Plan; label: string; icon: React.ReactNode }[] = [
    { value: 'lunch', label: 'Lunch Only', icon: <Sun size={18} /> },
    { value: 'dinner', label: 'Dinner Only', icon: <Moon size={18} /> },
    { value: 'both', label: 'Both Meals', icon: <><Sun size={16}/><Moon size={16}/></> },
  ];

  return (
    <div className={styles.page}>
      <ActionProcessingLoader isOpen={isLoading} />
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className={styles.pageTitle}>Extend Plan</h1>
      </div>

      <div className={`${styles.content} page-content`}>
        <p className={styles.desc}>Extend your tiffin subscription for more days.</p>

        {/* Plan selector */}
        <div className="input-group">
          <label className="input-label">Meal Plan</label>
          <div className={styles.planGrid}>
            {planOptions.map(({ value, label, icon }) => (
              <button
                key={value}
                className={`${styles.planBtn} ${plan === value ? styles.planSelected : ''}`}
                onClick={() => setPlan(value)}
              >
                <span className={styles.planIcon}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Start date reminder note */}
        <div className={styles.infoNote}>
          📝 Please make sure to select your <strong>Start Date</strong> correctly. Plans are activated from the chosen date.
        </div>

        {/* Start date */}
        <div className="input-group">
          <label className="input-label">📅 Start Date</label>
          <DatePickerInput value={startDate} onChange={setStartDate} minDate={todayStr()} />
        </div>

        {/* Days stepper */}
        <div className="input-group">
          <label className="input-label">Number of Days (max 30)</label>
          <StepperInput value={days} onChange={setDays} onError={setHasDaysError} min={1} max={30} />
          {hasDaysError && <span className={styles.errorText}>Please enter a valid number of days (1-30).</span>}
        </div>

        {/* Summary card */}
        <div className={styles.summary}>
          <h3 className={styles.summaryTitle}>Plan Summary</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Plan</span>
              <span className={styles.summaryValue}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Duration</span>
              <span className={styles.summaryValue}>{days} day{days !== 1 ? 's' : ''}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Start</span>
              <span className={styles.summaryValue}>{startDate}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>End</span>
              <span className={styles.summaryValue}>{endDate}</span>
            </div>
          </div>
          <div className={styles.summaryOrders}>
            🍱 {totalOrders} total orders will be created
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading || hasDaysError}>
          {isLoading ? 'Extending plan…' : '📅 Extend Plan'}
        </button>
      </div>
    </div>
  );
}
