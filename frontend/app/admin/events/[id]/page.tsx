'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FundraisingEventForm, type FundraisingEventFormValues } from '@/components/forms/FundraisingEventForm';
import { addEventSupplier, getEvent, listSuppliers, removeEventSupplier, updateEvent, updateEventSupplier } from '@/lib/adminApi';
import type { EventSupplierStatus, FundraisingEvent, Supplier } from '@/lib/types';

const SUPPLIER_STATUS_OPTIONS = [
  { value: 'possible', label: 'Possible' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'declined', label: 'Declined' },
];

function formatEventDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<FundraisingEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Supplier picker
  const [search, setSearch] = useState('');
  const [postcode, setPostcode] = useState('');
  const [results, setResults] = useState<Supplier[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getEvent(id);
      setEvent(data);
    } catch {
      setError('Could not load this event.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEditSubmit = async (values: FundraisingEventFormValues) => {
    await updateEvent(id, {
      event_date: values.event_date,
      bunnings_store_id: values.bunnings_store_id,
      charity_id: values.charity_id,
      status: values.status,
      notes: values.notes || null,
    });
    setIsEditing(false);
    await load();
  };

  const runSearch = async (params: { search?: string; postcode?: string }) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await listSuppliers({ ...params, pageSize: 50 });
      setResults(res.data);
    } catch {
      setSearchError('Could not search suppliers — check the postcode and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!search.trim() && !postcode.trim()) {
      setSearchError('Enter a store name, suburb or postcode.');
      return;
    }
    runSearch({ search: search.trim() || undefined, postcode: postcode.trim() || undefined });
  };

  const handleAdd = async (supplierId: string) => {
    setMessage(null);
    try {
      await addEventSupplier(id, { supplier_id: supplierId, status: 'possible' });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not add the supplier.');
    }
  };

  const handleStatus = async (linkId: string, status: EventSupplierStatus) => {
    setMessage(null);
    try {
      await updateEventSupplier(id, linkId, { status });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update the supplier status.');
    }
  };

  const handleRemove = async (linkId: string) => {
    setMessage(null);
    try {
      await removeEventSupplier(id, linkId);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not remove the supplier.');
    }
  };

  if (error && !event) {
    return (
      <AdminLayout>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/admin/events" className="mt-4 inline-block text-sm text-accent underline">
          &larr; Back to events
        </Link>
      </AdminLayout>
    );
  }
  if (!event) {
    return (
      <AdminLayout>
        <p className="text-sm text-charcoal/60">Loading…</p>
      </AdminLayout>
    );
  }

  const linkedIds = new Set(event.event_suppliers.map((l) => l.supplier_id));

  return (
    <AdminLayout>
      <Link href="/admin/events" className="mb-4 inline-block text-sm text-accent underline">
        &larr; Back to events
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1">{formatEventDate(event.event_date)}</h1>
          <Badge tone={toneForStatus(event.status)}>{event.status}</Badge>
        </div>
        <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {isEditing ? (
        <Card className="mb-6 max-w-lg">
          <CardHeader>
            <CardTitle>Edit event</CardTitle>
          </CardHeader>
          <FundraisingEventForm defaultValues={event} onSubmit={handleEditSubmit} submitLabel="Save changes" />
        </Card>
      ) : (
        <Card className="mb-6 max-w-lg">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-charcoal/60">Charity</dt>
              <dd className="text-right">
                {event.charities ? (
                  <Link className="text-accent hover:underline" href={`/admin/charities/${event.charities.id}`}>
                    {event.charities.name}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-charcoal/60">Bunnings store</dt>
              <dd className="text-right">
                {event.bunnings_stores ? (
                  <Link className="text-accent hover:underline" href={`/admin/bunnings/${event.bunnings_stores.id}`}>
                    {event.bunnings_stores.location}
                  </Link>
                ) : (
                  '—'
                )}
                {event.bunnings_stores?.postcode && <span className="block text-xs text-charcoal/60">Postcode {event.bunnings_stores.postcode}</span>}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-charcoal/60">Notes</dt>
              <dd className="whitespace-pre-wrap text-right">{event.notes || '—'}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Suppliers for this event</CardTitle>
        </CardHeader>
        {message && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {message}
          </p>
        )}
        {event.event_suppliers.length === 0 ? (
          <p className="text-sm text-charcoal/60">No suppliers linked yet. Search below to add one.</p>
        ) : (
          <ul className="space-y-3">
            {event.event_suppliers.map((link) => (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-grey p-3">
                <div>
                  {link.suppliers ? (
                    <Link href={`/admin/suppliers/${link.suppliers.id}`} className="text-sm font-medium text-navy hover:underline">
                      {link.suppliers.store_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">Supplier</span>
                  )}
                  <p className="text-xs text-charcoal/60">
                    {link.suppliers ? `${link.suppliers.supplier_chain} · ${[link.suppliers.suburb, link.suppliers.state, link.suppliers.postcode].filter(Boolean).join(' ')}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    aria-label={`Status for ${link.suppliers?.store_name ?? 'supplier'}`}
                    value={link.status}
                    onChange={(e) => handleStatus(link.id, e.target.value as EventSupplierStatus)}
                    options={SUPPLIER_STATUS_OPTIONS}
                  />
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(link.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add a supplier</CardTitle>
        </CardHeader>
        <form onSubmit={handleSearch} className="mb-3 grid gap-3 sm:grid-cols-3">
          <Input label="Store or suburb" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Input label="Postcode" inputMode="numeric" value={postcode} onChange={(e) => setPostcode(e.target.value)} helperText="4 digits, or 42* to match a prefix" />
          <div className="flex items-end">
            <Button type="submit" className="w-full" isLoading={isSearching}>
              Search
            </Button>
          </div>
        </form>
        <div className="mb-4 flex flex-wrap gap-2">
          {event.bunnings_stores?.postcode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPostcode(event.bunnings_stores!.postcode!);
                runSearch({ postcode: event.bunnings_stores!.postcode! });
              }}
            >
              Suppliers in the store's postcode ({event.bunnings_stores.postcode})
            </Button>
          )}
          {event.charities?.postcode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPostcode(event.charities!.postcode!);
                runSearch({ postcode: event.charities!.postcode! });
              }}
            >
              Suppliers in the charity's postcode ({event.charities.postcode})
            </Button>
          )}
        </div>
        {searchError && <p className="mb-3 text-sm text-red-600">{searchError}</p>}
        {results && results.length === 0 && <p className="text-sm text-charcoal/60">No suppliers match.</p>}
        {results && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-card border border-grey p-3">
                <div>
                  <p className="text-sm font-medium text-navy">{s.store_name}</p>
                  <p className="text-xs text-charcoal/60">
                    {s.supplier_chain} · {[s.suburb, s.state, s.postcode].filter(Boolean).join(' ')}
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={linkedIds.has(s.id)} onClick={() => handleAdd(s.id)}>
                  {linkedIds.has(s.id) ? 'Linked' : 'Add as possible'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminLayout>
  );
}
