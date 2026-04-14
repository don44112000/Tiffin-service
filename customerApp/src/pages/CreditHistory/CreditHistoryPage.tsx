import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  History, 
  Wallet, 
  Utensils, 
  RotateCcw, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Info
} from 'lucide-react';
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
      <div className={`${styles.page} page-enter`}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h1 className={styles.pageTitle}>Credit History</h1>
        </div>
        <div className="page-content" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 120, borderRadius: 20, marginBottom: 24 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 12 }} />
          ))}
        </div>
        <Footer />
      </div>
    );
  }

  const { summary, history = [] } = data || { summary: { total_credited: 0, total_debited: 0, net: 0 }, history: [] };

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.pageTitle}>Credit History</h1>
        <div style={{ marginLeft: 'auto' }}>
          <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
        </div>
      </div>

      <PullToRefresh onRefresh={refresh}>
        <div className="page-content">
          {/* Summary Cards */}
          <div className={styles.summary}>
            <div className={`${styles.summaryCard} ${styles.cardBalance} ${styles.cardFeatured}`}>
              <div className={styles.cardHeader}>
                <Wallet size={20} className={styles.cardIcon} />
                <span className={styles.sumLabel}>Current Balance</span>
              </div>
              <span className={styles.sumValue}>{summary.net}</span>
            </div>

            <div className={`${styles.summaryCard} ${styles.cardCredit}`}>
              <div className={styles.cardHeader}>
                <TrendingUp size={16} className={styles.cardIcon} />
                <span className={styles.sumLabel}>Credited</span>
              </div>
              <span className={styles.sumValue}>+{summary.total_credited}</span>
            </div>
            
            <div className={`${styles.summaryCard} ${styles.cardDebit}`}>
              <div className={styles.cardHeader}>
                <TrendingDown size={16} className={styles.cardIcon} />
                <span className={styles.sumLabel}>Used</span>
              </div>
              <span className={styles.sumValue}>-{summary.total_debited}</span>
            </div>
          </div>

          <div className={styles.historyContainer}>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>Recent Activity</h2>
              <span className={styles.listSubtitle}>Last 3 months</span>
            </div>

            {/* History List */}
            <div className={styles.historyList}>
              {history.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIconWrapper}>
                    <History size={48} className={styles.emptyIcon} />
                  </div>
                  <h3>No Transactions</h3>
                  <p>You haven't made any transactions in the last 3 months.</p>
                </div>
              ) : (
                [...history].reverse().map((item) => {
                  const reasonInfo: Record<string, { label: string; icon: any; color: string }> = {
                    'recharge': { label: 'Balance Recharge', icon: Wallet, color: 'var(--color-success)' },
                    'day_completion': { label: 'Meal Deduction', icon: Utensils, color: 'var(--color-primary)' },
                    'refund': { label: 'Credit Refund', icon: RotateCcw, color: 'var(--color-info)' },
                    'manual_adjustment': { label: 'Adjustment', icon: Settings, color: 'var(--color-text-secondary)' }
                  };
                  
                  const info = reasonInfo[item.reason] || { label: item.reason, icon: Info, color: 'var(--color-text-secondary)' };
                  const Icon = info.icon;

                  return (
                    <div key={item.history_id} className={styles.historyItem}>
                      <div className={styles.itemIconWrapper} style={{ '--icon-color': info.color } as any}>
                        <Icon size={20} />
                      </div>
                      <div className={styles.itemLeft}>
                        <span className={styles.itemReason}>{info.label}</span>
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
        </div>
      </PullToRefresh>
      <Footer />
    </div>
  );
}

