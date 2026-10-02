/** "Recently viewed" records, kept in this browser only. */

export interface RecentItem {
  path: string;
  label: string;
  kind: string;
  at: number;
}

const KEY = 'vv_recent_records';
const KINDS: Record<string, string> = {
  charities: 'Charity',
  events: 'Event',
  orders: 'Order',
  suppliers: 'Supplier',
  bunnings: 'Bunnings store',
};

export function readRecent(): RecentItem[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as RecentItem[];
  } catch {
    return [];
  }
}

export function rememberRecent(path: string, label: string) {
  const section = path.split('/')[2] ?? '';
  const kind = KINDS[section];
  if (!kind || !label) return;
  try {
    const list = readRecent().filter((r) => r.path !== path);
    list.unshift({ path, label: label.slice(0, 80), kind, at: Date.now() });
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    // Storage unavailable: recently viewed just won't be remembered.
  }
}
