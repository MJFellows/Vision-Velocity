'use client';

/**
 * AuthContext & useAuth hook.
 *
 * Flow: login POSTs to the backend's /api/auth/login, which returns a Supabase JWT + user
 * profile; the token is persisted to localStorage (see /lib/api.ts) and attached as a Bearer
 * token on every subsequent request. Logout POSTs /api/auth/logout (revokes the token
 * server-side via Supabase's admin.signOut) and clears local storage regardless of the
 * response, so the client never gets stuck "logged in" against a dead session.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, getStoredToken, setStoredToken, setStoredRefreshToken, ApiRequestError } from './api';
import type { AuthUser, LoginResponse } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** True while the initial session is being restored from localStorage on first load. */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount. The token itself is opaque to us — we don't
  // decode it client-side; the backend is the source of truth for whether it's still valid,
  // so we simply attach it and let the first authenticated request confirm or reject it.
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = typeof window !== 'undefined' ? window.localStorage.getItem('vv_auth_user') : null;
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        setStoredToken(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<LoginResponse>('/api/auth/login', { email, password }, true);
    setStoredToken(result.token);
    setStoredRefreshToken(result.session?.refresh_token ?? null);
    try {
      window.localStorage.setItem('vv_auth_user', JSON.stringify(result.user));
    } catch {
      // Non-fatal — user info just won't survive a hard refresh until the next login.
    }
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      // Logout should never leave the UI stuck: proceed with clearing local state even if the
      // backend call fails (e.g. token already expired, network error).
      if (!(err instanceof ApiRequestError)) {
        console.error('Logout request failed:', err);
      }
    } finally {
      setStoredToken(null);
      try {
        window.localStorage.removeItem('vv_auth_user');
      } catch {
        // ignore
      }
      setToken(null);
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(user && token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
