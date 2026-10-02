'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CharityLayout, useCharity } from '@/components/charity/CharityLayout';
import { charityApi, type CharityPerson } from '@/lib/charityApi';
import { ApiRequestError } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function errText(err: unknown) {
  if (err instanceof ApiRequestError) {
    const d = err.details && typeof err.details === 'object' ? Object.values(err.details as Record<string, string>).join(' ') : '';
    return d ? `${err.message}: ${d}` : err.message;
  }
  return 'Something went wrong — please try again.';
}

function Details() {
  const { me, reload } = useCharity();
  const c = me.charity;
  const [contact, setContact] = useState(c.contact_name ?? '');
  const [email, setEmail] = useState(c.email ?? '');
  const [phone, setPhone] = useState(c.phone ?? '');
  const [location, setLocation] = useState(c.location ?? '');
  const [postcode, setPostcode] = useState(c.postcode ?? '');
  const [storeId, setStoreId] = useState(c.bunnings_store_id ?? '');
  const [stores, setStores] = useState<{ id: string; location: string }[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    charityApi
      .bunningsStores()
      .then((r) => setStores([...r.data].sort((a, b) => a.location.localeCompare(b.location))))
      .catch(() => setStores([]));
  }, []);
  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? stores.filter((s) => s.id === storeId || s.location.toLowerCase().includes(q)) : stores;
  }, [stores, filter, storeId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (postcode && !/^\d{4}$/.test(postcode.trim())) return setError('Postcode must be 4 digits.');
    setBusy(true);
    try {
      await charityApi.updateProfile({
        contact_name: contact.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        postcode: postcode.trim() || null,
        bunnings_store_id: storeId || null,
      });
      await reload();
      setMsg('Your details have been saved.');
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your charity&apos;s details</CardTitle>
      </CardHeader>
      <form onSubmit={submit} className="space-y-3" data-form="Charity profile">
        <p className="text-sm text-charcoal/70">
          <strong>{c.name}</strong>
          {c.tax_id ? ` · ABN ${c.tax_id}` : ''}. To change your charity&apos;s name or ABN, use Contact us.
        </p>
        <Input label="Main contact name" value={contact} onChange={(e) => setContact(e.target.value)} />
        <Input label="Contact email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Address or area" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Input label="Postcode" inputMode="numeric" maxLength={4} value={postcode} onChange={(e) => setPostcode(e.target.value)} />
        <div className="space-y-1">
          <Input label="Preferred Bunnings store — type to narrow the list" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <select aria-label="Preferred Bunnings store" value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-full rounded-card border border-grey bg-white px-3 py-2 text-sm focus-ring">
            <option value="">No preference</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.location}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <Button type="submit" isLoading={busy}>
          Save changes
        </Button>
        <p className="text-xs text-charcoal/70">Changing the contact email here does not change the email you sign in with.</p>
      </form>
    </Card>
  );
}

function People() {
  const { me } = useCharity();
  const isOwner = me.user.role === 'owner';
  const [people, setPeople] = useState<CharityPerson[] | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await charityApi.people();
      setPeople(r.data);
      setMyId(r.me);
    } catch {
      setPeople([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const r = await charityApi.addPerson({ name: name.trim(), email: email.trim() });
      setMsg(r.data.emailSent ? `We have emailed ${email.trim()} a link to set up their sign-in.` : 'Access given, but the email could not be sent. Please use Contact us.');
      setAdding(false);
      setName('');
      setEmail('');
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p: CharityPerson) => {
    if (p.is_active && !window.confirm(`Switch off sign-in access for ${p.name || p.email}?`)) return;
    try {
      await charityApi.setPersonActive(p.id, !p.is_active);
      await load();
    } catch (err) {
      setError(errText(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>People who can sign in</CardTitle>
      </CardHeader>
      {people === null && <p className="text-sm text-charcoal/70">Loading…</p>}
      <ul className="mb-3 divide-y divide-grey text-sm">
        {people?.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p className="font-medium text-navy">
                {p.name || p.email} {p.role === 'owner' && <Badge tone="info">Main contact</Badge>} {!p.is_active && <Badge tone="danger">Switched off</Badge>}
                {p.id === myId && <span className="ml-1 text-xs text-charcoal/70">(you)</span>}
              </p>
              <p className="text-xs text-charcoal/70">{p.email}</p>
            </div>
            {isOwner && p.id !== myId && (
              <button type="button" className="text-xs text-charcoal/70 underline" onClick={() => toggle(p)}>
                {p.is_active ? 'Switch off' : 'Switch on'}
              </button>
            )}
          </li>
        ))}
      </ul>
      {msg && <p className="mb-2 text-sm text-green-700">{msg}</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {isOwner ? (
        adding ? (
          <form onSubmit={add} className="space-y-3 rounded-card border border-grey p-3" data-form="Add person">
            <Input label="Their name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Their email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div className="flex gap-2">
              <Button type="submit" isLoading={busy}>
                Add person
              </Button>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)}>
            + Add a person (for example your treasurer)
          </Button>
        )
      ) : (
        <p className="text-xs text-charcoal/70">Your charity&apos;s main contact can add or remove people.</p>
      )}
    </Card>
  );
}

export default function CharityProfilePage() {
  return (
    <CharityLayout>
      <h1 className="mb-6">Profile</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Details />
        <People />
      </div>
    </CharityLayout>
  );
}
