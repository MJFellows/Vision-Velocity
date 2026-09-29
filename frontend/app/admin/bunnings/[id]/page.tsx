'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BunningsStoreForm, type BunningsStoreFormValues } from '@/components/forms/BunningsStoreForm';
import { getBunningsStore, updateBunningsStore, generateBunningsAoMagicLink } from '@/lib/adminApi';

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
  const [magicLink, setMagicLink] = useState<{ magicLinkUrl: string; activitiesOfficerEmail: string; expiresAt: string } | null>(null);

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

  const handleGenerateMagicLink = async () => {
    setIsGeneratingLink(true);
    setError(null);
    try {
      const { data } = await generateBunningsAoMagicLink(id);
      setMagicLink(data);
    } catch {
      setError('Could not generate a magic link — check the store has an AO email set.');
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
        <p className="text-sm text-charcoal/60">Loading…</p>
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
        <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

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
              <dt className="text-charcoal/60">Address</dt>
              <dd className="text-right">{store.store_address || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">Store phone</dt>
              <dd>{store.store_phone || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">Activities Officer</dt>
              <dd>{store.activities_officer_name || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">AO email</dt>
              <dd>{store.activities_officer_email || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">AO phone</dt>
              <dd>{store.activities_officer_phone || '—'}</dd>
            </div>
          </dl>
        </Card>
      )}

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
          <CardTitle>Activities Officer portal</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-charcoal/60">
          Generate a one-time link so this store's Activities Officer can view upcoming events (read-only). Sending it by email is manual for now — Task 3.3 will automate that.
        </p>
        <Button
          variant="outline"
          onClick={handleGenerateMagicLink}
          isLoading={isGeneratingLink}
          disabled={!store.activities_officer_email}
        >
          Generate magic link
        </Button>
        {!store.activities_officer_email && (
          <p className="mt-2 text-xs text-charcoal/50">Add an AO email above first.</p>
        )}
        {magicLink && (
          <div className="mt-4 rounded-card bg-grey/50 p-3 text-sm">
            <p className="mb-1 text-charcoal/70">For {magicLink.activitiesOfficerEmail} — expires {new Date(magicLink.expiresAt).toLocaleDateString('en-AU')}:</p>
            <p className="break-all font-mono text-xs text-navy">{magicLink.magicLinkUrl}</p>
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
