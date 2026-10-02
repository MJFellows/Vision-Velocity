'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CharityLayout, useCharity } from '@/components/charity/CharityLayout';
import { charityApi } from '@/lib/charityApi';
import { ApiRequestError } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { todayIso } from '@/lib/dates';

function RequestEvent() {
  const { me } = useCharity();
  const router = useRouter();
  const [stores, setStores] = useState<{ id: string; location: string }[]>([]);
  const [filter, setFilter] = useState('');
  const [storeId, setStoreId] = useState(me.charity.bunnings_store_id ?? '');
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    charityApi
      .bunningsStores()
      .then((r) => setStores([...r.data].sort((a, b) => a.location.localeCompare(b.location))))
      .catch(() => setError('Could not load the list of Bunnings stores — please refresh.'));
  }, []);

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? stores.filter((s) => s.id === storeId || s.location.toLowerCase().includes(q)) : stores;
  }, [stores, filter, storeId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!date) return setError('Choose your preferred date.');
    if (!storeId) return setError('Choose a Bunnings store.');
    setBusy(true);
    try {
      const res = await charityApi.requestEvent({
        event_date: date,
        bunnings_store_id: storeId,
        event_name: name.trim() || null,
        alternative_dates: alternatives.trim() || null,
        message: message.trim() || null,
      });
      router.push(`/charity/my-events/${res.data.id}?requested=1`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const details = err.details && typeof err.details === 'object' ? Object.values(err.details as Record<string, string>).join(' ') : '';
        setError(details ? `${err.message}: ${details}` : err.message);
      } else setError('Could not send your request — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="mb-6">Request an event</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Your preferred date and store</CardTitle>
        </CardHeader>
        <form onSubmit={submit} className="space-y-4" data-form="Request an event">
          <Input label="Preferred date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} required />
          <div className="space-y-1">
            <Input label="Bunnings store — type to narrow the list" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Store name" />
            <select
              aria-label="Bunnings store"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-card border border-grey bg-white px-3 py-2 text-sm focus-ring"
              required
            >
              <option value="">Choose a Bunnings store</option>
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.location}
                </option>
              ))}
            </select>
          </div>
          <Input label="Event name (optional)" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring fundraiser" />
          <Input label="Other dates that would suit (optional)" value={alternatives} onChange={(e) => setAlternatives(e.target.value)} placeholder="e.g. any Saturday in November" />
          <div>
            <label htmlFor="request-message" className="mb-1 block text-sm font-medium text-charcoal">
              Anything else we should know? (optional)
            </label>
            <textarea id="request-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-card border border-grey px-3 py-2 text-sm focus-ring" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" isLoading={busy}>
            Send request
          </Button>
          <p className="text-xs text-charcoal/70">Nothing is booked yet: Vision Velocity will confirm the date with you and with Bunnings.</p>
        </form>
      </Card>
    </>
  );
}

export default function RequestEventPage() {
  return (
    <CharityLayout>
      <RequestEvent />
    </CharityLayout>
  );
}
