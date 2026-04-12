import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { getOrdersByUser, getMenu } from '../../services/api';
import { useCache } from '../../hooks/useCache';
import { monthStartStr, monthEndStr, getDayLabel, getDayOfWeek } from '../../utils/dates';
import { CACHE_KEYS } from '../../utils/constants';
import Calendar from '../../components/Calendar/Calendar';
import OrderCard from '../../components/OrderCard/OrderCard';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import { CalendarSkeleton } from '../../components/Skeleton/Skeleton';
import type { Order, MenuItem } from '../../types';
import Footer from '../../components/Footer/Footer';
import styles from './MyOrdersPage.module.css';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(format(now, 'yyyy-MM-dd'));

  const cacheKey = CACHE_KEYS.ORDERS(year, month);

  const fetchOrders = useCallback(
    (isRefresh: boolean) => getOrdersByUser(user!.user_id, monthStartStr(year, month), monthEndStr(year, month), isRefresh).then(r => r.orders),
    [user, year, month]
  );

  const fetchMenu = useCallback(
    (isRefresh: boolean) => getMenu(undefined, undefined, isRefresh).then(r => r.menu),
    []
  );

  const { data: orders, isLoading: ordersLoading, isRefreshing: ordersRefreshing, refresh: refreshOrders } = useCache<Order[]>(cacheKey, fetchOrders);
  const { data: menu, isLoading: menuLoading, isRefreshing: menuRefreshing, refresh: refreshMenu } = useCache<MenuItem[]>('weekly_menu', fetchMenu, 24 * 60 * 60 * 1000);

  const refresh = async () => {
    await Promise.all([refreshOrders(), refreshMenu()]);
  };

  const isLoading = ordersLoading || menuLoading;
  const isRefreshing = ordersRefreshing || menuRefreshing;

  const handleMonthChange = (y: number, m: number) => {
    setYear(y); setMonth(m);
    setSelectedDate(format(new Date(y, m - 1, 1), 'yyyy-MM-dd'));
  };

  const selectedOrders = orders?.filter((o) => o.date === selectedDate) ?? [];

  if (isLoading) return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}>My Orders</h1></div>
      <div className="page-content" style={{ padding: 16 }}><CalendarSkeleton /></div>
      <Footer />
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>My Orders</h1>
        <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
      </div>

      <div className="page-content">
        <div className={styles.calendarWrap}>
          <Calendar
            year={year} month={month}
            orders={orders ?? []}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Selected day detail */}
        <div className={styles.dayDetail}>
          <div className={styles.dayHeader}>
            <h2 className={styles.dayTitle}>{getDayLabel(selectedDate)}</h2>
            <span className={styles.orderCount}>
              {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''}
            </span>
          </div>

          {selectedOrders.length === 0 ? (
            <div className={styles.emptyDay}>
              <p>No orders for this day</p>
            </div>
          ) : (
            <div className={styles.orderList}>
              {/* Sort lunch first */}
              {[...selectedOrders].sort((a) => a.slot === 'lunch' ? -1 : 1).map((o) => {
                const day = getDayOfWeek(new Date(o.date));
                const item = menu?.find(m => m.day === day && m.slot === o.slot);
                return (
                  <OrderCard 
                    key={o.order_id} 
                    order={o} 
                    onRefresh={refresh} 
                    description={item?.description} 
                  />
                );
              })}
            </div>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}
