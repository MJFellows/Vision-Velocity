'use client';

/** The Activities Officer checks the store details and corrects their own contact details. */

import { useState, type FormEvent } from 'react';
import { BunningsLayout, useAo } from '@/components/bunnings/BunningsLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api';
import { bunningsApi } from '@/lib/bunningsApi';

function StoreDetails() {
  const { data, reload } = useAo();
  const s = data.store;
  const [name, setName] = useState(s.activities_officer_name ?? '');
  const [email, setEmail] = useState(s.activities_officer_email ?? '');
  const [phone, setPhone] = useState(s.activities_officer_phone ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    setFieldErrors({});
    try {
      await bunningsApi.updateStore({ activities_officer_name: name.trim(), activities_officer_email: email.trim(), activities_officer_phone: phone.trim() || null });
      setMessage('Saved — thank you. Vision Velocity has been told about the change.');
      await reload();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        if (err.details && typeof err.details === 'object') setFieldErrors(err.details as Record<string, string>);
      } else setError('Could not save — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="mb-6">My details</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your contact details</CardTitle>
          </CardHeader>
          <form onSubmit={save} className="space-y-4" data-form="Activities Officer details">
            <Input id="ao-name" label="Your name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.activities_officer_name} required />
            <Input
              id="ao-email"
              type="email"
              label="Your work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.activities_officer_email}
              helperText="Sign-in links are sent to this address."
              required
            />
            <Input id="ao-phone" type="tel" label="Your phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldErrors.activities_officer_phone} />
            {message && (
              <p role="status" className="text-sm text-green-700">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={saving}>
              Save my details
            </Button>
          </form>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Store</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-charcoal/70">Store</dt>
              <dd>Bunnings {s.location}</dd>
            </div>
            <div>
              <dt className="text-charcoal/70">Address</dt>
              <dd>{[s.store_address, s.suburb, s.state, s.postcode].filter(Boolean).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt className="text-charcoal/70">Store phone</dt>
              <dd>{s.store_phone || '—'}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-charcoal/70">Store details wrong? Use Contact us at the top and we will correct them.</p>
        </Card>
      </div>
    </>
  );
}

export default function BunningsStorePage() {
  return (
    <BunningsLayout>
      <StoreDetails />
    </BunningsLayout>
  );
}
