import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCache } from '../../hooks/useCache';
import { useRefreshOnReload } from '../../hooks/useRefreshOnReload';
import { getAllUsers } from '../../services/api';
import { PullToRefresh } from '../../components/PullToRefresh/PullToRefresh';
import { RefreshButton } from '../../components/RefreshButton/RefreshButton';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { CustomerCard } from '../../components/CustomerCard/CustomerCard';
import { CustomerListSkeleton } from '../../components/Skeleton/Skeleton';
import { CACHE_KEYS, CACHE_TTL } from '../../utils/constants';
import type { AllUsersResponse } from '../../types';
import styles from './CustomerDirectoryPage.module.css';

export function CustomerDirectoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');

  const filter = searchParams.get('filter') || 'all';

  const fetcher = useCallback((isR: boolean) => getAllUsers(!isR), []);
  const { data, isLoading, isRefreshing, error, refresh } = useCache<AllUsersResponse>(
    CACHE_KEYS.USERS,
    fetcher,
    CACHE_TTL
  );

  useRefreshOnReload(refresh);

  const customers = useMemo(() => {
    if (!data?.users) return [];
    let list = [...data.users].sort((a, b) => a.name.localeCompare(b.name));

    if (filter === 'debtors') {
      list = list.filter((c) => c.credit_balance < 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || String(c.mobile).includes(q)
      );
    }

    return list;
  }, [data, filter, search]);

  const debtorCount = useMemo(() => {
    if (!data?.users) return 0;
    return data.users.filter((c) => c.credit_balance < 0).length;
  }, [data]);

  if (isLoading) return <CustomerListSkeleton />;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers ({data?.total ?? 0})</h1>
        </div>
        <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
      </div>

      <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
        <button
          className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
          onClick={() => setSearchParams({})}
        >
          All Customers
        </button>
        <button
          className={`tab ${filter === 'debtors' ? 'tab-active' : ''}`}
          onClick={() => setSearchParams({ filter: 'debtors' })}
        >
          Debtors ({debtorCount})
        </button>
      </div>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or mobile..."
        />
      </div>

      <PullToRefresh onRefresh={refresh}>
        {error && <div className="error-banner">{error}</div>}

        <div className={styles.list}>
          {customers.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">
                {search ? 'No matching customers' : 'No customers found'}
              </p>
            </div>
          ) : (
            customers.map((c) => (
              <CustomerCard
                key={c.user_id}
                customer={c}
                onClick={() => navigate(`/admin/customers/${c.user_id}`)}
              />
            ))
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
