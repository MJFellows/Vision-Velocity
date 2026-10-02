'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { OpeningHoursTable } from '@/components/OpeningHoursTable';
import type { AuState, OpeningHours } from '@/lib/types';
import { BunningsStoreForm, type BunningsStoreFormValues } from '@/components/forms/BunningsStoreForm';
import { SamePostcodePanel, type PanelSection } from '@/components/SamePostcodePanel';
import { getBunningsStore, getBunningsSamePostcode, updateBunningsStore, generateBunningsAoMagicLink, type NearbyRadiusKm } from '@/lib/adminApi';

interface StoreWithCharities {
  id: string;
  location: string;
  store_address: string | null;
  store_phone: string | null;
  store_manager_name: string | null;
  store_manager_email: string | null;
  store_manager_phone: string | null;
  activities_officer_name: string | null;
  activities_officer_email: string | null;
  activities_officer_phone: string | null;
  discovered_by: 'rita' | 'natalie' | null;
  interaction_notes: string | null;
  bunnings_store_id: string | null;
  suburb: string | null;
  state: AuState | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  store_email: string | null;
  store_fax: string | null;
  map_url: string | null;
  services: string[];
  opening_hours: OpeningHours | null;
  opening_hours_raw: string | null;
  source: 'manual' | 'import';
  charities: { charity_id: string; charity_name: string }[];
}

export default function BunningsStoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<StoreWithCharities | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isLoggingNote, setIsLoggingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [panelKind, setPanelKind] = useState<'suppliers' | 'charities' | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelPostcode, setPanelPostcode] = useState<string | null>(null);
  const [panelRadius, setPanelRadius] = useState<NearbyRadiusKm>(0);
  const [panelOrigin, setPanelOrigin] = useState<boolean | null>(null);
  const [panelSections, setPanelSections] = useState<PanelSection[]>([]);
  const [magicLink, setMagicLink] = useState<{ magicLinkUrl: string; activitiesOfficerEmail: string; expiresAt: string; emailed?: boolean; emailError?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getBunningsStore(id);
      setStore(data);
    } catch {
      setError('Could not load this store.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEditSubmit = async (values: BunningsStoreFormValues) => {
    await updateBunningsStore(id, {
      location: values.location,
      store_address: values.store_address || null,
      store_phone: values.store_phone || null,
      store_manager_name: values.store_manager_name || null,
      store_manager_email: values.store_manager_email || null,
      store_manager_phone: values.store_manager_phone || null,
      activities_officer_name: values.activities_officer_name || null,
      activities_officer_email: values.activities_officer_email || null,
      activities_officer_phone: values.activities_officer_phone || null,
      discovered_by: values.discovered_by || null,
    });
    setIsEditing(false);
    await load();
  };

  const openSamePostcode = async (kind: 'suppliers' | 'charities', radius: NearbyRadiusKm = 0) => {
    setPanelKind(kind);
    setPanelRadius(radius);
    setPanelLoading(true);
    setPanelError(null);
    const distanceText = (km: number | null | undefined) => (km != null ? ` · ${km} km` : '');
    try {
      if (kind === 'suppliers') {
        const res = await getBunningsSamePostcode(id, 'suppliers', radius);
        setPanelPostcode(res.postcode);
        setPanelOrigin(res.origin_available);
        setPanelSections([
          {
            title: 'Suppliers',
            emptyText: radius ? 'No supplier stores in this area.' : 'No supplier stores in this postcode.',
            items: res.data.map((s) => ({
              id: s.id,
              href: `/admin/suppliers/${s.id}`,
              primary: s.store_name,
              secondary: `${[s.address, s.suburb, s.state, s.postcode].filter(Boolean).join(', ')}${distanceText(s.distance_km)}`,
              badge: s.supplier_chain,
            })),
          },
        ]);
      } else {
        const res = await getBunningsSamePostcode(id, 'charities', radius);
        setPanelPostcode(res.postcode);
        setPanelOrigin(res.origin_available);
        setPanelSections([
          {
            title: 'Charities',
            emptyText: radius ? 'No charities in this area.' : 'No charities in this postcode.',
            items: res.data.map((c) => ({
              id: c.id,
              href: `/admin/charities/${c.id}`,
              primary: c.name,
              secondary: `${[c.location, c.postcode, c.contact_name].filter(Boolean).join(' · ')}${distanceText(c.distance_km)}`,
              badge: c.subscription_status,
            })),
          },
        ]);
      }
    } catch {
      setPanelError('Could not load records for this postcode — try again.');
    } finally {
      setPanelLoading(false);
    }
  };

  const handleGenerateMagicLink = async (send: boolean) => {
    setIsGeneratingLink(true);
    setError(null);
    try {
      const { data } = await generateBunningsAoMagicLink(id, send);
      setMagicLink(data);
    } catch {
      setError('Could not create a sign-in link — check the store has an Activities Officer email.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleLogNote = async () => {
    if (!newNote.trim() || !store) return;
    setIsLoggingNote(true);
    try {
      const stamped = `[${new Date().toLocaleDateString('en-AU')}] ${newNote.trim()}`;
      const combined = store.interaction_notes ? `${store.interaction_notes}\n${stamped}` : stamped;
      await updateBunningsStore(id, { interaction_notes: combined });
      setNewNote('');
      await load();
    } catch {
      setError('Could not save the note — try again.');
    } finally {
      setIsLoggingNote(false);
    }
  };

  if (error && !store) {
    return (
      <AdminLayout>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/admin/bunnings" className="mt-4 inline-block text-sm text-accent underline">
          &larr; Back to Bunnings stores
        </Link>
      </AdminLayout>
    );
  }

  if (!store) {
    return (
      <AdminLayout>
        <p className="text-sm text-charcoal/70">Loading…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link href="/admin/bunnings" className="mb-4 inline-block text-sm text-accent underline">
        &larr; Back to Bunnings stores
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <h1>{store.location}</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => openSamePostcode('suppliers')}>
            Suppliers in same postcode
          </Button>
          <Button variant="outline" onClick={() => openSamePostcode('charities')}>
            Charities in same postcode
          </Button>
          <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </div>

      {panelKind && (
        <SamePostcodePanel
          title={panelKind === 'suppliers' ? 'Suppliers in same postcode' : 'Charities in same postcode'}
          postcode={panelPostcode}
          sections={panelSections}
          isLoading={panelLoading}
          error={panelError}
          noPostcodeMessage="This store has no postcode recorded, so nothing can be matched."
          radiusKm={panelRadius}
          onRadiusChange={(r) => openSamePostcode(panelKind, r)}
          originAvailable={panelOrigin}
          onClose={() => setPanelKind(null)}
        />
      )}

      {isEditing ? (
        <Card className="mb-6 max-w-lg">
          <CardHeader>
            <CardTitle>Edit store</CardTitle>
          </CardHeader>
          <BunningsStoreForm defaultValues={store} onSubmit={handleEditSubmit} submitLabel="Save changes" />
        </Card>
      ) : (
        <Card className="mb-6 max-w-lg">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-charcoal/70">Address</dt>
              <dd className="text-right">{store.store_address || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/70">Store phone</dt>
              <dd>{store.store_phone || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/70">Activities Officer</dt>
              <dd>{store.activities_officer_name || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/70">AO email</dt>
              <dd>{store.activities_officer_email || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/70">AO phone</dt>
              <dd>{store.activities_officer_phone || '—'}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card className="mb-6 max-w-lg">
        <CardHeader>
          <CardTitle>Store directory details</CardTitle>
        </CardHeader>
        <dl className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Bunnings store ID</dt>
            <dd>{store.bunnings_store_id || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Suburb, state, postcode</dt>
            <dd className="text-right">{[store.suburb, store.state, store.postcode].filter(Boolean).join(' ') || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Store email</dt>
            <dd>{store.store_email ? <a className="text-navy underline" href={`mailto:${store.store_email}`}>{store.store_email}</a> : '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Fax</dt>
            <dd>{store.store_fax || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Store map</dt>
            <dd>{store.map_url ? <a className="text-navy underline" href={store.map_url} target="_blank" rel="noopener noreferrer">Open store map</a> : '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Coordinates</dt>
            <dd>
              {store.latitude != null && store.longitude != null ? (
                <a className="text-navy underline" href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`} target="_blank" rel="noopener noreferrer">
                  {store.latitude}, {store.longitude}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Record source</dt>
            <dd>{store.source === 'import' ? 'National directory import' : 'Entered by the team'}</dd>
          </div>
        </dl>
        <h4 className="mb-2 text-sm font-semibold text-charcoal">Opening hours</h4>
        <div className="mb-4">
          <OpeningHoursTable hours={store.opening_hours} raw={store.opening_hours_raw} />
        </div>
        <h4 className="mb-2 text-sm font-semibold text-charcoal">Services</h4>
        {store.services.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {store.services.map((s) => (
              <Badge key={s}>{s.replace(/-/g, ' ')}</Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-charcoal/70">No services recorded.</p>
        )}
      </Card>

      {store.charities.length > 0 && (
        <Card className="mb-6 max-w-lg">
          <CardHeader>
            <CardTitle>Charities using this store</CardTitle>
          </CardHeader>
          <ul className="space-y-1 text-sm">
            {store.charities.map((c) => (
              <li key={c.charity_id}>
                <Link href={`/admin/charities/${c.charity_id}`} className="text-accent hover:underline">
                  {c.charity_name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mb-6 max-w-lg">
        <CardHeader>
          <CardTitle>Activities Officer access</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-charcoal/70">
          The store&apos;s Activities Officer can see the events at this store (no prices), print run sheets and update their own contact details.
          They sign in with a link that works once and lasts 7 days, and can ask for a new one themselves at /bunnings/activities-officer/sign-in.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleGenerateMagicLink(true)} isLoading={isGeneratingLink} disabled={!store.activities_officer_email}>
            Email sign-in link
          </Button>
          <Button variant="outline" onClick={() => handleGenerateMagicLink(false)} disabled={isGeneratingLink || !store.activities_officer_email}>
            Show link to copy
          </Button>
        </div>
        {!store.activities_officer_email && <p className="mt-2 text-xs text-charcoal/70">Add the Activities Officer&apos;s email above first.</p>}
        {magicLink && (
          <div className="mt-4 rounded-card bg-grey/50 p-3 text-sm">
            {magicLink.emailed && <p className="mb-1 text-green-700">Emailed to {magicLink.activitiesOfficerEmail}.</p>}
            {magicLink.emailError && <p className="mb-1 text-red-600">The email could not be sent: {magicLink.emailError}</p>}
            {!magicLink.emailed && (
              <>
                <p className="mb-1 text-charcoal/70">
                  Link for {magicLink.activitiesOfficerEmail} — works once, expires {new Date(magicLink.expiresAt).toLocaleDateString('en-AU')}:
                </p>
                <p className="break-all font-mono text-xs text-navy">{magicLink.magicLinkUrl}</p>
              </>
            )}
          </div>
        )}
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Interaction notes</CardTitle>
        </CardHeader>
        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <Input placeholder="Log a call, visit or follow-up…" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          </div>
          <Button onClick={handleLogNote} isLoading={isLoggingNote} disabled={!newNote.trim()}>
            Log
          </Button>
        </div>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <pre className="whitespace-pre-wrap rounded-card bg-grey/50 p-3 text-sm text-charcoal/80">
          {store.interaction_notes || 'No notes logged yet.'}
        </pre>
      </Card>
    </AdminLayout>
  );
}
