'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CharityLayout, useCharity } from '@/components/charity/CharityLayout';
import { charityApi, type CharityEvent } from '@/lib/charityApi';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { longDate, shortDate, todayIso } from '@/lib/dates';

function Home() {
  const { me } = useCharity();
  const [events, setEvents] = useState<CharityEvent[] | null>(null);

  useEffect(() => {
    charityApi
      .events()
      .then((r) => setEvents(r.data))
      .catch(() => setEvents([]));
  }, []);

  const today = todayIso();
  const upcoming = (events ?? []).filter((e) => e.event_date >= today && e.status !== 'cancelled').sort((a, b) => a.event_date.localeCompare(b.event_date));
  const next = upcoming.find((e) => e.status !== 'requested');
  const requested = upcoming.filter((e) => e.status === 'requested');
  const needResults = (events ?? []).filter(
    (e) => e.event_date <= today && ['planned', 'confirmed', 'completed'].includes(e.status) && e.actual_hotdogs_sold == null && e.sales_value_aud == null
  );
  const firstName = me.user.name?.split(' ')[0];

  return (
    <>
      <h1 className="mb-1">Hello{firstName ? ` ${firstName}` : ''}</h1>
      <p className="mb-6 text-sm text-charcoal/70">Here is where things stand for {me.charity.name}.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your next event</CardTitle>
          </CardHeader>
          {events === null ? (
            <p className="text-sm text-charcoal/70">Loading…</p>
          ) : next ? (
            <Link href={`/charity/my-events/${next.id}`} className="block">
              <p className="font-medium text-navy">{next.event_name || 'Sausage sizzle'}</p>
              <p className="text-sm text-charcoal/80">{longDate(next.event_date)}</p>
              <p className="mb-2 text-sm text-charcoal/80">Bunnings {next.bunnings_stores?.location}</p>
              <Badge tone={toneForStatus(next.status)}>{next.status}</Badge>
            </Link>
          ) : (
            <p className="text-sm text-charcoal/70">No event booked yet.</p>
          )}
          <Link href="/charity/my-events/new" className="mt-4 inline-block">
            <Button>Request an event</Button>
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waiting for you</CardTitle>
          </CardHeader>
          {events === null && <p className="text-sm text-charcoal/70">Loading…</p>}
          {events !== null && needResults.length === 0 && requested.length === 0 && <p className="text-sm text-green-700">Nothing is waiting for you right now.</p>}
          {needResults.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 text-sm font-semibold text-navy">Please enter your results</p>
              <ul className="space-y-1 text-sm">
                {needResults.map((e) => (
                  <li key={e.id}>
                    <Link href={`/charity/my-events/${e.id}`} className="text-accent underline">
                      {shortDate(e.event_date)} · {e.bunnings_stores?.location}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {requested.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-semibold text-navy">Requests waiting for Vision Velocity to confirm</p>
              <ul className="space-y-1 text-sm text-charcoal/80">
                {requested.map((e) => (
                  <li key={e.id}>
                    {shortDate(e.event_date)} · {e.bunnings_stores?.location}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
          </CardHeader>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-charcoal/80">
            <li>Request an event with your preferred date and Bunnings store.</li>
            <li>Vision Velocity confirms the booking with Bunnings and arranges supplies.</li>
            <li>You receive the run sheet for your volunteers — you can also print or email it from the event page.</li>
            <li>After the day, enter your results so you and we can see how it went.</li>
          </ol>
        </Card>
      </div>
    </>
  );
}

export default function CharityHomePage() {
  return (
    <CharityLayout>
      <Home />
    </CharityLayout>
  );
}
