import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coins, ChevronRight, PlusCircle, CalendarRange, Utensils } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getOrdersByUser } from '../../services/api';
import { useCache } from '../../hooks/useCache';
import { todayStr, tomorrowStr, getDayLabel } from '../../utils/dates';
import { ROUTES } from '../../utils/constants';
import OrderCard from '../../components/OrderCard/OrderCard';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import { HomePageSkeleton } from '../../components/Skeleton/Skeleton';
import type { Order } from '../../types';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const today = todayStr();
  const tomorrow = tomorrowStr();

  const fetcher = useCallback(
    () => getOrdersByUser(user!.user_id, today, tomorrow).then((r) => r.orders),
    [user?.user_id, today, tomorrow]
  );

  const { data: orders, isLoading, isRefreshing, refresh } = useCache<Order[]>(
    `home_orders_${today}`,
    fetcher
  );

  const handleRefresh = async () => {
    await Promise.all([refresh(), refreshUser()]);
  };

  const todayOrders  = orders?.filter((o) => o.date === today) ?? [];
  const tomorrowOrders = orders?.filter((o) => o.date === tomorrow) ?? [];

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const creditBalance = user?.credit_balance ?? 0;

  if (isLoading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className="skeleton" style={{ height: 20, width: 140, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 14, width: 90, borderRadius: 6, marginTop: 6 }} />
        </div>
      </div>
      <div className="page-content"><HomePageSkeleton /></div>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>Hi, {firstName}! 👋</h1>
          <p className={styles.subGreeting}>What's for today?</p>
        </div>
        <RefreshButton onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      </div>

      <div className="page-content">
        {/* Credit Card */}
        <div className={styles.creditCard}>
          <div className={styles.creditLeft}>
            <div className={styles.creditIcon}><Coins size={22} /></div>
            <div>
              <p className={styles.creditLabel}>Credit Balance</p>
              <p className={styles.creditValue}>{creditBalance}</p>
              <p className={styles.creditSub}>credits remaining</p>
            </div>
          </div>
          <div className={styles.creditRight}>
            <div className={styles.creditBar}>
              <div className={styles.creditBarFill} style={{ width: `${Math.min(100, (creditBalance / 60) * 100)}%` }} />
            </div>
            <p className={styles.creditNote}>1 credit = 1 meal</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button className={styles.qa} onClick={() => navigate(ROUTES.ADD_MEAL)}>
            <PlusCircle size={20} className={styles.qaIcon} />
            <span>Add Meal</span>
          </button>
          <button className={styles.qa} onClick={() => navigate(ROUTES.EXTEND_PLAN)}>
            <CalendarRange size={20} className={styles.qaIcon} />
            <span>Extend Plan</span>
          </button>
          <button className={styles.qa} onClick={() => navigate(ROUTES.ORDERS)}>
            <CalendarRange size={20} className={styles.qaIcon} />
            <span>My Orders</span>
          </button>
        </div>

        {/* Today */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Today's Meals</h2>
            <span className={styles.sectionDate}>{getDayLabel(today)}</span>
          </div>
          {todayOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <Utensils size={32} className={styles.emptyIcon} />
              <p>No meals scheduled today</p>
              <button className={`btn btn-sm btn-ghost`} onClick={() => navigate(ROUTES.ADD_MEAL)}>
                + Add a meal
              </button>
            </div>
          ) : (
            <div className={styles.orderList}>
              {todayOrders.map((o) => <OrderCard key={o.order_id} order={o} onRefresh={refresh} />)}
            </div>
          )}
        </section>

        {/* Tomorrow */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Tomorrow's Meals</h2>
            <span className={styles.sectionDate}>{getDayLabel(tomorrow)}</span>
          </div>
          {tomorrowOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No meals scheduled for tomorrow</p>
              <button className={`btn btn-sm btn-ghost`} onClick={() => navigate(ROUTES.ADD_MEAL)}>
                + Add a meal
              </button>
            </div>
          ) : (
            <div className={styles.orderList}>
              {tomorrowOrders.map((o) => <OrderCard key={o.order_id} order={o} onRefresh={refresh} />)}
            </div>
          )}
        </section>

        {/* Report Banner */}
        <Link to={ROUTES.REPORT} className={styles.reportBanner}>
          <div className={styles.reportBannerLeft}>
            <span className={styles.reportBannerIcon}>📊</span>
            <div>
              <p className={styles.reportBannerTitle}>Monthly Report</p>
              <p className={styles.reportBannerDesc}>Track your orders & credits</p>
            </div>
          </div>
          <ChevronRight size={20} className={styles.reportChevron} />
        </Link>
      </div>
    </div>
  );
}
