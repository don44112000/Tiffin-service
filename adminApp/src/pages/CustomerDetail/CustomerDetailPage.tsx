import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  UserPen,
  Sun,
  Moon,
  CheckCircle,
  Clock,
  MinusCircle,
  Package,
} from 'lucide-react';
import { useCache } from '../../hooks/useCache';
import { useToast } from '../../context/ToastContext';
import {
  getAllUsers,
  rechargeCredits,
  adminUpdateCustomer,
  getCreditHistory,
  getMonthlyReport,
  reduceCreditsAgainstOrder,
} from '../../services/api';
import { BottomSheet } from '../../components/BottomSheet/BottomSheet';
import { PullToRefresh } from '../../components/PullToRefresh/PullToRefresh';
import { CustomerDetailSkeleton } from '../../components/Skeleton/Skeleton';
import { CACHE_KEYS, CACHE_TTL, ROUTES } from '../../utils/constants';
import { getMonthRange, formatMonthYear, formatShortDate } from '../../utils/dates';
import { invalidateCache } from '../../utils/cache';
import type {
  AllUsersResponse,
  Customer,
  CreditHistoryResponse,
  MonthlyReportResponse,
  MonthlyReportOrder,
} from '../../types';
import styles from './CustomerDetailPage.module.css';

export function CustomerDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'history' | 'report'>('history');
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Order detail sheet
  const [selectedOrder, setSelectedOrder] = useState<MonthlyReportOrder | null>(null);
  const [creditInput, setCreditInput] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);

  // Report month navigation
  const now = new Date();
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [reportYear, setReportYear] = useState(now.getFullYear());

  // Fetch users to find customer
  const usersFetcher = useCallback((isR: boolean) => getAllUsers(!isR), []);
  const { data: usersData, isLoading: usersLoading, refresh: refreshUsers } =
    useCache<AllUsersResponse>(CACHE_KEYS.USERS, usersFetcher, CACHE_TTL);

  const customer: Customer | undefined = useMemo(
    () => usersData?.users.find((u) => u.user_id === userId),
    [usersData, userId]
  );

  // Credit history (last 3 months through today)
  const historyRange = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 3, 1);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: fmt(start), end: fmt(end) };
  }, []);

  const historyKey = CACHE_KEYS.HISTORY(userId || '', now.getFullYear(), now.getMonth() + 1);
  const historyFetcher = useCallback(
    (isR: boolean) =>
      userId
        ? getCreditHistory(userId, historyRange.start, historyRange.end, !isR)
        : Promise.reject('No user'),
    [userId, historyRange]
  );
  const { data: history, refresh: refreshHistory } = useCache<CreditHistoryResponse>(
    historyKey,
    historyFetcher,
    CACHE_TTL
  );

  // Monthly report
  const { start: reportStart, end: reportEnd } = getMonthRange(reportYear, reportMonth);
  const reportKey = CACHE_KEYS.REPORT(userId || '', reportYear, reportMonth);
  const reportFetcher = useCallback(
    (isR: boolean) =>
      userId
        ? getMonthlyReport(userId, reportStart, reportEnd, !isR)
        : Promise.reject('No user'),
    [userId, reportStart, reportEnd]
  );
  const { data: report, isLoading: reportLoading, refresh: refreshReport } =
    useCache<MonthlyReportResponse>(reportKey, reportFetcher, CACHE_TTL);

  const prevMonth = () => {
    if (reportMonth === 1) { setReportMonth(12); setReportYear((y) => y - 1); }
    else setReportMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (reportMonth === 12) { setReportMonth(1); setReportYear((y) => y + 1); }
    else setReportMonth((m) => m + 1);
  };

  // Recharge handler
  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0 || !userId) return;
    setRechargeLoading(true);
    try {
      const res = await rechargeCredits(userId, amount);
      showToast(`Recharged ${res.added} credits. New balance: ${res.new_balance}`);
      setRechargeOpen(false);
      setRechargeAmount('');
      invalidateCache(CACHE_KEYS.USERS);
      invalidateCache(CACHE_KEYS.NEGATIVE);
      invalidateCache(historyKey);
      refreshUsers();
      refreshHistory();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Recharge failed', 'error');
    } finally {
      setRechargeLoading(false);
    }
  };

  // Edit handler
  const handleEdit = async () => {
    if (!userId) return;
    const updates: { name?: string; new_password?: string } = {};
    if (editName.trim()) updates.name = editName.trim();
    if (editPassword.trim()) updates.new_password = editPassword.trim();
    if (Object.keys(updates).length === 0) return;
    setEditLoading(true);
    try {
      await adminUpdateCustomer(userId, updates);
      showToast('Customer updated');
      setEditOpen(false);
      setEditName('');
      setEditPassword('');
      invalidateCache(CACHE_KEYS.USERS);
      refreshUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Credit reduction handler
  const handleReduceCredits = async () => {
    if (!selectedOrder || !creditInput) return;
    const amount = parseInt(creditInput, 10);
    if (!amount || amount <= 0) return;
    setCreditLoading(true);
    try {
      const res = await reduceCreditsAgainstOrder(selectedOrder.order_id, amount);
      showToast(res.message || 'Credits updated');
      setSelectedOrder(null);
      setCreditInput('');
      invalidateCache(reportKey);
      invalidateCache(CACHE_KEYS.USERS);
      invalidateCache(historyKey);
      refreshReport();
      refreshUsers();
      refreshHistory();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update credits', 'error');
    } finally {
      setCreditLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    await refreshUsers();
    await refreshHistory();
  };

  if (usersLoading || !customer) return <CustomerDetailSkeleton />;

  const isDebt = customer.credit_balance < 0;
  const initials = customer.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <PullToRefresh onRefresh={handleRefreshAll}>
    <div className="page-content fade-in">
      {/* Back button */}
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 'var(--space-lg)' }}
        onClick={() => navigate(ROUTES.CUSTOMERS)}
      >
        <ArrowLeft size={18} />
        Back to Customers
      </button>

      {/* Profile card */}
      <div className={`card ${styles.profileCard}`}>
        <div className={styles.profileTop}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileInfo}>
            <h2 className={styles.profileName}>{customer.name}</h2>
            <div className={styles.profileMeta}>
              <Phone size={14} />
              <span>{customer.mobile}</span>
            </div>
            <div className={styles.profileMeta}>
              <span>Member since {formatShortDate(customer.created_at)}</span>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setEditName(customer.name); setEditOpen(true); }}
          >
            <UserPen size={16} />
          </button>
        </div>
      </div>

      {/* Balance card */}
      <div className={`card ${styles.balanceCard} ${isDebt ? styles.balanceDebt : styles.balanceOk}`}>
        <div className={styles.balanceTop}>
          <Wallet size={20} />
          <span>Credit Balance</span>
        </div>
        <div className={styles.balanceValue}>{customer.credit_balance} credits</div>
        <button className="btn btn-primary btn-sm" onClick={() => setRechargeOpen(true)}>
          Recharge Credits
        </button>
      </div>

      {/* Addresses */}
      {(customer.address_1 || customer.address_2 || customer.address_3) && (
        <div className="card" style={{ marginTop: 'var(--space-md)' }}>
          <h3 className={styles.sectionLabel}>Delivery Addresses</h3>
          {[customer.address_1, customer.address_2, customer.address_3]
            .filter(Boolean)
            .map((addr, i) => (
              <div key={i} className={styles.addressRow}>
                <MapPin size={14} />
                <span>{addr}</span>
              </div>
            ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ margin: 'var(--space-xl) 0 var(--space-lg)' }}>
        <button
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Credit History
        </button>
        <button
          className={`tab ${activeTab === 'report' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          Usage Report
        </button>
      </div>

      {/* Credit History tab */}
      {activeTab === 'history' && (
        <div className="card fade-in">
          {history?.summary && (
            <div className={styles.historySummary}>
              <span className={styles.historyCredit}>+{history.summary.total_credited}</span>
              <span className={styles.historyDebit}>-{history.summary.total_debited}</span>
              <span className={styles.historyNet}>Net: {history.summary.net}</span>
            </div>
          )}
          {history?.history && history.history.length > 0 ? (
            <div className={styles.historyList}>
              {history.history.map((item) => (
                <div key={item.history_id} className={styles.historyRow}>
                  <div>
                    <div className={styles.historyDate}>{formatShortDate(item.date)}</div>
                    <div className={styles.historyReason}>{item.reason.replace(/_/g, ' ')}</div>
                  </div>
                  <span className={item.type === 'credit' ? styles.historyCredit : styles.historyDebit}>
                    {item.type === 'credit' ? '+' : '-'}{item.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyTab}>No credit history found</p>
          )}
        </div>
      )}

      {/* Usage Report tab */}
      {activeTab === 'report' && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className={styles.monthNav}>
              <button onClick={prevMonth}><ChevronLeft size={20} /></button>
              <span className={styles.monthLabel}>
                {formatMonthYear(new Date(reportYear, reportMonth - 1))}
              </span>
              <button onClick={nextMonth}><ChevronRight size={20} /></button>
            </div>

            {reportLoading ? (
              <p className={styles.emptyTab}>Loading...</p>
            ) : report?.summary ? (
              <div className={styles.statGrid}>
                <div className={`${styles.reportStat} ${styles.statOrdered}`}>
                  <div className={styles.reportStatValue}>{report.summary.total_ordered}</div>
                  <div className={styles.reportStatLabel}>Ordered</div>
                </div>
                <div className={`${styles.reportStat} ${styles.statDelivered}`}>
                  <div className={styles.reportStatValue}>{report.summary.total_delivered}</div>
                  <div className={styles.reportStatLabel}>Delivered</div>
                </div>
                <div className={`${styles.reportStat} ${styles.statSkipped}`}>
                  <div className={styles.reportStatValue}>{report.summary.total_skipped}</div>
                  <div className={styles.reportStatLabel}>Skipped</div>
                </div>
                <div className={`${styles.reportStat} ${styles.statCredits}`}>
                  <div className={styles.reportStatValue}>{report.summary.total_credits_deducted}</div>
                  <div className={styles.reportStatLabel}>Credits</div>
                </div>
              </div>
            ) : (
              <p className={styles.emptyTab}>No data for this month</p>
            )}
          </div>

          {/* Order list */}
          {!reportLoading && report?.orders && report.orders.length > 0 && (
            <div className={styles.orderList}>
              {[...report.orders].sort((a, b) => a.date.localeCompare(b.date)).map((o) => {
                const isSkipped = o.is_skipped;
                const isDelivered = o.is_delivered;
                return (
                  <div
                    key={o.order_id}
                    className={`card ${styles.orderCard}`}
                    onClick={() => { setSelectedOrder(o); setCreditInput('1'); }}
                  >
                    <div className={styles.orderCardTop}>
                      <div className={styles.orderCardLeft}>
                        <span className={styles.orderDate}>{formatShortDate(o.date)}</span>
                        <div className={styles.orderBadges}>
                          <span className={`${styles.slotBadge} ${o.slot === 'lunch' ? styles.slotLunch : styles.slotDinner}`}>
                            {o.slot === 'lunch' ? <Sun size={11} /> : <Moon size={11} />}
                            {o.slot === 'lunch' ? 'Lunch' : 'Dinner'}
                          </span>
                          {isSkipped && <span className={styles.skipChip}>Skipped</span>}
                          {!isSkipped && isDelivered && (
                            <span className={styles.deliveredChip}>
                              <CheckCircle size={11} /> Delivered
                            </span>
                          )}
                          {!isSkipped && !isDelivered && (
                            <span className={styles.pendingChip}>
                              <Clock size={11} /> Pending
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.orderCardRight}>
                        <span className={styles.orderQty}>
                          <Package size={12} />
                          {isSkipped ? o.quantity_ordered : `${o.quantity_delivered}/${o.quantity_ordered}`}
                        </span>
                        {o.credits_deducted > 0 && (
                          <span className={styles.orderCredits}>-{o.credits_deducted} cr</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recharge Bottom Sheet */}
      <BottomSheet isOpen={rechargeOpen} onClose={() => setRechargeOpen(false)} title="Recharge Credits">
        <div className={styles.sheetForm}>
          <label className="input-label">Amount</label>
          <input
            type="number"
            className="input-field"
            placeholder="Enter credit amount"
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            min="1"
            autoFocus
          />
          <button
            className="btn btn-primary btn-full"
            onClick={handleRecharge}
            disabled={rechargeLoading || !rechargeAmount || parseFloat(rechargeAmount) <= 0}
          >
            {rechargeLoading ? 'Processing...' : 'Confirm Recharge'}
          </button>
        </div>
      </BottomSheet>

      {/* Edit Profile Bottom Sheet */}
      <BottomSheet isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Customer">
        <div className={styles.sheetForm}>
          <label className="input-label">Name</label>
          <input
            type="text"
            className="input-field"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Customer name"
          />
          <label className="input-label">New Password (optional)</label>
          <input
            type="text"
            className="input-field"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            placeholder="Leave empty to keep current"
          />
          <button className="btn btn-primary btn-full" onClick={handleEdit} disabled={editLoading}>
            {editLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </BottomSheet>

      {/* Order Detail Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedOrder}
        onClose={() => { setSelectedOrder(null); setCreditInput(''); }}
        title="Order Details"
      >
        {selectedOrder && (
          <div className={styles.orderDetail}>
            {/* Status chip */}
            <div className={styles.orderDetailStatus}>
              {selectedOrder.is_skipped && <span className={`${styles.skipChip} ${styles.chipLg}`}>Skipped</span>}
              {!selectedOrder.is_skipped && selectedOrder.is_delivered && (
                <span className={`${styles.deliveredChip} ${styles.chipLg}`}>
                  <CheckCircle size={14} /> Delivered
                </span>
              )}
              {!selectedOrder.is_skipped && !selectedOrder.is_delivered && (
                <span className={`${styles.pendingChip} ${styles.chipLg}`}>
                  <Clock size={14} /> Pending
                </span>
              )}
            </div>

            {/* Detail rows */}
            <div className={styles.detailRows}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date</span>
                <span className={styles.detailValue}>{formatShortDate(selectedOrder.date)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Slot</span>
                <span className={`${styles.slotBadge} ${selectedOrder.slot === 'lunch' ? styles.slotLunch : styles.slotDinner}`}>
                  {selectedOrder.slot === 'lunch' ? <Sun size={12} /> : <Moon size={12} />}
                  {selectedOrder.slot === 'lunch' ? 'Lunch' : 'Dinner'}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Qty Ordered</span>
                <span className={styles.detailValue}>{selectedOrder.quantity_ordered}</span>
              </div>
              {!selectedOrder.is_skipped && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Qty Delivered</span>
                  <span className={`${styles.detailValue} ${styles.valGreen}`}>{selectedOrder.quantity_delivered}</span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Credits Deducted</span>
                <span className={`${styles.detailValue} ${selectedOrder.credits_deducted > 0 ? styles.valRed : ''}`}>
                  {selectedOrder.credits_deducted > 0 ? `-${selectedOrder.credits_deducted}` : '—'}
                </span>
              </div>
            </div>

            {/* Manual credit reduction — available for all orders */}
            <div className={styles.creditReduceSection}>
              <div className={styles.creditReduceTitle}>
                <MinusCircle size={16} />
                Manually Reduce Credits
              </div>
              <p className={styles.creditReduceHint}>
                Enter the additional credits to deduct for this order.
              </p>
              <div className={styles.creditReduceRow}>
                <input
                  type="number"
                  className="input-field"
                  value={creditInput}
                  min="1"
                  step="1"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setCreditInput(raw === '' || parseInt(raw, 10) < 1 ? '1' : String(parseInt(raw, 10)));
                  }}
                />
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleReduceCredits}
                  disabled={creditLoading || !creditInput || parseInt(creditInput, 10) < 1}
                >
                  {creditLoading ? '...' : 'Deduct'}
                </button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
    </PullToRefresh>
  );
}
