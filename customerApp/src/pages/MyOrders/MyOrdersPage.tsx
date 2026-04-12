import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { getOrdersByUser } from '../../services/api';
import { useCache } from '../../hooks/useCache';
import { monthStartStr, monthEndStr, getDayLabel } from '../../utils/dates';
import { CACHE_KEYS } from '../../utils/constants';
import Calendar from '../../components/Calendar/Calendar';
import OrderCard from '../../components/OrderCard/OrderCard';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import { CalendarSkeleton } from '../../components/Skeleton/Skeleton';
import type { Order } from '../../types';
import styles from './MyOrdersPage.module.css';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(format(now, 'yyyy-MM-dd'));

  const cacheKey = CACHE_KEYS.ORDERS(year, month);

  const fetcher = useCallback(
    (isRefresh: boolean) => getOrdersByUser(user!.user_id, monthStartStr(year, month), monthEndStr(year, month), isRefresh).then(r => r.orders),
    [user, year, month]
  );

  const { data: orders, isLoading, isRefreshing, refresh } = useCache<Order[]>(cacheKey, fetcher);

  const handleMonthChange = (y: number, m: number) => {
    setYear(y); setMonth(m);
    setSelectedDate(format(new Date(y, m - 1, 1), 'yyyy-MM-dd'));
  };

  const selectedOrders = orders?.filter((o) => o.date === selectedDate) ?? [];

  if (isLoading) return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}>My Orders</h1></div>
      <div className="page-content" style={{ padding: 16 }}><CalendarSkeleton /></div>
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
              {[...selectedOrders].sort((a) => a.slot === 'lunch' ? -1 : 1).map((o) => (
                <OrderCard key={o.order_id} order={o} onRefresh={refresh} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
