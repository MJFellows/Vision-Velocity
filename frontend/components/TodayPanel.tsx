'use client';

/** "Needs attention" on the dashboard, from GET /api/admin/today, plus the browser's recently viewed records. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { readRecent, type RecentItem } from '@/lib/recent';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

interface Item {
  id: string;
  event_date?: string;
  name?: string | null;
  charity?: string | null;
  store?: string | null;
  status?: string;
  missing?: string[];
  created_at?: string;
}

interface Today {
  charitiesAwaitingApproval: { id: string; name: string; created_at: string }[];
  eventRequests: Item[];
  upcomingEventsWithGaps: Item[];
  ordersNeedingAttention: Item[];
  eventsMissingResults: Item[];
  overdueInvoices?: { id: string; invoice_number: string; due_date: string; amount_aud: number; order_id: string; charity: string | null }[];
  newFeedback: number;
}

function shortDate(iso?: string) {
  if (!iso) return '';
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function Section({ title, children, count }: { title: string; children: React.ReactNode; count: number }) {
  if (count === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-semibold text-navy">
        {title} <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{count}</span>
      </h3>
      <ul className="divide-y divide-grey rounded-card border border-grey bg-white">{children}</ul>
    </div>
  );
}

function Row({ href, main, sub }: { href: string; main: string; sub?: string }) {
  return (
    <li>
      <Link href={href} className="block px-3 py-2 hover:bg-grey/30">
        <span className="text-sm font-medium text-navy">{main}</span>
        {sub && <span className="block text-xs text-charcoal/70">{sub}</span>}
      </Link>
    </li>
  );
}

export function TodayPanel() {
  const [data, setData] = useState<Today | null>(null);
  const [error, setError] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: Today }>('/api/admin/today')
      .then((r) => !cancelled && setData(r.data))
      .catch(() => !cancelled && setError(true));
    const t = setTimeout(() => !cancelled && setRecent(readRecent()), 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const total = data
    ? data.charitiesAwaitingApproval.length +
      data.eventRequests.length +
      data.upcomingEventsWithGaps.length +
      data.ordersNeedingAttention.length +
      data.eventsMissingResults.length +
      (data.overdueInvoices?.length ?? 0) +
      (data.newFeedback > 0 ? 1 : 0)
    : 0;

  return (
    <div className="mb-6 grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
        </CardHeader>
        {error && <p className="text-sm text-red-600">Could not load this list — try refreshing.</p>}
        {!data && !error && <p className="text-sm text-charcoal/70">Checking…</p>}
        {data && total === 0 && <p className="text-sm text-green-700">All clear — nothing needs attention right now.</p>}
        {data && (
          <>
            <Section title="Charities awaiting approval" count={data.charitiesAwaitingApproval.length}>
              {data.charitiesAwaitingApproval.map((c) => (
                <Row key={c.id} href={`/admin/charities/${c.id}`} main={c.name} sub={`Signed up ${shortDate(c.created_at)}`} />
              ))}
            </Section>
            <Section title="Event requests from charities" count={data.eventRequests.length}>
              {data.eventRequests.map((e) => (
                <Row key={e.id} href={`/admin/events/${e.id}`} main={`${e.charity ?? 'Charity'} — ${shortDate(e.event_date)}`} sub={`${e.store ?? ''} · press Confirm request when agreed`} />
              ))}
            </Section>
            <Section title="Events in the next 14 days with something missing" count={data.upcomingEventsWithGaps.length}>
              {data.upcomingEventsWithGaps.map((e) => (
                <Row key={e.id} href={`/admin/events/${e.id}`} main={`${shortDate(e.event_date)} · ${e.name || e.charity || 'Event'}`} sub={`${e.store ?? ''} — ${(e.missing ?? []).join(', ')}`} />
              ))}
            </Section>
            <Section title="Orders due soon that need attention" count={data.ordersNeedingAttention.length}>
              {data.ordersNeedingAttention.map((o) => (
                <Row key={o.id} href={`/admin/orders/${o.id}`} main={`${shortDate(o.event_date)} · ${o.charity ?? 'Order'}`} sub={(o.missing ?? []).join(', ')} />
              ))}
            </Section>
            <Section title="Past events with no results entered" count={data.eventsMissingResults.length}>
              {data.eventsMissingResults.map((e) => (
                <Row key={e.id} href={`/admin/events/${e.id}`} main={`${shortDate(e.event_date)} · ${e.name || e.charity || 'Event'}`} sub={e.store ?? undefined} />
              ))}
            </Section>
            <Section title="Overdue invoices" count={data.overdueInvoices?.length ?? 0}>
              {(data.overdueInvoices ?? []).map((i) => (
                <Row
                  key={i.id}
                  href={`/admin/orders/${i.order_id}`}
                  main={`${i.invoice_number} · ${i.charity ?? 'Charity'}`}
                  sub={`${Number(i.amount_aud).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })} — was due ${shortDate(i.due_date)}`}
                />
              ))}
            </Section>
            {data.newFeedback > 0 && (
              <p className="text-sm">
                <Link href="/admin/usage-report" className="text-accent underline">
                  {data.newFeedback} new feedback message{data.newFeedback === 1 ? '' : 's'}
                </Link>
              </p>
            )}
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recently viewed</CardTitle>
        </CardHeader>
        {recent.length === 0 ? (
          <p className="text-sm text-charcoal/70">Records you open (charities, events, orders, stores) will appear here.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((r) => (
              <li key={r.path}>
                <Link href={r.path} className="text-navy hover:underline">
                  <span className="mr-2 text-xs uppercase text-charcoal/70">{r.kind}</span>
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
