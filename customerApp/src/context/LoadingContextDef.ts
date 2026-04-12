import { createContext } from 'react';

export interface LoadingContextType {
  isLoading: boolean;
  activeCount: number;
  queuedCount: number;
}

export const LoadingContext = createContext<LoadingContextType | undefined>(undefined);
