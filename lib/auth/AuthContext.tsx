'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface AppUser {
  id: string;
  name: string;
  provider: 'guest';
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  /** Sign in as a local guest. The prototype has no backend, so the user is
   *  stored in localStorage only — same shape as maeth's offline fallback. */
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'two-towers.local-user';

function loadLocalUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function storeLocalUser(user: AppUser | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(loadLocalUser());
    setLoading(false);
  }, []);

  const login = useCallback(() => {
    const u: AppUser = { id: `guest-${Date.now()}`, name: 'Guest', provider: 'guest' };
    setUser(u);
    storeLocalUser(u);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    storeLocalUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
