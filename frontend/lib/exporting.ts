/** Helpers for getting records out of the site: PDFs (with sign-in), spreadsheets (CSV) and calendar files. */

import { getStoredToken, ApiRequestError } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export async function fetchPdf(path: string): Promise<Blob> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Could not create the document', code: 'DOCUMENT_FAILED' } }));
    throw new ApiRequestError(res.status, body);
  }
  return res.blob();
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens the PDF in a new tab so it can be printed. Returns false if the browser blocked the tab. */
export function openBlobForPrinting(blob: Blob, win: Window | null): boolean {
  const url = URL.createObjectURL(blob);
  if (win) {
    win.location.href = url;
    return true;
  }
  return false;
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Downloads rows as a spreadsheet file (CSV opens in Excel, Numbers and Google Sheets). */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(','));
  // The byte-order mark makes Excel read accents and symbols correctly.
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  saveBlob(blob, filename);
}

/** Downloads an all-day calendar entry (.ics) that phones, Outlook and Google Calendar can open. */
export function downloadCalendarEvent(opts: { date: string; title: string; location?: string | null; description?: string | null; uid: string }) {
  const d = opts.date.replace(/-/g, '');
  const next = new Date(`${opts.date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = next.toISOString().slice(0, 10).replace(/-/g, '');
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vision Velocity//Events//EN',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@visionvelocity.com.au`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(opts.title)}`,
    opts.location ? `LOCATION:${esc(opts.location)}` : '',
    opts.description ? `DESCRIPTION:${esc(opts.description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  saveBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), `${opts.title.replace(/[^A-Za-z0-9 -]+/g, '').slice(0, 50) || 'event'}.ics`);
}
