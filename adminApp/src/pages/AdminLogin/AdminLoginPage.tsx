import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import styles from './AdminLoginPage.module.css';

export function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { isAdmin, login } = useAuth();
  const navigate = useNavigate();

  // Already logged in — redirect via component, not imperative navigate during render
  if (isAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Please enter the admin password');
      return;
    }
    const success = login(password);
    if (success) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    } else {
      setError('Invalid password');
      setPassword('');
    }
  };

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(ROUTES.DELIVERY)}>
        <ArrowLeft size={20} />
        <span>Back to Delivery</span>
      </button>

      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Shield size={32} />
        </div>
        <h1 className={styles.title}>Admin Portal</h1>
        <p className={styles.subtitle}>Enter password to access the operations dashboard</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrap}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              type="password"
              className={`input-field ${styles.input}`}
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-full">
            Enter Admin Portal
          </button>
        </form>
      </div>
    </div>
  );
}
