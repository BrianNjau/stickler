// Installs a synchronous, SQLite-backed `localStorage` on iOS/Android (a no-op on web).
import 'expo-sqlite/localStorage/install';

/**
 * Small synchronous device key-value store for non-secret flags and caches. Never put tokens here
 * (sessions live in SecureStore). Failures are swallowed: callers pass a fallback.
 */
export const kv = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Best effort.
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Best effort.
    }
  },
  getJSON<T>(key: string): T | null {
    const raw = kv.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJSON(key: string, value: unknown): void {
    kv.set(key, JSON.stringify(value));
  },
};
