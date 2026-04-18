import { useState, useCallback, useMemo, useEffect } from 'react';

// ── Persisted reconciled-dates set ───────────────────────────────────────
const RECONCILED_KEY = 'tiffin_admin_reconciled_dates';

function getReconciledDates(): Set<string> {
  try {
    const raw = localStorage.getItem(RECONCILED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function persistReconciledDate(date: string) {
  const dates = getReconciledDates();
  dates.add(date);
  localStorage.setItem(RECONCILED_KEY, JSON.stringify([...dates]));
}
import {
  Sun,
  Moon,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useCache } from '../../hooks/useCache';
import { useRefreshOnReload } from '../../hooks/useRefreshOnReload';
import { useToast } from '../../context/ToastContext';
import { getDashboard, markDayComplete } from '../../services/api';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { DatePickerInput } from '../../components/DatePickerInput/DatePickerInput';
import { PullToRefresh } from '../../components/PullToRefresh/PullToRefresh';
import { RefreshButton } from '../../components/RefreshButton/RefreshButton';
import { ReconciliationSkeleton } from '../../components/Skeleton/Skeleton';
import { invalidateCache } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../utils/constants';
import { getToday, formatFullDate } from '../../utils/dates';
import type { DashboardResponse, DaySummary } from '../../types';
import styles from './ReconciliationPage.module.css';

export function ReconciliationPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(getToday);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciled, setReconciled] = useState<{
    total: number;
    users: number;
  } | null>(() => getReconciledDates().has(getToday()) ? { total: 0, users: 0 } : null);

  // When date changes, restore reconciled state from cache or clear it
  useEffect(() => {
    setReconciled(getReconciledDates().has(date) ? { total: 0, users: 0 } : null);
  }, [date]);

  const cacheKey = CACHE_KEYS.DASHBOARD(date);
  const fetcher = useCallback((isR: boolean) => getDashboard(date, !isR), [date]);
  const { data, isLoading, isRefreshing, refresh } = useCache<DashboardResponse>(cacheKey, fetcher, CACHE_TTL);

  useRefreshOnReload(refresh);

  // Find the day summary matching selected date
  const daySummary: DaySummary | null = useMemo(() => {
    if (!data) return null;
    if (data.today?.date === date) return data.today;
    if (data.yesterday?.date === date) return data.yesterday;
    if (data.tomorrow?.date === date) return data.tomorrow;
    return null; // no match — stale cache or date out of range
  }, [data, date]);

  const totalDelivered = useMemo(() => {
    if (!daySummary) return 0;
    return daySummary.lunch.total_delivered + daySummary.dinner.total_delivered;
  }, [daySummary]);

  const totalOrdered = useMemo(() => {
    if (!daySummary) return 0;
    return daySummary.lunch.total_demand + daySummary.dinner.total_demand;
  }, [daySummary]);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const res = await markDayComplete(date);
      persistReconciledDate(date);
      setReconciled({
        total: res.total_credits_deducted,
        users: res.users_affected,
      });
      setConfirmOpen(false);
      showToast(`Day reconciled: ${res.total_credits_deducted} credits from ${res.users_affected} users`);
      // Invalidate all relevant caches
      invalidateCache(cacheKey);
      invalidateCache(CACHE_KEYS.USERS);
      invalidateCache(CACHE_KEYS.NEGATIVE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reconciliation failed';
      if (msg.toLowerCase().includes('already reconciled')) {
        persistReconciledDate(date);
        setReconciled({ total: 0, users: 0 });
        showToast('This day has already been reconciled', 'info');
      } else {
        showToast(msg, 'error');
      }
      setConfirmOpen(false);
    } finally {
      setReconciling(false);
    }
  };

  if (isLoading) return <ReconciliationSkeleton />;

  return (
    <PullToRefresh onRefresh={refresh}>
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">Reconciliation</h1>
        <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
      </div>

      {/* Date picker */}
      <div className={styles.dateNav}>
        <DatePickerInput
          value={date}
          onChange={setDate}
        />
      </div>

      {/* Success state */}
      {reconciled !== null ? (
        <div className={`card ${styles.successCard}`}>
          <CheckCircle size={48} className={styles.successIcon} />
          <h2 className={styles.successTitle}>Day Reconciled</h2>
          {reconciled.total > 0 ? (
            <>
              <p className={styles.successText}>
                <strong>{reconciled.total} credits</strong> deducted from{' '}
                <strong>{reconciled.users} customers</strong>
              </p>
            </>
          ) : (
            <p className={styles.successText}>This day was already reconciled.</p>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setReconciled(null);
              refresh();
            }}
            style={{ marginTop: 'var(--space-lg)' }}
          >
            Review Another Day
          </button>
        </div>
      ) : (
        <>
          {/* Day summary */}
          {daySummary && (
            <div className={`card ${styles.summaryCard}`}>
              <h3 className={styles.summaryTitle}>Day Summary</h3>

              <div className={styles.slotSection}>
                <div className={styles.slotLabel}>
                  <Sun size={16} />
                  <span>Lunch</span>
                </div>
                <div className={styles.slotGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{daySummary.lunch.total_demand}</span>
                    <span className={styles.statLabel}>Ordered</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{daySummary.lunch.total_delivered}</span>
                    <span className={styles.statLabel}>Delivered</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{daySummary.lunch.skipped}</span>
                    <span className={styles.statLabel}>Skipped</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>
                      {daySummary.lunch.veg_demand ?? daySummary.lunch.veg_ordered}/
                      {daySummary.lunch.non_veg_demand ?? daySummary.lunch.non_veg_ordered}
                    </span>
                    <span className={styles.statLabel}>Veg/NV</span>
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div className={styles.slotSection}>
                <div className={styles.slotLabel}>
                  <Moon size={16} />
                  <span>Dinner</span>
                </div>
                <div className={styles.slotGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{daySummary.dinner.total_demand}</span>
                    <span className={styles.statLabel}>Ordered</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{daySummary.dinner.total_delivered}</span>
                    <span className={styles.statLabel}>Delivered</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{daySummary.dinner.skipped}</span>
                    <span className={styles.statLabel}>Skipped</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>
                      {daySummary.dinner.veg_demand ?? daySummary.dinner.veg_ordered}/
                      {daySummary.dinner.non_veg_demand ?? daySummary.dinner.non_veg_ordered}
                    </span>
                    <span className={styles.statLabel}>Veg/NV</span>
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div className={styles.totals}>
                <div className={styles.totalRow}>
                  <span>Total Ordered</span>
                  <strong>{totalOrdered}</strong>
                </div>
                <div className={styles.totalRow}>
                  <span>Total Delivered</span>
                  <strong>{totalDelivered}</strong>
                </div>
                <div className={`${styles.totalRow} ${styles.totalHighlight}`}>
                  <span>Credits to Deduct</span>
                  <strong>{totalDelivered} credits</strong>
                </div>
              </div>
            </div>
          )}

          {/* Action card */}
          <div className={`card ${styles.actionCard}`}>
            <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
            <p className={styles.actionText}>
              This action is <strong>irreversible</strong>. Credits will be deducted from all
              customers who received deliveries on this day.
            </p>
            <button
              className="btn btn-danger btn-full"
              onClick={() => setConfirmOpen(true)}
              disabled={!daySummary || totalDelivered === 0}
            >
              Reconcile This Day
            </button>
          </div>
        </>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Reconcile ${formatFullDate(date)}?`}
        message={`This will deduct ${totalDelivered} credits from all customers with deliveries. This cannot be undone.`}
        confirmLabel="Reconcile"
        variant="danger"
        isLoading={reconciling}
        onConfirm={handleReconcile}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
    </PullToRefresh>
  );
}
