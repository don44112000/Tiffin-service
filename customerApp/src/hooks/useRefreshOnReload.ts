import { useEffect } from 'react';

export function useRefreshOnReload(refresh: () => Promise<void>) {
  useEffect(() => {
    // Only refresh if this is the initial mount right after the reload
    if (performance.now() < 5000) {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (nav?.type === 'reload') {
        refresh();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
