import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CACHE_KEYS } from '../utils/constants';
import { clearAllCache } from '../utils/cache';

interface AdminAuthContextValue {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(
    () => localStorage.getItem(CACHE_KEYS.AUTH) === 'true'
  );

  const login = useCallback((password: string): boolean => {
    const correct = import.meta.env.VITE_ADMIN_PASSWORD;
    if (password === correct) {
      localStorage.setItem(CACHE_KEYS.AUTH, 'true');
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(CACHE_KEYS.AUTH);
    clearAllCache();
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AdminAuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AdminAuthProvider');
  return ctx;
}
