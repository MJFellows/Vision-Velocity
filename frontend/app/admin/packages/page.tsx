'use client';

/**
 * Packages admin: list, add and edit fundraising packages (name, description,
 * base price, active). Active packages appear in the "Packages used" section of
 * the event form and on the public landing page.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ApiRequestError } from '@/lib/api';
import { createPackage, listAdminPackages, updatePackage } from '@/lib/adminApi';
import type { Package } from '@/lib/types';

interface Draft {
  name: string;
  description: string;
  price: string;
  isActive: boolean;
}

const EMPTY: Draft = { name: '', description: '', price: '', isActive: true };
const PRICE_RE = /^\d{1,7}(\.\d{1,2})?$/;

function errorText(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const details =
      err.details && typeof err.details === 'object' ? Object.values(err.details as Record<string, string>).join(' ') : '';
    return details ? `${err.message}: ${details}` : err.message;
  }
  return 'Something went wrong. Please try again.';
}

function PackageEditor({
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: Draft;
  submitLabel: string;
  onSave: (d: Draft) => Promise<void>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!draft.name.trim()) return setError('Name is required.');
    if (!PRICE_RE.test(draft.price.trim())) return setError('Enter the price in dollars and cents, e.g. 120 or 120.50.');
    setSaving(true);
    try {
      await onSave(draft);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <p className="rounded-card border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      <Input
        label="Description"
        value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
      />
      <Input
        label="Base price ($)"
        inputMode="decimal"
        value={draft.price}
        onChange={(e) => setDraft({ ...draft, price: e.target.value })}
      />
      <label className="flex items-center gap-2 text-sm text-charcoal">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
        Active (shown on the event form and the public site)
      </label>
      <div className="flex gap-3">
        <Button type="submit" isLoading={saving}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

const toInput = (d: Draft) => ({
  name: d.name.trim(),
  description: d.description.trim() || null,
  base_price_aud: Math.round(Number(d.price) * 100) / 100,
  is_active: d.isActive,
});

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await listAdminPackages(true);
      setPackages(res.data);
    } catch {
      setLoadError('Could not load packages — refresh and try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <h1 className="mb-6">Packages</h1>
      {message && <p className="mb-4 text-sm text-green-700">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>All packages</CardTitle>
          </CardHeader>
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}
          {!packages && !loadError && <p className="text-sm text-charcoal/60">Loading…</p>}
          {packages && packages.length === 0 && <p className="text-sm text-charcoal/60">No packages yet — add the first one.</p>}
          <ul className="divide-y divide-grey">
            {packages?.map((p) => (
              <li key={p.id} className="py-3">
                {editingId === p.id ? (
                  <PackageEditor
                    initial={{
                      name: p.name,
                      description: p.description ?? '',
                      price: Number(p.base_price_aud).toFixed(2),
                      isActive: p.is_active,
                    }}
                    submitLabel="Save"
                    onCancel={() => setEditingId(null)}
                    onSave={async (d) => {
                      await updatePackage(p.id, toInput(d));
                      setEditingId(null);
                      setMessage(`Saved ${d.name.trim()}.`);
                      await load();
                    }}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-navy">
                        {p.name} {!p.is_active && <Badge>Inactive</Badge>}
                      </p>
                      {p.description && <p className="text-sm text-charcoal/70">{p.description}</p>}
                      <p className="text-sm text-charcoal/70">
                        {Number(p.base_price_aud).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMessage(null);
                        setEditingId(p.id);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add a package</CardTitle>
          </CardHeader>
          <PackageEditor
            key={addKey}
            initial={EMPTY}
            submitLabel="Add package"
            onSave={async (d) => {
              await createPackage(toInput(d));
              setAddKey((k) => k + 1);
              setMessage(`Added ${d.name.trim()}.`);
              await load();
            }}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}
