import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, Package, SkipForward, Coins } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMonthlyReport } from '../../services/api';
import { useCache } from '../../hooks/useCache';
import { monthStartStr, monthEndStr, getMonthLabel, formatShortDate } from '../../utils/dates';
import { CACHE_KEYS } from '../../utils/constants';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import { ReportSkeleton } from '../../components/Skeleton/Skeleton';
import type { MonthlyReport, MonthlyReportOrder } from '../../types';
import styles from './ReportPage.module.css';

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={styles.statCard} style={{ '--card-accent': color } as React.CSSProperties}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function ReportPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedOrder, setSelectedOrder] = useState<MonthlyReportOrder | null>(null);

  const cacheKey = CACHE_KEYS.REPORT(year, month);

  const fetcher = useCallback(
    () => getMonthlyReport(user!.user_id, monthStartStr(year, month), monthEndStr(year, month)),
    [user, year, month]
  );

  const { data: report, isLoading, isRefreshing, refresh } = useCache<MonthlyReport>(cacheKey, fetcher);

  const goBack = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const goForward = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  if (isLoading) return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}>Monthly Report</h1></div>
      <div className="page-content" style={{ padding: 16 }}><ReportSkeleton /></div>
    </div>
  );

  const { summary, orders } = report ?? { summary: null, orders: [] };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Monthly Report</h1>
        <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
      </div>

      <div className="page-content">
        {/* Month selector */}
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={goBack}><ChevronLeft size={18} /></button>
          <span className={styles.monthLabel}>{getMonthLabel(year, month)}</span>
          <button className={styles.navBtn} onClick={goForward}><ChevronRight size={18} /></button>
        </div>

        {/* Stat Cards */}
        <div className={styles.statsGrid}>
          <StatCard icon={<Package size={20} />} label="Ordered" value={summary?.total_ordered ?? 0} color="var(--color-primary)" />
          <StatCard icon={<TrendingUp size={20} />} label="Delivered" value={summary?.total_delivered ?? 0} color="var(--color-success)" />
          <StatCard icon={<SkipForward size={20} />} label="Skipped" value={summary?.total_skipped ?? 0} color="var(--color-text-secondary)" />
          <StatCard icon={<Coins size={20} />} label="Credits Used" value={summary?.total_credits_deducted ?? 0} color="#CA8A04" />
        </div>

        {/* Order table */}
        {orders.length === 0 ? (
          <div className={styles.empty}>No orders for {getMonthLabel(year, month)}</div>
        ) : (
          <div className={styles.tableWrap}>
            <div className={styles.tableHeader}>
              <span>Date</span>
              <span>Slot</span>
              <span>Qty</span>
              <span>Status</span>
            </div>
            {[...orders].sort((a,b) => a.date.localeCompare(b.date)).map((o) => {
              const statusCls = o.is_skipped ? 'badge-neutral' : o.is_delivered ? 'badge-success' : 'badge-primary';
              const statusLabel = o.is_skipped ? '⬜ Skip' : o.is_delivered ? '✅ Done' : '⏳ Pend';
              return (
                <div key={o.order_id} className={styles.tableRow} onClick={() => setSelectedOrder(o)}>
                  <span className={styles.tdDate}>{formatShortDate(o.date)}</span>
                  <span className={`badge ${o.slot === 'lunch' ? styles.lunchBadge : styles.dinnerBadge}`}>
                    {o.slot === 'lunch' ? '🌞 L' : '🌙 D'}
                  </span>
                  <span className={styles.tdQty}>{o.quantity_delivered}/{o.quantity_ordered}</span>
                  <span className={`badge ${statusCls}`}>{statusLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomSheet isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Order Details">
        {selectedOrder && (
          <div className={styles.orderDetails}>
            <div className={styles.detailRow}>
              <label>Date</label>
              <span>{formatShortDate(selectedOrder.date)} ({selectedOrder.slot === 'lunch' ? 'Lunch' : 'Dinner'})</span>
            </div>
            <div className={styles.detailRow}>
              <label>Status</label>
              <span>{selectedOrder.is_skipped ? 'Skipped' : selectedOrder.is_delivered ? 'Delivered' : 'Pending'}</span>
            </div>
            <div className={styles.detailRow}>
              <label>Quantity</label>
              <span>{selectedOrder.quantity_delivered}/{selectedOrder.quantity_ordered} delivered</span>
            </div>
            <div className={styles.detailRow}>
              <label>Credits Deducted</label>
              <span>{selectedOrder.credits_deducted}</span>
            </div>
            <div className={styles.detailRow} style={{ borderBottom: 'none' }}>
              <label>Order ID</label>
              <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{selectedOrder.order_id}</span>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
