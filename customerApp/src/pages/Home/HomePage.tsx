import { useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coins, ChevronRight, PlusCircle, CalendarRange, Clock, Utensils } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getOrdersByUser, getMenu } from '../../services/api';
import { useCache } from '../../hooks/useCache';
import { todayStr, tomorrowStr, getDayLabel, getDayOfWeek } from '../../utils/dates';
import { ROUTES } from '../../utils/constants';
import OrderCard from '../../components/OrderCard/OrderCard';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import PullToRefresh from '../../components/PullToRefresh/PullToRefresh';
import { HomePageSkeleton } from '../../components/Skeleton/Skeleton';
import type { Order, MenuItem } from '../../types';
import Footer from '../../components/Footer/Footer';
import styles from './HomePage.module.css';


function NextMealCard({ menu }: { menu: MenuItem[] }) {
  const currentHour = new Date().getHours();
  const navigate = useNavigate();
  
  const { slot, day, label } = useMemo(() => {
    if (currentHour < 16) return { slot: 'lunch' as const, day: getDayOfWeek(), label: "Today's Lunch" };
    if (currentHour < 23) return { slot: 'dinner' as const, day: getDayOfWeek(), label: "Today's Dinner" };
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { slot: 'lunch' as const, day: getDayOfWeek(tomorrow), label: "Tomorrow's Lunch" };
  }, [currentHour]);

  const meal = menu.find(m => m.day === day && m.slot === slot);

  if (!meal) return null;

  return (
    <div className={styles.nextMealCard} onClick={() => navigate(ROUTES.WEEKLY_MENU)} style={{ cursor: 'pointer' }}>
      <div className={styles.nextMealBadge}>NEXT MEAL</div>
      <div className={styles.nextMealHeader}>
        <Clock size={16} className={styles.nextMealIcon} />
        <span className={styles.nextMealTitle}>{label}</span>
      </div>
      <div>
        <h3 className={styles.nextMealDish}>{meal.dish_name}</h3>
        <p className={styles.nextMealDesc}>{meal.description}</p>
      </div>
      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600 }}>
        <span>View Weekly Menu</span>
        <ChevronRight size={14} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const today = todayStr();
  const tomorrow = tomorrowStr();

  const fetchOrders = useCallback(
    (isRefresh: boolean) => getOrdersByUser(user!.user_id, today, tomorrow, isRefresh).then((r) => r.orders),
    [user, today, tomorrow]
  );

  const fetchMenu = useCallback(
    (isRefresh: boolean) => getMenu(undefined, undefined, isRefresh).then(r => r.menu),
    []
  );

  const { data: orders, isLoading: ordersLoading, isRefreshing: ordersRefreshing, refresh: refreshOrders } = useCache<Order[]>(
    `home_orders_${today}`,
    fetchOrders
  );

  const { data: menu, isLoading: menuLoading, isRefreshing: menuRefreshing, refresh: refreshMenu } = useCache<MenuItem[]>(
    'weekly_menu',
    fetchMenu,
    24 * 60 * 60 * 1000 // Cache for 24 hours
  );

  const handleRefresh = async () => {
    await Promise.all([refreshOrders(), refreshMenu(), refreshUser()]);
  };

  const todayOrders  = orders?.filter((o) => o.date === today) ?? [];
  const tomorrowOrders = orders?.filter((o) => o.date === tomorrow) ?? [];

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const creditBalance = user?.credit_balance ?? 0;

  const isLoading = ordersLoading || menuLoading;
  const isRefreshing = ordersRefreshing || menuRefreshing;

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
      
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="page-content">
        {/* Credit Card */}
        <div className={styles.creditCard} onClick={() => navigate(ROUTES.CREDIT_HISTORY)} style={{ cursor: 'pointer' }}>
          <div className={styles.creditLeft}>
            <div className={styles.creditIcon}><Coins size={22} /></div>
            <div>
              <p className={styles.creditLabel}>Credit Balance</p>
              <p className={styles.creditValue}>{creditBalance}</p>
              <p className={styles.creditSub}>credits remaining</p>
            </div>
          </div>
          <div className={styles.creditRight}>
            <p className={styles.creditNote}>1 credit = 1 meal</p>
            <ChevronRight size={20} style={{ opacity: 0.6, marginTop: 8 }} />
          </div>
        </div>

        {/* Next Slot Menu */}
        {menu && <NextMealCard menu={menu} />}

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
              {todayOrders.map((o) => {
                const day = getDayOfWeek(new Date(o.date));
                const item = menu?.find(m => m.day === day && m.slot === o.slot);
                return (
                  <OrderCard 
                    key={o.order_id} 
                    order={o} 
                    onRefresh={refreshOrders} 
                    description={item?.description} 
                  />
                );
              })}
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
              {tomorrowOrders.map((o) => {
                const day = getDayOfWeek(new Date(o.date));
                const item = menu?.find(m => m.day === day && m.slot === o.slot);
                return (
                  <OrderCard 
                    key={o.order_id} 
                    order={o} 
                    onRefresh={refreshOrders} 
                    description={item?.description} 
                  />
                );
              })}
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

        <Footer />
      </div>
      </PullToRefresh>
    </div>
  );
}
