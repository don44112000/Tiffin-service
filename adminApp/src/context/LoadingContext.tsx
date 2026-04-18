import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { requestQueue } from '../services/queueManager';

interface LoadingContextType {
  isLoading: boolean;
  activeCount: number;
  queuedCount: number;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  activeCount: 0,
  queuedCount: 0,
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    activeCount: 0,
    queuedCount: 0,
    interactiveActiveCount: 0,
    interactiveQueuedCount: 0,
  });

  useEffect(() => {
    return requestQueue.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  const isLoading = state.interactiveActiveCount > 0 || state.interactiveQueuedCount > 0;

  return (
    <LoadingContext.Provider
      value={{ isLoading, activeCount: state.activeCount, queuedCount: state.queuedCount }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextType {
  return useContext(LoadingContext);
}
