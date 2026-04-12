import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, User, Phone, Lock, MapPin, Check, Sun, Moon } from 'lucide-react';
import { onboardCustomer } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { loginCustomer } from '../../services/api';
import { ROUTES } from '../../utils/constants';
import { todayStr, addDays } from '../../utils/dates';
import DatePickerInput from '../../components/DatePickerInput/DatePickerInput';
import ActionProcessingLoader from '../../components/Loader/ActionProcessingLoader';
import styles from './RegisterPage.module.css';

type Plan = 'lunch' | 'dinner' | 'both';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 - Personal
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 - Addresses
  const [addr1, setAddr1] = useState('');
  const [addr2, setAddr2] = useState('');
  const [addr3, setAddr3] = useState('');

  // Step 3 - Plan
  const [plan, setPlan] = useState<Plan>('both');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(addDays(todayStr(), 6));

  const validateStep1 = () => {
    if (!name.trim()) { showToast('Enter your name', 'error'); return false; }
    if (!/^\d{10}$/.test(mobile)) { showToast('Enter a valid 10-digit mobile number', 'error'); return false; }
    if (password.length < 4) { showToast('Password must be at least 4 characters', 'error'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!addr1.trim()) { showToast('At least one delivery address is required', 'error'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (startDate > endDate) { showToast('End date must be after start date', 'error'); return; }
    setIsLoading(true);
    try {
      await onboardCustomer({
        name, mobile, password,
        address_1: addr1, address_2: addr2, address_3: addr3,
        plan, start_date: startDate, end_date: endDate,
      });
      // Auto login
      const res = await loginCustomer(mobile, password);
      setUser(res.customer);
      showToast('Welcome to Local Tiffin Service! 🎉');
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Estimated orders preview
  const daysDiff = Math.max(0, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
  const slotsPerDay = plan === 'both' ? 2 : 1;
  const estimatedOrders = daysDiff * slotsPerDay;

  return (
    <div className={styles.page}>
      <ActionProcessingLoader isOpen={isLoading} message={step === 3 ? "Welcome to the family! Setting everything up..." : undefined} />
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => { if (step > 1) setStep(step - 1); else navigate(ROUTES.LOGIN); }}
          aria-label="Go back"
        >
          <ChevronLeft size={22} />
        </button>
        <div className={styles.progress}>
          {[1,2,3].map((s) => (
            <div key={s} className={`${styles.progressDot} ${s <= step ? styles.progressActive : ''}`} />
          ))}
        </div>
        <span className={styles.stepLabel}>Step {step} of 3</span>
      </div>

      <div className={`${styles.content} page-content--no-nav`}>
        {/* Step 1 */}
        {step === 1 && (
          <div className={styles.stepContainer}>
            <h1 className={styles.stepTitle}>Create Account</h1>
            <p className={styles.stepDesc}>Join thousands enjoying homemade meals every day.</p>

            <div className={styles.fields}>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <div className="input-field-wrapper">
                  <User size={18} className="input-icon" />
                  <input className="input-field" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Mobile Number</label>
                <div className="input-field-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input className="input-field" type="tel" placeholder="10-digit number" maxLength={10}
                    value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-field-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input className="input-field" type="password" placeholder="Min. 4 characters"
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => { if (validateStep1()) setStep(2); }}>
              Next →
            </button>
            <p className={styles.loginLink}>
              Already have an account? <Link to={ROUTES.LOGIN} className={styles.link}>Login</Link>
            </p>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className={styles.stepContainer}>
            <h1 className={styles.stepTitle}>Delivery Addresses</h1>
            <p className={styles.stepDesc}>Save up to 3 different delivery locations (Home, Office, Other).</p>

            <div className={styles.fields}>
              <div className="input-group">
                <label className="input-label">🏠 Address 1 <span className={styles.required}>*required</span></label>
                <div className="input-field-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input className="input-field" placeholder="e.g. Building A, Street 1" value={addr1} onChange={(e) => setAddr1(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">🏢 Address 2 <span className={styles.optional}>optional</span></label>
                <div className="input-field-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input className="input-field" placeholder="e.g. Office Building, Floor 3" value={addr2} onChange={(e) => setAddr2(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">📍 Address 3 <span className={styles.optional}>optional</span></label>
                <div className="input-field-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input className="input-field" placeholder="e.g. Relative's place" value={addr3} onChange={(e) => setAddr3(e.target.value)} />
                </div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => { if (validateStep2()) setStep(3); }}>
              Next →
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className={styles.stepContainer}>
            <h1 className={styles.stepTitle}>Choose Your Plan</h1>
            <p className={styles.stepDesc}>Select your meal plan and start date.</p>

            <div className={styles.planOptions}>
              {([
                { value: 'lunch', label: 'Lunch Only', icon: <Sun size={22} />, desc: '1 meal/day' },
                { value: 'dinner', label: 'Dinner Only', icon: <Moon size={22} />, desc: '1 meal/day' },
                { value: 'both', label: 'Lunch & Dinner', icon: <><Sun size={18}/><Moon size={18}/></>, desc: '2 meals/day', recommended: true },
              ] as Array<{ value: Plan, label: string, icon: React.ReactNode, desc: string, recommended?: boolean }>).map(({ value, label, icon, desc, recommended }) => (
                <button
                  key={value}
                  className={`${styles.planCard} ${plan === value ? styles.planSelected : ''}`}
                  onClick={() => setPlan(value)}
                >
                  <span className={styles.planIcon}>{icon}</span>
                  <div className={styles.planInfo}>
                    <span className={styles.planLabel}>{label}</span>
                    <span className={styles.planDesc}>{desc}</span>
                  </div>
                  {recommended && <span className={styles.recommended}>Best value</span>}
                  {plan === value && <Check size={18} className={styles.checkIcon} />}
                </button>
              ))}
            </div>

            <div className={styles.dateRow}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Start Date</label>
                <DatePickerInput value={startDate} onChange={setStartDate} minDate={todayStr()} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">End Date</label>
                <DatePickerInput value={endDate} onChange={setEndDate} minDate={startDate} />
              </div>
            </div>

            {estimatedOrders > 0 && (
              <div className={styles.summary}>
                <span>📊 {daysDiff} day{daysDiff !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>🍱 {estimatedOrders} orders will be created</span>
              </div>
            )}

            <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Creating account…' : '🚀 Start my Tiffin Plan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
