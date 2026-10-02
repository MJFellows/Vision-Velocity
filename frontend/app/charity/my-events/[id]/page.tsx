'use client';

import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CharityLayout } from '@/components/charity/CharityLayout';
import { charityApi, type CharityEvent } from '@/lib/charityApi';
import { ApiRequestError } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RecordActions } from '@/components/RecordActions';
import { downloadCalendarEvent } from '@/lib/exporting';
import { EVENT_COVER_LABELS } from '@/lib/types';
import { aud, longDate, todayIso } from '@/lib/dates';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-charcoal/70">{label}</dt>
      <dd className="text-right">{value === null || value === undefined || value === '' ? '—' : value}</dd>
    </div>
  );
}

function ResultsForm({ event, onSaved }: { event: CharityEvent; onSaved: (e: CharityEvent) => void }) {
  const [sold, setSold] = useState(event.actual_hotdogs_sold?.toString() ?? '');
  const [sales, setSales] = useState(event.number_of_sales?.toString() ?? '');
  const [value, setValue] = useState(event.sales_value_aud?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const int = (v: string) => (v.trim() === '' ? null : /^\d{1,7}$/.test(v.trim()) ? Number(v) : NaN);
    const s1 = int(sold);
    const s2 = int(sales);
    const v = value.trim() === '' ? null : /^\d{1,8}(\.\d{1,2})?$/.test(value.trim()) ? Number(value) : NaN;
    if ([s1, s2, v].some((x) => Number.isNaN(x))) return setError('Use whole numbers for hotdogs and sales, and dollars and cents for the value.');
    setBusy(true);
    try {
      const res = await charityApi.saveResults(event.id, { actual_hotdogs_sold: s1, number_of_sales: s2, sales_value_aud: v });
      onSaved(res.data);
      setMsg('Results saved — thank you.');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" data-form="Charity results">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Hotdogs sold" inputMode="numeric" value={sold} onChange={(e) => setSold(e.target.value)} />
        <Input label="Number of sales" inputMode="numeric" value={sales} onChange={(e) => setSales(e.target.value)} />
        <Input label="Value of sales ($)" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <Button type="submit" isLoading={busy}>
        Save results
      </Button>
    </form>
  );
}

function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const [event, setEvent] = useState<CharityEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvent((await charityApi.event(id)).data);
    } catch {
      setError('Could not load this event.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!event) return <p className="text-sm text-charcoal/70">Loading…</p>;

  const canEnterResults = event.event_date <= todayIso() && !['requested', 'cancelled'].includes(event.status);
  const s = event.bunnings_stores;

  return (
    <>
      <Link href="/charity/my-events" className="mb-4 inline-block text-sm text-accent underline">
        &larr; My events
      </Link>
      {params.get('requested') && (
        <p className="mb-4 rounded-card bg-green-50 p-3 text-sm text-green-800">Thank you — your request has been sent. Vision Velocity will confirm it with you.</p>
      )}
      {event.event_name && <p className="mb-1 text-lg font-semibold text-navy">{event.event_name}</p>}
      <h1 className="mb-1">{longDate(event.event_date)}</h1>
      <div className="mb-6">
        <Badge tone={toneForStatus(event.status)}>{event.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Bunnings store" value={s?.location} />
            <Row label="Address" value={[s?.store_address, s?.suburb, s?.state, s?.postcode].filter(Boolean).join(', ')} />
            <Row label="Store phone" value={s?.store_phone} />
            <Row label="Stall location" value={event.cover_type ? EVENT_COVER_LABELS[event.cover_type] : null} />
            <Row label="Shifts" value={event.number_of_shifts} />
            <Row label="Volunteers needed" value={event.estimated_staff} />
            <Row label="Estimated hotdogs" value={event.estimated_hotdogs} />
            <Row label="Packages" value={event.event_packages.map((p) => `${p.quantity} × ${p.packages?.name ?? 'package'}`).join(', ')} />
          </dl>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          {canEnterResults ? (
            <ResultsForm event={event} onSaved={setEvent} />
          ) : (
            <dl className="space-y-2 text-sm">
              <Row label="Hotdogs sold" value={event.actual_hotdogs_sold} />
              <Row label="Number of sales" value={event.number_of_sales} />
              <Row label="Value of sales" value={event.sales_value_aud != null ? aud(event.sales_value_aud) : null} />
              <p className="pt-2 text-xs text-charcoal/70">You can enter results from the day of the event.</p>
            </dl>
          )}
        </Card>
      </div>

      {event.status !== 'requested' && (
        <div className="mt-6">
          <RecordActions
            title="Run sheet"
            documentPath={`/api/charity/events/${event.id}/run-sheet`}
            emailPath={`/api/charity/events/${event.id}/email`}
            filename={`Run-sheet-${event.event_date}.pdf`}
            extra={
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  downloadCalendarEvent({
                    date: event.event_date,
                    uid: event.id,
                    title: event.event_name || 'Sausage sizzle',
                    location: s ? `Bunnings ${s.location}${s.store_address ? `, ${s.store_address}` : ''}` : null,
                  })
                }
              >
                Add to calendar
              </Button>
            }
          />
        </div>
      )}

      {(event.actual_hotdogs_sold != null || event.number_of_sales != null || event.sales_value_aud != null) && (
        <RecordActions
          title="Results summary"
          documentPath={`/api/charity/events/${event.id}/results-summary`}
          emailPath={`/api/charity/events/${event.id}/email`}
          emailExtra={{ document: 'results_summary' }}
          filename={`Results-${event.event_date}.pdf`}
        />
      )}
    </>
  );
}

export default function CharityEventPage() {
  return (
    <CharityLayout>
      <Suspense fallback={null}>
        <EventDetail />
      </Suspense>
    </CharityLayout>
  );
}
