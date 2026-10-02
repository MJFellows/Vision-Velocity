'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CharityLayout } from '@/components/charity/CharityLayout';
import { charityApi, type CharityEvent } from '@/lib/charityApi';
import { Button } from '@/components/ui/Button';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { shortDate, todayIso } from '@/lib/dates';

function EventRow({ e }: { e: CharityEvent }) {
  return (
    <Link href={`/charity/my-events/${e.id}`} className="flex items-center justify-between gap-3 rounded-card border border-grey bg-white p-4 hover:border-accent">
      <div>
        <p className="font-medium text-navy">{shortDate(e.event_date)}</p>
        <p className="text-sm text-charcoal/70">
          {e.event_name ? `${e.event_name} · ` : ''}Bunnings {e.bunnings_stores?.location}
        </p>
      </div>
      <Badge tone={toneForStatus(e.status)}>{e.status}</Badge>
    </Link>
  );
}

function MyEvents() {
  const [events, setEvents] = useState<CharityEvent[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    charityApi
      .events()
      .then((r) => setEvents(r.data))
      .catch(() => setError(true));
  }, []);

  const today = todayIso();
  const upcoming = (events ?? []).filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past = (events ?? []).filter((e) => e.event_date < today);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1>My events</h1>
        <Link href="/charity/my-events/new">
          <Button>Request an event</Button>
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">Could not load your events — please refresh.</p>}
      {events === null && !error && <p className="text-sm text-charcoal/70">Loading…</p>}
      {events && events.length === 0 && (
        <p className="text-sm text-charcoal/70">
          You have no events yet. Press <strong>Request an event</strong> to ask for your first sausage sizzle.
        </p>
      )}
      {upcoming.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-navy">Upcoming</h2>
          <div className="mb-6 space-y-2">
            {upcoming.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        </>
      )}
      {past.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-navy">Past</h2>
          <div className="space-y-2">
            {past.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function CharityEventsPage() {
  return (
    <CharityLayout>
      <MyEvents />
    </CharityLayout>
  );
}
