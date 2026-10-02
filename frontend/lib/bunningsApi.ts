/**
 * The Bunnings Activities Officer area's link to the backend. AOs sign in with
 * an emailed one-time link (no password); the resulting 7-day session token is
 * kept in this browser only and sent with each request.
 */

import { ApiRequestError } from './api';
import type { EventCoverType, EventStatus } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const TOKEN_KEY = 'ao_session_token';
const STORE_KEY = 'ao_store_name';

export function getAoToken(): string | null {
  try {
    return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAoSession(token: string | null, storeName?: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      if (storeName) localStorage.setItem(STORE_KEY, storeName);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(STORE_KEY);
      // Older versions of the portal stored these too.
      localStorage.removeItem('ao_store_id');
      localStorage.removeItem('ao_name');
    }
  } catch {
    // Storage blocked (private window): the session lasts for this page only.
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.auth !== false) {
    const token = getAoToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body = await res.json().catch(() => ({ error: { message: 'Unexpected response from the server', code: 'BAD_RESPONSE' } }));
  if (!res.ok) {
    if (res.status === 401 && init.auth !== false) setAoSession(null);
    throw new ApiRequestError(res.status, body);
  }
  return body as T;
}

export interface AoEvent {
  id: string;
  event_date: string;
  event_name: string | null;
  status: EventStatus;
  cover_type: EventCoverType | null;
  estimated_hotdogs: number | null;
  estimated_staff: number | null;
  number_of_shifts: number | null;
  charities: { name: string; contact_name: string | null; phone: string | null; email: string | null } | null;
}

export interface AoStore {
  id: string;
  location: string;
  store_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  store_phone: string | null;
  activities_officer_name: string | null;
  activities_officer_email: string | null;
  activities_officer_phone: string | null;
}

export const bunningsApi = {
  openLink: (token: string) =>
    request<{ data: { sessionToken: string; storeId: string; storeName: string; aoName: string | null } }>(
      `/api/bunnings/activities-officer/auth?token=${encodeURIComponent(token)}`,
      { auth: false }
    ),
  requestLink: (email: string) => request<{ data: { message: string } }>('/api/auth/bunnings-link', { method: 'POST', body: { email }, auth: false }),
  events: () => request<{ data: { store: AoStore; upcoming: AoEvent[]; past: AoEvent[]; today: string } }>('/api/bunnings/activities-officer/events'),
  updateStore: (input: { activities_officer_name: string; activities_officer_email: string; activities_officer_phone: string | null }) =>
    request<{ data: AoStore }>('/api/bunnings/activities-officer/store', { method: 'PATCH', body: input }),
  feedback: (input: { page: string | null; message: string }) => request('/api/bunnings/activities-officer/feedback', { method: 'POST', body: input }),
  runSheet: async (eventId: string): Promise<Blob> => {
    const token = getAoToken();
    const res = await fetch(`${API_BASE_URL}/api/bunnings/activities-officer/events/${eventId}/run-sheet`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: 'Could not create the run sheet', code: 'DOCUMENT_FAILED' } }));
      if (res.status === 401) setAoSession(null);
      throw new ApiRequestError(res.status, body);
    }
    return res.blob();
  },
};
