import { useState, useEffect, useCallback } from 'react';
import { readCache, writeCache } from '../utils/cache';

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
  }, [key, fetcher]); // fetcher might be stable but key definitely changes

  useEffect(() => {
    // Synchronize state with cache immediately when key changes
    const freshCached = readCache<T>(key);
    setData(freshCached);
    setIsLoading(!freshCached);

    if (!freshCached) {
      fetchData(false);
    }
    // Removed automatic background refresh for stale data to honor "show unless refresh" requirement
  }, [key, ttlMs, fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, isLoading, isRefreshing, error, refresh };
}
