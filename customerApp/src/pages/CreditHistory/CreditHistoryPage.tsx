import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCreditHistory } from '../../services/api';
import { useCache } from '../../hooks/useCache';
import { subMonths, format } from 'date-fns';
import PullToRefresh from '../../components/PullToRefresh/PullToRefresh';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import Footer from '../../components/Footer/Footer';
import type { CreditHistoryResponse } from '../../types';
import styles from './CreditHistoryPage.module.css';

export default function CreditHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subMonths(new Date(), 3), 'yyyy-MM-dd'); // Last 3 months

  const fetcher = useCallback(
    (isRefresh: boolean) => 
      getCreditHistory(user!.user_id, startDate, endDate, isRefresh),
    [user, startDate, endDate]
  );

  const { data, isLoading, isRefreshing, refresh } = useCache<CreditHistoryResponse>(
    `credit_history_${user!.user_id}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h1 className={styles.pageTitle}>Credit History</h1>
        </div>
        <div className="page-content" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 16 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 70, borderRadius: 12, marginBottom: 12 }} />
          ))}
        </div>
        <Footer />
      </div>
    );
  }

  const { summary, history = [] } = data || { summary: { total_credited: 0, total_debited: 0, net: 0 }, history: [] };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.pageTitle}>Credit History</h1>
        <div style={{ marginLeft: 'auto' }}>
          <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
        </div>
        <Footer />
      </div>

      <PullToRefresh onRefresh={refresh}>
        <div className="page-content">
          {/* Summary Cards */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <span className={styles.sumLabel}>Credited</span>
              <span className={`${styles.sumValue} ${styles.credit}`}>+{summary.total_credited}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.sumLabel}>Used</span>
              <span className={`${styles.sumValue} ${styles.debit}`}>-{summary.total_debited}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.sumLabel}>Balance</span>
              <span className={styles.sumValue}>{summary.net}</span>
            </div>
          </div>

          {/* History List */}
          <div className={styles.historyList}>
            {history.length === 0 ? (
              <div className={styles.emptyState}>
                <History size={48} className={styles.emptyIcon} />
                <p>No transactions found in the last 3 months</p>
              </div>
            ) : (
              history.map((item) => {
                const friendlyReasons: Record<string, string> = {
                  'recharge': 'Balance Recharge',
                  'day_completion': 'Meal Deduction',
                  'refund': 'Credit Refund',
                  'manual_adjustment': 'Adjustment'
                };
                const displayReason = friendlyReasons[item.reason] || item.reason;

                return (
                  <div key={item.history_id} className={styles.historyItem}>
                    <div className={styles.itemLeft}>
                      <span className={styles.itemReason}>{displayReason}</span>
                      <span className={styles.itemDate}>{format(new Date(item.date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className={styles.itemRight}>
                      <span className={`${styles.itemAmount} ${item.type === 'credit' ? styles.credit : styles.debit}`}>
                        {item.type === 'credit' ? '+' : '-'}{item.amount}
                      </span>
                      <span className={styles.itemType}>{item.type}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PullToRefresh>
      <Footer />
    </div>
  );
}
