import { useState } from 'react';
import { Coins, User, Phone, MapPin, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateCustomer } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import Footer from '../../components/Footer/Footer';
import { ProfileSkeleton } from '../../components/Skeleton/Skeleton';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Edit states
  const [nameOpen, setNameOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);

  const [newName, setNewName] = useState(user?.name ?? '');
  const [newPwd, setNewPwd] = useState('');
  const [addr1, setAddr1] = useState(user?.address_1 ?? '');
  const [addr2, setAddr2] = useState(user?.address_2 ?? '');
  const [addr3, setAddr3] = useState(user?.address_3 ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshUser(); }
    finally { setIsRefreshing(false); }
  };

  const save = async (payload: Record<string, string>) => {
    setIsSaving(true);
    try {
      await updateCustomer({ user_id: user!.user_id, ...payload });
      await refreshUser();
      showToast('Profile updated!');
      setNameOpen(false); setPwdOpen(false); setAddrOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally { setIsSaving(false); }
  };

  const handleLogout = () => { logout(); navigate(ROUTES.LOGIN, { replace: true }); };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() ?? '?';

  if (!user) return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}>My Profile</h1></div>
      <div className="page-content" style={{ padding: 16 }}><ProfileSkeleton /></div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>My Profile</h1>
        <RefreshButton onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      </div>

      <div className="page-content">
        {/* User card */}
        <div className={styles.userCard}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <h2 className={styles.userName}>{user.name}</h2>
            <div className={styles.userMeta}>
              <Phone size={13} />
              <span>{user.mobile}</span>
            </div>
            <div className={styles.userMeta}>
              <span className={styles.since}>Member since {user.created_at?.split('T')[0] ?? '—'}</span>
            </div>
          </div>
          <button className={styles.creditBadge} onClick={() => navigate(ROUTES.CREDIT_HISTORY)}>
            <Coins size={14} />
            <span>{user.credit_balance ?? 0}</span>
          </button>
        </div>

        {/* Account settings */}
        <div className={styles.settingsList}>
          <h3 className={styles.settingsTitle}>Account</h3>

          <button className={styles.settingsItem} onClick={() => { setNewName(user.name); setNameOpen(true); }}>
            <User size={18} className={styles.settingsIcon} />
            <div className={styles.settingsText}>
              <span className={styles.settingsLabel}>Full Name</span>
              <span className={styles.settingsValue}>{user.name}</span>
            </div>
            <ChevronRight size={16} className={styles.settingsChevron} />
          </button>

          <button className={styles.settingsItem} onClick={() => { setNewPwd(''); setPwdOpen(true); }}>
            <span className={styles.settingsIcon}>🔒</span>
            <div className={styles.settingsText}>
              <span className={styles.settingsLabel}>Password</span>
              <span className={styles.settingsValue}>••••••••</span>
            </div>
            <ChevronRight size={16} className={styles.settingsChevron} />
          </button>

          <button className={styles.settingsItem} onClick={() => {
            setAddr1(user.address_1 ?? '');
            setAddr2(user.address_2 ?? '');
            setAddr3(user.address_3 ?? '');
            setAddrOpen(true);
          }}>
            <MapPin size={18} className={styles.settingsIcon} />
            <div className={styles.settingsText}>
              <span className={styles.settingsLabel}>Delivery Addresses</span>
              <span className={styles.settingsValue}>{user.address_1 || 'Not set'}</span>
            </div>
            <ChevronRight size={16} className={styles.settingsChevron} />
          </button>
        </div>

        {/* Logout */}
        <button className={styles.logoutBtn} onClick={() => setLogoutOpen(true)}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>

        {/* Business Guidelines */}
        {import.meta.env.VITE_BUSINESS_RULES && (
          <div className={styles.rulesSection}>
            <h4 className={styles.rulesTitle}>Service Policies & Guidelines</h4>
            <div className={styles.rulesBox}>
              {import.meta.env.VITE_BUSINESS_RULES.split('|').map((rule: string, idx: number) => (
                <p key={idx} className={styles.ruleItem}>
                  {rule.trim()}
                </p>
              ))}
            </div>
          </div>
        )}
        <Footer />
      </div>

      {/* Edit Name */}
      <BottomSheet isOpen={nameOpen} onClose={() => setNameOpen(false)} title="Edit Name">
        <div className={styles.editForm}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input className="input-field" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Your name" />
          </div>
          <button className="btn btn-primary" onClick={() => save({ name: newName })} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Name'}
          </button>
        </div>
      </BottomSheet>

      {/* Edit Password */}
      <BottomSheet isOpen={pwdOpen} onClose={() => setPwdOpen(false)} title="Change Password">
        <div className={styles.editForm}>
          <div className="input-group">
            <label className="input-label">Current Password</label>
            <input className="input-field" type="text" value={user?.password ?? ''} readOnly style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }} />
          </div>
          <div className="input-group" style={{ marginTop: '8px' }}>
            <label className="input-label">New Password</label>
            <input className="input-field" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 4 characters" />
          </div>
          <button className="btn btn-primary" onClick={() => save({ password: newPwd })} disabled={isSaving || newPwd.length < 4}>
            {isSaving ? 'Saving…' : 'Update Password'}
          </button>
        </div>
      </BottomSheet>

      {/* Edit Addresses */}
      <BottomSheet isOpen={addrOpen} onClose={() => setAddrOpen(false)} title="Manage Addresses">
        <div className={styles.editForm}>
          <div className="input-group">
            <label className="input-label">🏠 Address 1 <span className={styles.required}>*</span></label>
            <input className="input-field" value={addr1} onChange={e => setAddr1(e.target.value)} placeholder="Primary address" />
          </div>
          <div className="input-group">
            <label className="input-label">🏢 Address 2 <span className={styles.optional}>optional</span></label>
            <input className="input-field" value={addr2} onChange={e => setAddr2(e.target.value)} placeholder="Office or alternate" />
          </div>
          <div className="input-group">
            <label className="input-label">📍 Address 3 <span className={styles.optional}>optional</span></label>
            <input className="input-field" value={addr3} onChange={e => setAddr3(e.target.value)} placeholder="Other location" />
          </div>
          <button className="btn btn-primary" onClick={() => save({ address_1: addr1, address_2: addr2, address_3: addr3 })} disabled={isSaving || !addr1}>
            {isSaving ? 'Saving…' : 'Save Addresses'}
          </button>
        </div>
      </BottomSheet>

      {/* Logout Confirm */}
      <BottomSheet isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} title="Logout?">
        <p className={styles.confirmText}>Are you sure you want to logout? All cached data will be cleared.</p>
        <div className={styles.confirmActions}>
          <button className="btn btn-secondary" onClick={() => setLogoutOpen(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleLogout}>Yes, Logout</button>
        </div>
      </BottomSheet>
    </div>
  );
}
