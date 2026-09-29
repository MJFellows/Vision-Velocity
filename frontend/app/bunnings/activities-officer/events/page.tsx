// File: app/bunnings/activities-officer/events/page.tsx
// Read-only event list for Bunnings Activities Officers. No admin auth —
// gated by the AO session token issued by /auth, held in localStorage.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface AOEvent {
  id: string;
  eventDate: string;
  status: string;
  deliveryContactName: string | null;
  deliveryPhone: string | null;
  specialRequests: string | null;
  charity: { id: string; name: string; email: string | null; phone: string | null; contactName: string | null } | null;
  package: { id: string; name: string; description: string | null } | null;
}

interface PastEvent {
  id: string;
  eventDate: string;
  status: string;
  charityName: string;
}

interface AOStore {
  id: string;
  aoName: string | null;
  aoEmail: string;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  delivered: 'bg-grey text-charcoal',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AOEventsPage() {
  const router = useRouter();
  const [store, setStore] = useState<AOStore | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<AOEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    const load = async () => {
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('ao_session_token') : null;
      if (!sessionToken) {
        router.push('/bunnings/activities-officer/auth');
        return;
      }

      try {
        const response = await fetch('/api/bunnings/activities-officer/events', {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });

        if (response.status === 401 || response.status === 400) {
          localStorage.removeItem('ao_session_token');
          router.push('/bunnings/activities-officer/auth');
          return;
        }
        if (!response.ok) throw new Error('Failed to load events');

        const { data } = await response.json();
        setStore(data.store);
        setUpcomingEvents(data.upcomingEvents ?? []);
        setPastEvents(data.pastEvents ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('ao_session_token');
    localStorage.removeItem('ao_store_id');
    localStorage.removeItem('ao_store_name');
    localStorage.removeItem('ao_name');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grey/30">
        <p className="text-sm text-charcoal/60">Loading your events…</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grey/30 px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Something went wrong</h2>
          <p className="mb-6 text-sm text-charcoal/60">{error ?? 'No store information available.'}</p>
          <Button onClick={handleLogout}>Return Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grey/30">
      <div className="sticky top-0 z-10 border-b border-grey bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-bold text-navy sm:text-2xl">Vision Velocity</h1>
            <p className="text-sm text-charcoal/60">Events at your store</p>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-charcoal/60 hover:text-charcoal">
            Log out
          </button>
        </div>
      </div>

      <div className="border-b border-accent/20 bg-accent/5">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <p className="text-sm text-navy">
            Welcome, <span className="font-semibold">{store.aoName ?? 'there'}</span> — here are the events scheduled at your store.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex gap-4 border-b border-grey">
          <button
            onClick={() => setTab('upcoming')}
            className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === 'upcoming' ? 'border-accent text-accent' : 'border-transparent text-charcoal/60'}`}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setTab('past')}
            className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === 'past' ? 'border-accent text-accent' : 'border-transparent text-charcoal/60'}`}
          >
            Past ({pastEvents.length})
          </button>
        </div>

        {tab === 'upcoming' && (
          upcomingEvents.length === 0 ? (
            <Card className="p-6 text-center text-sm text-charcoal/60">
              No upcoming events scheduled at your store in the next 90 days.
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="p-4 sm:p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-charcoal/60">Event date</p>
                      <p className="text-lg font-bold text-navy sm:text-xl">
                        {new Date(event.eventDate).toLocaleDateString('en-AU', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[event.status] ?? 'bg-grey text-charcoal'}`}>
                      {event.status}
                    </span>
                  </div>

                  {event.charity && (
                    <div className="mb-4 border-b border-grey pb-4">
                      <p className="mb-1 text-sm text-charcoal/60">Charity</p>
                      <p className="text-base font-semibold text-navy">{event.charity.name}</p>
                      {event.charity.contactName && (
                        <p className="mt-1 text-sm text-charcoal/70">Contact: {event.charity.contactName}</p>
                      )}
                      {event.charity.phone && <p className="text-sm text-charcoal/70">{event.charity.phone}</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-charcoal/50">Package</p>
                      <p className="text-base font-semibold text-navy">{event.package?.name ?? '—'}</p>
                    </div>
                    {event.deliveryContactName && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-charcoal/50">Delivery contact</p>
                        <p className="text-base font-semibold text-navy">{event.deliveryContactName}</p>
                      </div>
                    )}
                  </div>

                  {event.specialRequests && (
                    <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-amber-700">Special requests</p>
                      <p className="text-sm text-amber-900">{event.specialRequests}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )
        )}

        {tab === 'past' && (
          pastEvents.length === 0 ? (
            <Card className="p-6 text-center text-sm text-charcoal/60">No past events to display.</Card>
          ) : (
            <div className="space-y-3">
              {pastEvents.map((event) => (
                <Card key={event.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-navy">{event.charityName}</p>
                      <p className="text-sm text-charcoal/60">{new Date(event.eventDate).toLocaleDateString('en-AU')}</p>
                    </div>
                    <span className="rounded bg-grey px-2 py-1 text-xs font-medium text-charcoal">{event.status}</span>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      <div className="mt-8 border-t border-grey bg-white py-6">
        <div className="mx-auto max-w-3xl px-4 text-center text-sm text-charcoal/60 sm:px-6">
          Questions? Contact{' '}
          <a href="mailto:support@visionvelocity.com.au" className="text-accent hover:underline">
            support@visionvelocity.com.au
          </a>
        </div>
      </div>
    </div>
  );
}
