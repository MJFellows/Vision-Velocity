'use client';

/**
 * Packages admin: list, add and edit fundraising packages (name, description,
 * base price, active) and their contents (components with quantities). Active
 * packages appear in the "Packages used" section of the event form and on the
 * public landing page.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ApiRequestError } from '@/lib/api';
import { createPackage, listAdminPackages, listComponents, updatePackage } from '@/lib/adminApi';
import type { Component, Package } from '@/lib/types';

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

const money = (n: number) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });

/** Target cost and sell value of a package from its components (components without a price are skipped). */
function rollUp(p: Package) {
  let cost = 0;
  let sell = 0;
  let missing = 0;
  for (const link of p.package_components ?? []) {
    const c = link.components;
    if (c?.target_buy_cost_aud == null || c.target_sell_price_aud == null) missing += 1;
    cost += Number(c?.target_buy_cost_aud ?? 0) * Number(link.quantity);
    sell += Number(c?.target_sell_price_aud ?? 0) * Number(link.quantity);
  }
  return { cost, sell, missing };
}

interface ContentRow {
  component_id: string;
  quantity: string;
}

function ContentsEditor({
  pkg,
  components,
  onSave,
  onCancel,
}: {
  pkg: Package;
  components: Component[];
  onSave: (rows: { component_id: string; quantity: number }[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<ContentRow[]>(
    (pkg.package_components ?? []).map((l) => ({ component_id: l.component_id, quantity: String(l.quantity) }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const used = new Set(rows.map((r) => r.component_id));
  const available = components.filter((c) => c.is_active || used.has(c.id));

  const save = async () => {
    setError(null);
    const filled = rows.filter((r) => r.component_id);
    if (filled.some((r) => !/^\d{1,5}(\.\d{1,2})?$/.test(r.quantity.trim()) || Number(r.quantity) <= 0)) {
      return setError('Each quantity must be a number above 0.');
    }
    if (new Set(filled.map((r) => r.component_id)).size !== filled.length) return setError('Each component can be listed once.');
    setSaving(true);
    try {
      await onSave(filled.map((r) => ({ component_id: r.component_id, quantity: Number(r.quantity) })));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-card border border-grey p-3">
      <p className="text-sm font-semibold text-navy">Contents of {pkg.name}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {available.length === 0 && (
        <p className="text-sm text-charcoal/70">
          No components yet.{' '}
          <a className="text-accent underline" href="/admin/components">
            Add components
          </a>{' '}
          first.
        </p>
      )}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            aria-label="Component"
            className="min-w-0 flex-1 rounded-card border border-grey bg-white px-2 py-1 text-sm focus-ring"
            value={r.component_id}
            onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, component_id: e.target.value } : x)))}
          >
            <option value="">Choose a component</option>
            {available.map((c) => (
              <option key={c.id} value={c.id} disabled={used.has(c.id) && c.id !== r.component_id}>
                {c.name}
                {c.quantity != null && c.unit ? ` (${c.quantity} ${c.unit})` : ''}
              </option>
            ))}
          </select>
          <input
            aria-label="Quantity"
            inputMode="decimal"
            className="w-20 rounded-card border border-grey px-2 py-1 text-right text-sm focus-ring"
            value={r.quantity}
            onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
          />
          <button
            type="button"
            className="text-sm text-charcoal/70 underline"
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-accent underline"
        onClick={() => setRows([...rows, { component_id: '', quantity: '1' }])}
      >
        + Add component
      </button>
      <div className="flex gap-3 pt-2">
        <Button type="button" onClick={save} isLoading={saving}>
          Save contents
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
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
  const [contentsId, setContentsId] = useState<string | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [addKey, setAddKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [res, comps] = await Promise.all([listAdminPackages(true), listComponents(true)]);
      setPackages(res.data);
      setComponents(comps.data);
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
          {!packages && !loadError && <p className="text-sm text-charcoal/70">Loading…</p>}
          {packages && packages.length === 0 && <p className="text-sm text-charcoal/70">No packages yet — add the first one.</p>}
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
                  <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-navy">
                        {p.name} {!p.is_active && <Badge>Inactive</Badge>}
                      </p>
                      {p.description && <p className="text-sm text-charcoal/70">{p.description}</p>}
                      <p className="text-sm text-charcoal/70">
                        {Number(p.base_price_aud).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                      </p>
                      {(p.package_components ?? []).length > 0 ? (
                        <>
                          <ul className="mt-1 text-xs text-charcoal/70">
                            {p.package_components!.map((l) => (
                              <li key={l.id}>
                                {l.quantity} × {l.components?.name ?? 'Component'}
                              </li>
                            ))}
                          </ul>
                          {(() => {
                            const r = rollUp(p);
                            return (
                              <p className="mt-1 text-xs text-charcoal/70">
                                Target cost {money(r.cost)} · target sell value {money(r.sell)}
                                {r.missing > 0 && ` (${r.missing} component${r.missing === 1 ? '' : 's'} without prices)`}
                              </p>
                            );
                          })()}
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-charcoal/70">No contents recorded.</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMessage(null);
                          setContentsId(null);
                          setEditingId(p.id);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMessage(null);
                          setEditingId(null);
                          setContentsId(p.id);
                        }}
                      >
                        Contents
                      </Button>
                    </div>
                  </div>
                  {contentsId === p.id && (
                    <ContentsEditor
                      pkg={p}
                      components={components}
                      onCancel={() => setContentsId(null)}
                      onSave={async (rows) => {
                        await updatePackage(p.id, { components: rows });
                        setContentsId(null);
                        setMessage(`Saved contents of ${p.name}.`);
                        await load();
                      }}
                    />
                  )}
                  </>
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
