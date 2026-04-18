import { useEffect } from 'react';

export function useRefreshOnReload(refresh: () => Promise<void>) {
  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === 'reload') {
      refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
