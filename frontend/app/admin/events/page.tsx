'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EVENT_STATUS_OPTIONS } from '@/components/forms/FundraisingEventForm';
import { listEvents } from '@/lib/adminApi';
import type { EventStatus, FundraisingEvent } from '@/lib/types';

const PAGE_SIZE = 25;

function formatEventDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminEventsPage() {
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<FundraisingEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listEvents({
        status: (status || undefined) as EventStatus | undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setEvents(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch {
      setError('Could not load events — try again.');
    } finally {
      setIsLoading(false);
    }
  }, [status, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1>Events</h1>
        <Link href="/admin/events/new">
          <Button>Add event</Button>
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          options={[{ value: '', label: 'All statuses' }, ...EVENT_STATUS_OPTIONS]}
        />
        <Input label="From" type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
        <Input label="To" type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <p className="mb-3 text-sm text-charcoal/60" aria-live="polite">
        {isLoading ? 'Loading…' : `${total} event${total === 1 ? '' : 's'}`}
      </p>

      {!isLoading && events.length === 0 ? (
        <p className="text-sm text-charcoal/60">No events match these filters.</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const confirmed = ev.event_suppliers.filter((s) => s.status === 'confirmed').length;
            const possible = ev.event_suppliers.filter((s) => s.status === 'possible').length;
            const declined = ev.event_suppliers.filter((s) => s.status === 'declined').length;
            return (
              <Link key={ev.id} href={`/admin/events/${ev.id}`}>
                <Card className="hover:border-accent">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-navy">{formatEventDate(ev.event_date)}</p>
                      {ev.event_name && <p className="text-sm font-medium text-charcoal">{ev.event_name}</p>}
                      <p className="text-sm text-charcoal/70">{ev.charities?.name ?? 'Charity'}</p>
                      <p className="text-sm text-charcoal/60">{ev.bunnings_stores?.location ?? 'Bunnings store'}</p>
                      <p className="mt-1 text-xs text-charcoal/60">
                        Suppliers: {confirmed} confirmed · {possible} possible · {declined} declined
                      </p>
                    </div>
                    <Badge tone={toneForStatus(ev.status)}>{ev.status}</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-charcoal/60">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
