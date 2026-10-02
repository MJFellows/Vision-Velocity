'use client';

/** Events at the Activities Officer's store: upcoming and the last six months, with run sheets. */

import { useState } from 'react';
import { BunningsLayout, useAo } from '@/components/bunnings/BunningsLayout';
import { Card } from '@/components/ui/Card';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api';
import { bunningsApi, type AoEvent } from '@/lib/bunningsApi';
import { openBlobForPrinting, saveBlob, downloadCalendarEvent } from '@/lib/exporting';
import { statusLabel } from '@/lib/labels';
import { EVENT_COVER_LABELS } from '@/lib/types';
import { longDate } from '@/lib/dates';

function EventCard({ e, store, past }: { e: AoEvent; store: string; past?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filename = `Run-sheet-${e.event_date}.pdf`;

  const sheet = async (kind: 'print' | 'download') => {
    setBusy(kind);
    setError(null);
    const win = kind === 'print' ? window.open('', '_blank') : null;
    try {
      const blob = await bunningsApi.runSheet(e.id);
      if (kind === 'download' || !openBlobForPrinting(blob, win)) saveBlob(blob, filename);
    } catch (err) {
      win?.close();
      setError(err instanceof ApiRequestError ? err.message : 'Could not create the run sheet — try again.');
    } finally {
      setBusy(null);
    }
  };

  const c = e.charities;
  return (
    <Card className="mb-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-navy">{longDate(e.event_date)}</h3>
          <p className="text-sm text-charcoal/80">{e.event_name || `${c?.name ?? 'Charity'} sausage sizzle`}</p>
        </div>
        <Badge tone={toneForStatus(e.status)}>{statusLabel(e.status)}</Badge>
      </div>
      <dl className="mb-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline text-charcoal/70">Charity: </dt>
          <dd className="inline">{c?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="inline text-charcoal/70">Contact: </dt>
          <dd className="inline">
            {c?.contact_name ?? '—'}
            {c?.phone && (
              <>
                {' · '}
                <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="text-accent underline">
                  {c.phone}
                </a>
              </>
            )}
          </dd>
        </div>
        {e.cover_type && (
          <div>
            <dt className="inline text-charcoal/70">Stall: </dt>
            <dd className="inline">{EVENT_COVER_LABELS[e.cover_type]}</dd>
          </div>
        )}
        {(e.number_of_shifts != null || e.estimated_staff != null) && (
          <div>
            <dt className="inline text-charcoal/70">Volunteers: </dt>
            <dd className="inline">
              {e.estimated_staff ?? '—'}
              {e.number_of_shifts != null ? ` across ${e.number_of_shifts} shift${e.number_of_shifts === 1 ? '' : 's'}` : ''}
            </dd>
          </div>
        )}
      </dl>
      {(
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" isLoading={busy === 'print'} onClick={() => sheet('print')} data-track="Print run sheet">
            Print run sheet
          </Button>
          <Button type="button" variant="outline" isLoading={busy === 'download'} onClick={() => sheet('download')} data-track="Download run sheet">
            Download PDF
          </Button>
          {!past && <Button
            type="button"
            variant="outline"
            data-track="Add to calendar"
            onClick={() =>
              downloadCalendarEvent({
                date: e.event_date,
                uid: e.id,
                title: `Sausage sizzle: ${c?.name ?? 'charity'}`,
                location: `Bunnings ${store}`,
                description: c?.contact_name ? `Charity contact: ${c.contact_name}${c.phone ? `, ${c.phone}` : ''}` : null,
              })
            }
          >
            Add to calendar
          </Button>}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </Card>
  );
}

function EventsList() {
  const { data } = useAo();
  return (
    <>
      <h1 className="mb-1">Events at Bunnings {data.store.location}</h1>
      <p className="mb-6 text-sm text-charcoal/70">Charity sausage sizzles Vision Velocity is arranging at your store. Questions? Use Contact us at the top.</p>

      <h2 className="mb-3 text-lg font-semibold text-navy">Coming up ({data.upcoming.length})</h2>
      {data.upcoming.length === 0 ? (
        <Card className="mb-6">
          <p className="text-sm text-charcoal/80">No upcoming events at your store yet. We will email you when one is being arranged.</p>
        </Card>
      ) : (
        <div className="mb-6">
          {data.upcoming.map((e) => (
            <EventCard key={e.id} e={e} store={data.store.location} />
          ))}
        </div>
      )}

      {data.past.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-navy">Last six months ({data.past.length})</h2>
          {data.past.map((e) => (
            <EventCard key={e.id} e={e} store={data.store.location} past />
          ))}
        </>
      )}
    </>
  );
}

export default function BunningsEventsPage() {
  return (
    <BunningsLayout>
      <EventsList />
    </BunningsLayout>
  );
}
