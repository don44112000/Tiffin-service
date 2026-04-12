import React, { useState, useEffect } from 'react';
import { requestQueue } from '../services/queueManager';
import { LoadingContext } from './LoadingContextDef';

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    activeCount: 0,
    queuedCount: 0,
    interactiveActiveCount: 0,
    interactiveQueuedCount: 0
  });

  useEffect(() => {
    // Subscribe to request queue updates
    const unsubscribe = requestQueue.subscribe((newState) => {
      setState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Only show loading if there are non-silent (interactive) requests
  const isLoading = state.interactiveActiveCount > 0 || state.interactiveQueuedCount > 0;

  return (
    <LoadingContext.Provider value={{ 
      isLoading, 
      activeCount: state.activeCount, 
      queuedCount: state.queuedCount 
    }}>
      {children}
    </LoadingContext.Provider>
  );
}
