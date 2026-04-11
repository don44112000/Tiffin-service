import { useState, useEffect, useCallback } from 'react';
import { readCache, writeCache, isCacheStale } from '../utils/cache';

interface UseCacheResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCache<T>(
  key: string,
  fetcher: (isRefresh: boolean) => Promise<T>,
  ttlMs = 5 * 60 * 1000
): UseCacheResult<T> {
  const cached = readCache<T>(key);
  const [data, setData] = useState<T | null>(cached);
  const [isLoading, setIsLoading] = useState<boolean>(!cached);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const fresh = await fetcher(isRefresh);
      setData(fresh);
      writeCache(key, fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cached) {
      fetchData(false);
    } else if (isCacheStale(key, ttlMs)) {
      // Have stale data — show it immediately, fetch in background
      fetchData(true);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, isLoading, isRefreshing, error, refresh };
}
