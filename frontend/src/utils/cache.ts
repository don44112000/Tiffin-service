import { CACHE_KEYS, CACHE_TTL_MS } from './constants';

function getTimestamps(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEYS.TIMESTAMPS) || '{}');
  } catch {
    return {};
  }
}

function setTimestamp(key: string): void {
  const ts = getTimestamps();
  ts[key] = Date.now();
  localStorage.setItem(CACHE_KEYS.TIMESTAMPS, JSON.stringify(ts));
}

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    setTimestamp(key);
  } catch {
    // Quota exceeded or private mode — silently fail
  }
}

export function invalidateCache(key: string): void {
  localStorage.removeItem(key);
  const ts = getTimestamps();
  delete ts[key];
  localStorage.setItem(CACHE_KEYS.TIMESTAMPS, JSON.stringify(ts));
}

export function isCacheStale(key: string, ttlMs = CACHE_TTL_MS): boolean {
  const ts = getTimestamps();
  if (!ts[key]) return true;
  return Date.now() - ts[key] > ttlMs;
}

export function clearAllCache(): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('tiffin_'));
  keys.forEach((k) => localStorage.removeItem(k));
}
