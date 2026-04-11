import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROUTES } from '../../utils/constants';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const { showToast } = useToast();

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) { showToast('Enter a valid 10-digit mobile number', 'error'); return; }
    if (!password) { showToast('Enter your password', 'error'); return; }
    try {
      await login(mobile, password);
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Login failed', 'error');
    }
  };

  return (
    <div className={styles.page}>
      {/* Background */}
      <div className={styles.bg}>
        <img src="/bg.png" alt="" className={styles.bgImg} />
        <div className={styles.bgOverlay} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <img src="/logo.png" alt="Local Tiffin Service" className={styles.logo} />
        </div>

        <h1 className={styles.brand}>Local Tiffin Service</h1>
        <p className={styles.tagline}>Homemade meals, delivered daily</p>

        {/* Form card */}
        <form className={styles.form} onSubmit={handleLogin} noValidate>
          <h2 className={styles.formTitle}>Welcome back 👋</h2>

          <div className="input-group">
            <label className={styles.label} htmlFor="mobile">Mobile Number</label>
            <div className="input-field-wrapper">
              <Phone size={18} className="input-icon" />
              <input
                id="mobile"
                type="tel"
                className="input-field"
                placeholder="10-digit mobile number"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="input-group">
            <label className={styles.label} htmlFor="password">Password</label>
            <div className="input-field-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                className={`input-field ${styles.passwordInput}`}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary ${styles.loginBtn}`}
            disabled={isLoading}
          >
            {isLoading
              ? <span className={styles.spinner} />
              : <><span>Login</span><ArrowRight size={18} /></>
            }
          </button>

          <p className={styles.register}>
            New customer?{' '}
            <Link to={ROUTES.REGISTER} className={styles.registerLink}>
              Create account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
