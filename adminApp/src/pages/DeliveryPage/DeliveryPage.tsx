import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Shield, Sun, Moon, Package, CheckCircle, Clock, Minus } from 'lucide-react';
import { useCache } from '../../hooks/useCache';
import { useRefreshOnReload } from '../../hooks/useRefreshOnReload';
import { useToast } from '../../context/ToastContext';
import { getOrdersByDateSlot, markDelivered } from '../../services/api';
import { PullToRefresh } from '../../components/PullToRefresh/PullToRefresh';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { DatePickerInput } from '../../components/DatePickerInput/DatePickerInput';
import { OrderDeliveryCard } from '../../components/OrderDeliveryCard/OrderDeliveryCard';
import { DeliveryPageSkeleton } from '../../components/Skeleton/Skeleton';
import { ROUTES, CACHE_KEYS, CACHE_TTL_SHORT } from '../../utils/constants';
import { getToday, getTomorrow, getCurrentSlot } from '../../utils/dates';
import { invalidateCache } from '../../utils/cache';
import type { OrdersByDateSlotResponse, GroupedOrders, Order } from '../../types';
import styles from './DeliveryPage.module.css';

export function DeliveryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const isAdminView = location.pathname.startsWith('/admin/');

  const [date, setDate] = useState(() => searchParams.get('date') || getToday());
  const [slot, setSlot] = useState<'lunch' | 'dinner'>(() => {
    const s = searchParams.get('slot');
    return s === 'lunch' || s === 'dinner' ? s : getCurrentSlot();
  });
  const [search, setSearch] = useState('');

  // Local optimistic state: tracks orders we just delivered on the frontend
  const [localDelivered, setLocalDelivered] = useState<
    Record<string, { qty: number; time: string }>
  >({});

  const cacheKey = CACHE_KEYS.ORDERS(date, slot);

  const fetcher = useCallback(
    (isRefresh: boolean) => getOrdersByDateSlot(date, slot, !isRefresh),
    [date, slot]
  );

  const { data, isLoading, isRefreshing, error, refresh } = useCache<OrdersByDateSlotResponse>(
    cacheKey,
    fetcher,
    CACHE_TTL_SHORT
  );

  useRefreshOnReload(refresh);

  // Clear local delivered state when date/slot changes
  useEffect(() => {
    setLocalDelivered({});
  }, [cacheKey]);

  // Apply local optimistic updates to the data
  const groups: GroupedOrders[] = useMemo(() => {
    if (!data?.grouped) return [];
    return data.grouped.map((g) => ({
      ...g,
      orders: g.orders.map((o): Order => {
        const local = localDelivered[o.order_id];
        if (local) {
          return {
            ...o,
            is_delivered: true,
            quantity_delivered: local.qty,
            delivered_at: local.time,
          };
        }
        return o;
      }),
    }));
  }, [data, localDelivered]);

  // Sort groups: groups with ALL orders delivered/skipped go to the bottom
  const sortedGroups: GroupedOrders[] = useMemo(() => {
    return [...groups].sort((a, b) => {
      const allDoneA = a.orders.every((o) => o.is_delivered || o.is_skipped);
      const allDoneB = b.orders.every((o) => o.is_delivered || o.is_skipped);
      if (allDoneA && !allDoneB) return 1;
      if (!allDoneA && allDoneB) return -1;
      return 0;
    });
  }, [groups]);

  // Filter groups by search
  const filteredGroups: GroupedOrders[] = useMemo(() => {
    if (!search.trim()) return sortedGroups;
    const q = search.toLowerCase();
    return sortedGroups.filter(
      (g) =>
        g.customer_name.toLowerCase().includes(q) ||
        g.orders.some((o) => o.address.toLowerCase().includes(q))
    );
  }, [sortedGroups, search]);

  // Stats from all groups (with optimistic updates applied)
  const stats = useMemo(() => {
    let total = 0, delivered = 0, skipped = 0, qtyOrdered = 0, qtyDelivered = 0;
    for (const g of groups) {
      for (const o of g.orders) {
        total++;
        qtyOrdered += o.quantity_ordered;
        if (o.is_delivered) {
          delivered++;
          qtyDelivered += o.quantity_delivered;
        } else if (o.is_skipped) skipped++;
      }
    }
    const toPrepare = total - skipped; // orders that need delivery
    const pending = Math.max(0, toPrepare - delivered); // never negative
    const extraDelivered = qtyDelivered > qtyOrdered ? qtyDelivered - qtyOrdered : 0;
    return { total, delivered, pending, skipped, toPrepare, extraDelivered };
  }, [groups]);

  const handleDeliver = async (orderId: string, qty: number) => {
    try {
      await markDelivered(orderId, qty);
      // Optimistically mark as delivered on frontend immediately
      setLocalDelivered((prev) => ({
        ...prev,
        [orderId]: { qty, time: new Date().toISOString() },
      }));
      showToast('Delivery marked successfully');
      // Background refresh to sync with server (silent, no loader)
      invalidateCache(cacheKey);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to mark delivery', 'error');
    }
  };

  const today = getToday();
  const tomorrow = getTomorrow();

  if (isLoading) return <DeliveryPageSkeleton />;

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className={styles.page}>
        {/* Top bar — only shown on the public delivery page, not inside admin panel */}
        {!isAdminView && (
          <header className={styles.topbar}>
            <h1 className={styles.title}>Tiffin Delivery</h1>
            <button className={styles.adminLink} onClick={() => navigate(ROUTES.ADMIN_LOGIN)}>
              <Shield size={18} />
              <span>Admin</span>
            </button>
          </header>
        )}

        {/* Date selector */}
        <div className={styles.dateSection}>
          <DatePickerInput value={date} onChange={setDate} />
          <div className={styles.quickDates}>
            <button
              className={`${styles.quickDate} ${date === today ? styles.quickDateActive : ''}`}
              onClick={() => setDate(today)}
            >
              Today
            </button>
            <button
              className={`${styles.quickDate} ${date === tomorrow ? styles.quickDateActive : ''}`}
              onClick={() => setDate(tomorrow)}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {/* Slot toggle */}
        <div className={styles.slotToggle}>
          <button
            className={`${styles.slotBtn} ${slot === 'lunch' ? styles.slotActive : ''}`}
            onClick={() => setSlot('lunch')}
          >
            <Sun size={16} />
            Lunch
          </button>
          <button
            className={`${styles.slotBtn} ${slot === 'dinner' ? styles.slotActive : ''}`}
            onClick={() => setSlot('dinner')}
          >
            <Moon size={16} />
            Dinner
          </button>
        </div>

        {/* Summary strip */}
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <Package size={14} />
            <span className={styles.summaryValue}>{stats.toPrepare}</span>
            <span className={styles.summaryLabel}>To Prepare</span>
          </div>
          <div className={styles.summaryItem} style={{ color: 'var(--color-success)' }}>
            <CheckCircle size={14} />
            <span className={styles.summaryValue}>{stats.delivered}</span>
            <span className={styles.summaryLabel}>Done</span>
          </div>
          <div className={styles.summaryItem} style={{ color: stats.pending > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
            <Clock size={14} />
            <span className={styles.summaryValue}>{stats.pending}</span>
            <span className={styles.summaryLabel}>Left</span>
          </div>
          <div className={styles.summaryItem} style={{ color: 'var(--color-text-tertiary)' }}>
            <Minus size={14} />
            <span className={styles.summaryValue}>{stats.skipped}</span>
            <span className={styles.summaryLabel}>Skip</span>
          </div>
        </div>

        {/* Extra delivery note */}
        {stats.extraDelivered > 0 && (
          <div className={styles.extraNote}>
            +{stats.extraDelivered} extra meal{stats.extraDelivered > 1 ? 's' : ''} delivered beyond ordered quantity
          </div>
        )}
        {stats.pending === 0 && stats.delivered > 0 && (
          <div className={styles.allDoneNote}>
            All deliveries complete for this slot
          </div>
        )}

        {/* Search */}
        <div className={styles.searchWrap}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or address..."
          />
        </div>

        {/* Error banner */}
        {error && <div className={`error-banner ${styles.errorWrap}`}>{error}</div>}

        {isRefreshing && <div className={styles.refreshing}>Refreshing...</div>}

        {/* Grouped order list */}
        <div className={styles.list}>
          {filteredGroups.length === 0 ? (
            <div className="empty-state">
              <Package size={48} className="empty-state-icon" />
              <p className="empty-state-title">
                {search ? 'No matching orders' : 'No orders'}
              </p>
              <p className="empty-state-text">
                {search ? 'Try a different search term' : `No ${slot} orders for this date`}
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const allDone = group.orders.every(
                (o) => o.is_delivered || o.is_skipped
              );
              return (
                <div
                  key={group.user_id}
                  className={`${styles.customerGroup} ${allDone ? styles.groupDone : ''}`}
                >
                  <div className={styles.groupHeader}>
                    <div className={styles.groupAvatar}>
                      {group.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.groupInfo}>
                      <span className={styles.groupName}>{group.customer_name}</span>
                      <span className={styles.groupCount}>
                        {group.orders.length} order{group.orders.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {allDone && (
                      <CheckCircle size={18} className={styles.groupDoneIcon} />
                    )}
                  </div>
                  {group.orders.map((order) => (
                    <OrderDeliveryCard
                      key={order.order_id}
                      order={order}
                      customerName={group.customer_name}
                      onDeliver={handleDeliver}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}
