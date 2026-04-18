import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CACHE_KEYS } from '../utils/constants';
import { clearAllCache } from '../utils/cache';

interface AdminAuthContextValue {
  isAdmin: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(
    () => localStorage.getItem(CACHE_KEYS.AUTH) === 'true'
  );

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(CACHE_KEYS.AUTH, 'true');
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
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
