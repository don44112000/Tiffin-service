import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useCache } from '../../hooks/useCache';
import { useRefreshOnReload } from '../../hooks/useRefreshOnReload';
import { PullToRefresh } from '../../components/PullToRefresh/PullToRefresh';
import { RefreshButton } from '../../components/RefreshButton/RefreshButton';
import { DatePickerInput } from '../../components/DatePickerInput/DatePickerInput';
import { getDashboard, getNegativeCredits } from '../../services/api';
import { DashboardSkeleton } from '../../components/Skeleton/Skeleton';
import { CACHE_KEYS, CACHE_TTL } from '../../utils/constants';
import { getToday, formatDisplayDate, formatShortDate } from '../../utils/dates';
import type { DashboardResponse, NegativeCreditsResponse, SlotSummary, DaySummary } from '../../types';
import styles from './DashboardPage.module.css';

// ── Reusable summary block (used for Day total, Lunch, Dinner) ──────────
interface SummaryData {
  ordered: number;
  delivered: number;
  skipped: number;
  pending: number;
  extra: number;
  vegDemand: number;
  nvDemand: number;
  vegOrdered: number;
  nvOrdered: number;
  vegSkipped: number;
  nvSkipped: number;
}

function buildSummaryFromSlot(s: SlotSummary): SummaryData {
  const ordered = (s.total_demand ?? s.total_ordered + s.skipped);
  const delivered = s.total_delivered;
  const skipped = s.skipped;
  const toPrepare = ordered - skipped;
  return {
    ordered,
    delivered,
    skipped,
    pending: Math.max(0, toPrepare - delivered),
    extra: delivered > toPrepare ? delivered - toPrepare : 0,
    // demand = total per type (ordered + skipped); fall back to computing from parts
    vegDemand: s.veg_demand ?? (s.veg_ordered + (s.veg_skipped ?? 0)),
    nvDemand: s.non_veg_demand ?? (s.non_veg_ordered + (s.non_veg_skipped ?? 0)),
    vegOrdered: s.veg_ordered,
    nvOrdered: s.non_veg_ordered,
    vegSkipped: s.veg_skipped ?? 0,
    nvSkipped: s.non_veg_skipped ?? 0,
  };
}

function combineSummaries(a: SummaryData, b: SummaryData): SummaryData {
  const ordered = a.ordered + b.ordered;
  const delivered = a.delivered + b.delivered;
  const skipped = a.skipped + b.skipped;
  const toPrepare = ordered - skipped;
  return {
    ordered,
    delivered,
    skipped,
    pending: Math.max(0, toPrepare - delivered),
    extra: delivered > toPrepare ? delivered - toPrepare : 0,
    vegDemand: a.vegDemand + b.vegDemand,
    nvDemand: a.nvDemand + b.nvDemand,
    vegOrdered: a.vegOrdered + b.vegOrdered,
    nvOrdered: a.nvOrdered + b.nvOrdered,
    vegSkipped: a.vegSkipped + b.vegSkipped,
    nvSkipped: a.nvSkipped + b.nvSkipped,
  };
}

function SummaryBlock({ data, size = 'large' }: { data: SummaryData; size?: 'large' | 'compact' }) {
  const isLarge = size === 'large';
  const toPrepare = data.ordered - data.skipped;

  return (
    <div className={styles.summaryBlock}>
      {/* Status row */}
      <div className={isLarge ? styles.statusGrid4 : styles.statusGrid2}>
        <div className={styles.statusCell}>
          <span className={`${styles.statusVal} ${isLarge ? styles.statusValLg : ''}`}>{data.ordered}</span>
          <span className={styles.statusLbl}>Ordered</span>
        </div>
        <div className={styles.statusCell}>
          <span className={`${styles.statusVal} ${isLarge ? styles.statusValLg : ''} ${styles.valGreen}`}>{data.delivered}</span>
          <span className={styles.statusLbl}>Delivered</span>
        </div>
        <div className={styles.statusCell}>
          <span className={`${styles.statusVal} ${isLarge ? styles.statusValLg : ''}`}>{data.skipped}</span>
          <span className={styles.statusLbl}>Skipped</span>
        </div>
        <div className={styles.statusCell}>
          <span className={`${styles.statusVal} ${isLarge ? styles.statusValLg : ''} ${data.pending > 0 ? styles.valAmber : styles.valGreen}`}>{data.pending}</span>
          <span className={styles.statusLbl}>Pending</span>
        </div>
      </div>

      {/* To prepare highlight */}
      <div className={`${styles.toPrepareBar} ${isLarge ? '' : styles.toPrepareCompact}`}>
        <span className={styles.toPrepareVal}>{toPrepare}</span>
        <span className={styles.toPrepareLbl}>to prepare</span>
        <span className={styles.toPrepareTypes}>
          <span className={styles.vegDotSm} /> {data.vegOrdered} veg
          <span className={styles.nvDotSm} /> {data.nvOrdered} nv
        </span>
      </div>

      {/* Veg / Non-veg table */}
      <div className={styles.typeTable}>
        <div className={styles.typeRow}>
          <span className={styles.typeLabel}><span className={styles.vegDot} /> Veg</span>
          <span className={styles.typeVal}>{data.vegDemand} ordered</span>
          <span className={styles.typeSkip}>{data.vegSkipped} skipped</span>
        </div>
        <div className={styles.typeRow}>
          <span className={styles.typeLabel}><span className={styles.nvDot} /> Non-veg</span>
          <span className={styles.typeVal}>{data.nvDemand} ordered</span>
          <span className={styles.typeSkip}>{data.nvSkipped} skipped</span>
        </div>
      </div>

      {/* Extra note */}
      {data.extra > 0 && (
        <div className={styles.extraNote}>+{data.extra} extra delivered beyond demand</div>
      )}
    </div>
  );
}

// ── Mini card for yesterday/tomorrow ────────────────────────────────────
function DayMiniCard({ label, date, data, onClick, onSlotClick }: {
  label: string;
  date: string;
  data: DaySummary;
  onClick?: () => void;
  onSlotClick?: (slot: 'lunch' | 'dinner') => void;
}) {
  const s = combineSummaries(buildSummaryFromSlot(data.lunch), buildSummaryFromSlot(data.dinner));
  return (
    <div className={`card ${styles.miniCard} ${onClick ? styles.miniClickable : ''}`} onClick={onClick}>
      <div className={styles.miniHeader}>
        <span className={styles.miniLabel}>{label}</span>
        <span className={styles.miniDate}>{formatShortDate(date)}</span>
        {onClick && <ChevronRight size={16} className={styles.miniArrow} />}
      </div>
      <div className={styles.miniRow}>
        <span>{s.ordered} ord</span>
        <span className={styles.miniDot} />
        <span>{s.delivered} del</span>
        <span className={styles.miniDot} />
        <span>{s.skipped} skip</span>
        {s.pending > 0 && <><span className={styles.miniDot} /><span style={{ color: 'var(--color-warning)' }}>{s.pending} left</span></>}
      </div>
      {onSlotClick && (
        <div className={styles.miniSlotRow}>
          <button className={styles.miniSlotBtn} onClick={(e) => { e.stopPropagation(); onSlotClick('lunch'); }}>
            <Sun size={12} /> Lunch
          </button>
          <button className={styles.miniSlotBtn} onClick={(e) => { e.stopPropagation(); onSlotClick('dinner'); }}>
            <Moon size={12} /> Dinner
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();

  const goToDelivery = (date: string, slot: 'lunch' | 'dinner') =>
    navigate(`/admin/delivery?date=${date}&slot=${slot}`);
  const [selectedDate, setSelectedDate] = useState(getToday);

  const dashFetcher = useCallback((isR: boolean) => getDashboard(selectedDate, !isR), [selectedDate]);
  const debtFetcher = useCallback((isR: boolean) => getNegativeCredits(!isR), []);

  const { data: dash, isLoading: dashLoading, isRefreshing: dashRefreshing, refresh: refreshDash } = useCache<DashboardResponse>(
    CACHE_KEYS.DASHBOARD(selectedDate), dashFetcher, CACHE_TTL
  );
  const { data: debt, isRefreshing: debtRefreshing, refresh: refreshDebt } = useCache<NegativeCreditsResponse>(
    CACHE_KEYS.NEGATIVE, debtFetcher, CACHE_TTL
  );

  const focusDay = dash?.today;
  const lunchData = useMemo(() => focusDay ? buildSummaryFromSlot(focusDay.lunch) : null, [focusDay]);
  const dinnerData = useMemo(() => focusDay ? buildSummaryFromSlot(focusDay.dinner) : null, [focusDay]);
  const dayData = useMemo(() => lunchData && dinnerData ? combineSummaries(lunchData, dinnerData) : null, [lunchData, dinnerData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshDash(), refreshDebt()]);
  }, [refreshDash, refreshDebt]);

  useRefreshOnReload(refreshAll);

  if (dashLoading) return <DashboardSkeleton />;

  return (
    <div className="page-content fade-in">
      {/* Header — outside PullToRefresh so it stays fixed */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div style={{ marginTop: 'var(--space-sm)' }}>
            <DatePickerInput value={selectedDate} onChange={setSelectedDate} />
          </div>
        </div>
        <RefreshButton onRefresh={refreshAll} isRefreshing={dashRefreshing || debtRefreshing} />
      </div>

      <PullToRefresh onRefresh={refreshAll}>

      {/* ── Day Card (overview + slot breakdown in one card) ────────── */}
      {dayData && lunchData && dinnerData && (
        <div className={`card ${styles.dayCard}`}>
          {/* Day overview */}
          <div className={styles.dayCardHeader}>
            <h2 className={styles.dayCardTitle}>{formatDisplayDate(selectedDate)}</h2>
          </div>
          <SummaryBlock data={dayData} size="large" />

          {/* Slot breakdown inside same card */}
          <div className={styles.slotsSection}>
            <h3 className={styles.slotsTitle}>Slot Breakdown</h3>
            <div className={styles.slotsInner}>
              <div className={styles.slotSection}>
                <div className={`${styles.slotSectionHeader} ${styles.slotSectionClickable}`}
                  onClick={() => goToDelivery(selectedDate, 'lunch')}>
                  <Sun size={16} />
                  <span>Lunch</span>
                  <ChevronRight size={14} className={styles.slotChevron} />
                </div>
                <SummaryBlock data={lunchData} size="compact" />
              </div>
              <div className={styles.slotDivider} />
              <div className={styles.slotSection}>
                <div className={`${styles.slotSectionHeader} ${styles.slotSectionClickable}`}
                  onClick={() => goToDelivery(selectedDate, 'dinner')}>
                  <Moon size={16} />
                  <span>Dinner</span>
                  <ChevronRight size={14} className={styles.slotChevron} />
                </div>
                <SummaryBlock data={dinnerData} size="compact" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Yesterday & Tomorrow ─────────────────────────────────────── */}
      {dash && (
        <div className={styles.sideCards}>
          <DayMiniCard label="Yesterday" date={dash.yesterday.date} data={dash.yesterday}
            onClick={() => setSelectedDate(dash.yesterday.date)}
            onSlotClick={(slot) => goToDelivery(dash.yesterday.date, slot)} />
          <DayMiniCard label="Tomorrow" date={dash.tomorrow.date} data={dash.tomorrow}
            onClick={() => setSelectedDate(dash.tomorrow.date)}
            onSlotClick={(slot) => goToDelivery(dash.tomorrow.date, slot)} />
        </div>
      )}

      {/* ── Negative Balances ────────────────────────────────────────── */}
      {debt && debt.users.length > 0 && (
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <h2 className="section-title" style={{ color: 'var(--color-error)' }}>
            <AlertTriangle size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Negative Balances ({debt.total})
          </h2>
          <div className="card">
            {debt.users.map((u) => (
              <div key={u.user_id} className={styles.debtRow}
                onClick={() => navigate(`/admin/customers/${u.user_id}`)}>
                <div>
                  <div className={styles.debtName}>{u.name}</div>
                  <div className={styles.debtMobile}>{u.mobile}</div>
                </div>
                <div className={styles.debtAmount}>
                  {u.credit_balance} cr
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </PullToRefresh>
    </div>
  );
}
