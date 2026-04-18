import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  CalendarCheck,
  Menu,
  X,
  Truck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { path: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { path: ROUTES.CUSTOMERS, label: 'Customers', icon: Users },
  { path: ROUTES.MENU, label: 'Menu', icon: UtensilsCrossed },
  { path: ROUTES.RECONCILIATION, label: 'Reconcile', icon: CalendarCheck },
];

interface Props {
  children: ReactNode;
}

export function AppLayout({ children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.DELIVERY);
  };

  const navContent = (
    <>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>T</span>
        <div>
          <div className={styles.brandName}>Tiffin Admin</div>
          <div className={styles.brandTag}>Operations Portal</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.madeWith}>
        Made with <span className={styles.heart}>❤️</span> by&nbsp;
        <a
          href="https://www.linkedin.com/in/omlokhande/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.madeWithLink}
        >
          Om Lokhande
        </a>
      </div>

      <div className={styles.sidebarFooter}>
        <button
          className={styles.navItem}
          onClick={() => {
            setDrawerOpen(false);
            navigate(ROUTES.DELIVERY);
          }}
        >
          <Truck size={20} />
          <span>Agent View</span>
        </button>
        <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.layout}>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>{navContent}</aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
          <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <button className={styles.drawerClose} onClick={() => setDrawerOpen(false)}>
              <X size={24} />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className={styles.main}>
        {/* Mobile topbar */}
        <header className={styles.topbar}>
          <button className={styles.hamburger} onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </button>
          <span className={styles.topbarTitle}>Tiffin Admin</span>
          <div style={{ width: 40 }} />
        </header>

        <div className={styles.content}>{children}</div>

        {/* Mobile bottom nav */}
        <nav className={styles.bottomNav}>
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `${styles.bottomNavItem} ${isActive ? styles.bottomNavActive : ''}`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
