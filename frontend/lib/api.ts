/**
 * Thin fetch wrapper around the Vision Velocity Next.js backend (04-development/backend).
 *
 * Deliberately talks to the backend's own /api routes, never directly to Supabase from the
 * browser: the backend is where request validation, RLS-scoped queries, rate limiting and
 * (for /api/admin/*) audit logging (see backend /lib/audit.ts) all happen. Bypassing it here
 * would silently skip that audit trail.
 */

import type { ApiErrorBody } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const TOKEN_STORAGE_KEY = 'vv_auth_token';
const REFRESH_STORAGE_KEY = 'vv_refresh_token';

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(REFRESH_STORAGE_KEY, token);
    else window.localStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // localStorage unavailable — renewal just won't persist.
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(REFRESH_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — auth state just won't persist.
  }
}

export class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error?.message || 'Request failed');
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = body.error?.code || 'UNKNOWN_ERROR';
    this.details = body.error?.details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip attaching the Authorization header — only needed for the public/auth endpoints. */
  skipAuth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// One refresh at a time: Supabase rotates refresh tokens, so parallel refreshes would fail.
let refreshInFlight: Promise<boolean> | null = null;

/** Exchanges the stored refresh token for a new session. Returns true on success. */
async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await fetch(buildUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as {
        token?: string;
        session?: { refresh_token?: string };
      };
      if (!data.token) return false;
      setStoredToken(data.token);
      if (data.session?.refresh_token) setStoredRefreshToken(data.session.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      // released on next tick so concurrent callers share this result
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, query, skipAuth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : undefined;

  if (!response.ok) {
    if (response.status === 401 && !skipAuth && !isRetry && (await refreshSession())) {
      return request<T>(path, options, true);
    }
    if (response.status === 401) {
      // Session expired or invalid — clear the stale token so useAuth reflects logged-out state.
      setStoredToken(null);
    }
    throw new ApiRequestError(response.status, payload as ApiErrorBody);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], skipAuth = false) =>
    request<T>(path, { method: 'GET', query, skipAuth }),
  post: <T>(path: string, body?: unknown, skipAuth = false) =>
    request<T>(path, { method: 'POST', body, skipAuth }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
