import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Customer } from '../types';
import { loginCustomer } from '../services/api';
import { readCache, writeCache, clearAllCache } from '../utils/cache';
import { CACHE_KEYS } from '../utils/constants';

interface AuthContextValue {
  user: Customer | null;
  isLoading: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (u: Customer) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Customer | null>(() => readCache<Customer>(CACHE_KEYS.USER));
  const [isLoading, setIsLoading] = useState(false);

  const setUser = useCallback((u: Customer) => {
    setUserState(u);
    writeCache(CACHE_KEYS.USER, u);
  }, []);

  const login = useCallback(async (mobile: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginCustomer(mobile, password);
      setUser(res.customer);
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const logout = useCallback(() => {
    clearAllCache();
    setUserState(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const res = await loginCustomer(user.mobile, user.password);
      setUser(res.customer);
    } catch {
      // Keep stale user data
    }
  }, [user, setUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
