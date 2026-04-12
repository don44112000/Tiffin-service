import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, PlusCircle, BarChart2, User } from 'lucide-react';
import { ROUTES } from '../../utils/constants';
import styles from './BottomNav.module.css';

const tabs = [
  { to: ROUTES.HOME, icon: Home, label: 'Home' },
  { to: ROUTES.ORDERS, icon: CalendarDays, label: 'My Orders' },
  { to: ROUTES.ADD_MEAL, icon: PlusCircle, label: 'Add Meal', highlight: true },
  { to: ROUTES.REPORT, icon: BarChart2, label: 'Report' },
  { to: ROUTES.PROFILE, icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      {tabs.map(({ to, icon: Icon, label, highlight }) => (
        <NavLink
          key={to}
          to={to}
          end={to === ROUTES.HOME}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''} ${highlight ? styles.highlight : ''}`
          }
        >
          <span className={styles.iconWrap}>
            <Icon size={22} strokeWidth={2} />
          </span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
