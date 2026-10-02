/**
 * Usage recording for the admin and charity areas: which pages are opened and
 * which buttons are pressed, on what kind of device. Never records anything
 * typed into forms (only whether a form was submitted or abandoned). Search
 * terms that find nothing are recorded so missing records can be added.
 */

import { getStoredToken } from './api';

type UsageType = 'page_view' | 'click' | 'search_no_results' | 'help_open' | 'form_abandoned' | 'form_submitted';

interface UsageEvent {
  event_type: UsageType;
  page: string;
  target?: string | null;
  device: 'phone' | 'tablet' | 'computer' | 'unknown';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

let endpoint: string | null = null;
let queue: UsageEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function deviceType(): UsageEvent['device'] {
  if (typeof window === 'undefined') return 'unknown';
  const w = window.innerWidth;
  if (w < 640) return 'phone';
  if (w < 1024) return 'tablet';
  return 'computer';
}

function currentPage(): string {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

export function setUsageEndpoint(path: string | null) {
  endpoint = path;
}

export function flushUsage(keepalive = false) {
  if (!endpoint || queue.length === 0) return;
  const token = getStoredToken();
  if (!token) {
    queue = [];
    return;
  }
  const batch = queue.splice(0, 50);
  fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ events: batch }),
    keepalive,
  }).catch(() => undefined);
}

export function trackUsage(event_type: UsageType, target?: string | null, page?: string) {
  if (!endpoint || typeof window === 'undefined') return;
  queue.push({ event_type, page: page ?? currentPage(), target: target ? target.slice(0, 120) : null, device: deviceType() });
  if (queue.length >= 20) flushUsage();
  else if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      flushUsage();
    }, 5000);
  }
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** A short, non-personal label for a clicked button or link. */
export function labelFor(el: HTMLElement): string | null {
  if (el.closest('[data-no-track]')) return null;
  const explicit = el.getAttribute('data-track');
  if (explicit) return explicit;
  if (el instanceof HTMLAnchorElement) {
    const href = el.getAttribute('href') ?? '';
    // Links to individual records: record the kind of record, not its name.
    if (UUID_RE.test(href)) {
      const kind = href.split('/').filter(Boolean)[1] ?? 'record';
      return `Open ${kind.replace(/s$/, '')}`;
    }
  }
  const text = (el.getAttribute('aria-label') || el.innerText || '').trim().split('\n')[0];
  return text ? text.slice(0, 60) : null;
}
