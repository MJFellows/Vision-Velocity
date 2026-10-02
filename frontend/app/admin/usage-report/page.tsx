'use client';

/** Site usage: how the site is used (from usage records) and feedback received. */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';

interface Count {
  label: string;
  count: number;
}
interface Report {
  days: number;
  userTypes: Record<string, { totalEvents: number; topButtons: Count[]; topPages: Count[]; devices: Count[] }>;
  helpOpened: Count[];
  searchesWithNoResults: Count[];
  formsAbandoned: Count[];
  formsSubmitted: Count[];
  publicVisits: { total: number; topPages: Count[]; devices: Count[] };
}
interface Feedback {
  id: string;
  created_at: string;
  user_email: string | null;
  user_type: string;
  page: string | null;
  message: string;
  status: 'new' | 'done';
}

function CountList({ items, empty = 'Nothing recorded yet.' }: { items: Count[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-charcoal/60">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-2 text-sm">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex justify-between gap-3">
            <span className="truncate text-charcoal">{i.label}</span>
            <span className="tabular-nums text-charcoal/70">{i.count}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-grey">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.max(4, (i.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const TYPE_LABEL: Record<string, string> = { admin: 'Founders / admins', charity: 'Charities', bunnings: 'Bunnings Activities Officers' };

export default function UsageReportPage() {
  const [days, setDays] = useState('30');
  const [report, setReport] = useState<Report | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: string) => {
    try {
      const [r, f] = await Promise.all([
        api.get<{ data: Report }>('/api/admin/usage-report', { days: d }),
        api.get<{ data: Feedback[] }>('/api/admin/feedback'),
      ]);
      setReport(r.data);
      setFeedback(f.data);
    } catch {
      setError('Could not load the report — try refreshing.');
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const markDone = async (id: string, status: 'new' | 'done') => {
    await api.patch(`/api/admin/feedback?id=${id}&status=${status}`);
    setFeedback((list) => list.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1">Site usage</h1>
          <p className="text-sm text-charcoal/60">
            Which pages and buttons are used, so we can put the most-used things first.{' '}
            <Link href="/admin/help/usage-and-privacy" className="text-accent underline">
              What is recorded
            </Link>
          </p>
        </div>
        <div className="w-44">
          <Select
            aria-label="Period"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
              { value: '365', label: 'Last 12 months' },
            ]}
          />
        </div>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!report && !error && <p className="text-sm text-charcoal/60">Loading…</p>}

      {report && (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.keys(report.userTypes).length === 0 && (
            <Card className="lg:col-span-2">
              <p className="text-sm text-charcoal/60">No usage recorded yet for this period. Figures appear as people use the site.</p>
            </Card>
          )}
          {Object.entries(report.userTypes).map(([type, t]) => (
            <Card key={type} className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{TYPE_LABEL[type] ?? type}</CardTitle>
              </CardHeader>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-navy">Most-used buttons</h3>
                  <CountList items={t.topButtons} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-navy">Most-visited pages</h3>
                  <CountList items={t.topPages} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-navy">Devices</h3>
                  <CountList items={t.devices} />
                </div>
              </div>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Forms left unfinished</CardTitle>
            </CardHeader>
            <CountList items={report.formsAbandoned} empty="None — good." />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Searches that found nothing</CardTitle>
            </CardHeader>
            <CountList items={report.searchesWithNoResults} empty="None." />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Help opened (by page)</CardTitle>
            </CardHeader>
            <CountList items={report.helpOpened} />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Public visits ({report.publicVisits.total})</CardTitle>
            </CardHeader>
            <CountList items={report.publicVisits.topPages} />
          </Card>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        {feedback.length === 0 ? (
          <p className="text-sm text-charcoal/60">No feedback yet.</p>
        ) : (
          <ul className="divide-y divide-grey">
            {feedback.map((f) => (
              <li key={f.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-charcoal/60">
                    {new Date(f.created_at).toLocaleString('en-AU')} · {f.user_type === 'charity' ? 'Charity' : 'Admin'} · {f.user_email ?? 'unknown'} · {f.page ?? ''}
                  </p>
                  <button type="button" className="text-accent underline" onClick={() => markDone(f.id, f.status === 'new' ? 'done' : 'new')}>
                    {f.status === 'new' ? 'Mark as dealt with' : 'Reopen'}
                  </button>
                </div>
                <p className={`mt-1 whitespace-pre-wrap ${f.status === 'done' ? 'text-charcoal/50 line-through' : 'text-charcoal'}`}>{f.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminLayout>
  );
}
