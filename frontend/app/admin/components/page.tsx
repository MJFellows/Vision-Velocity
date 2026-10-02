'use client';

/**
 * Components admin: the items and ingredients that make up packages. Add, edit,
 * deactivate and attach a photo. Components are added to packages on the
 * Packages page.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ApiRequestError } from '@/lib/api';
import {
  createComponent,
  listComponentUnits,
  listComponents,
  removeComponentImage,
  updateComponent,
  uploadComponentImage,
  type ComponentInput,
} from '@/lib/adminApi';
import { COMPONENT_STORAGE_LABELS, type Component, type ComponentStorage } from '@/lib/types';

interface Draft {
  name: string;
  pack_size: string;
  quantity: string;
  unit: string;
  size_litres: string;
  storage: string;
  packaging_material: string;
  target_buy_cost_aud: string;
  target_sell_price_aud: string;
  comments: string;
  is_active: boolean;
}

const EMPTY: Draft = {
  name: '',
  pack_size: '',
  quantity: '',
  unit: '',
  size_litres: '',
  storage: '',
  packaging_material: '',
  target_buy_cost_aud: '',
  target_sell_price_aud: '',
  comments: '',
  is_active: true,
};

const NUMBER_RE = /^\d{1,7}(\.\d{1,3})?$/;
const MONEY_RE = /^\d{1,7}(\.\d{1,2})?$/;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const fmtMoney = (n: number | null) =>
  n == null ? '—' : Number(n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });

function toDraft(c: Component): Draft {
  const s = (v: number | string | null) => (v == null ? '' : String(v));
  return {
    name: c.name,
    pack_size: s(c.pack_size),
    quantity: s(c.quantity),
    unit: s(c.unit),
    size_litres: s(c.size_litres),
    storage: s(c.storage),
    packaging_material: s(c.packaging_material),
    target_buy_cost_aud: s(c.target_buy_cost_aud),
    target_sell_price_aud: s(c.target_sell_price_aud),
    comments: s(c.comments),
    is_active: c.is_active,
  };
}

/** Validates a draft and converts it to the API shape; returns an error message instead when invalid. */
function toInput(d: Draft): ComponentInput | string {
  if (!d.name.trim()) return 'Name is required.';
  const num = (v: string, re: RegExp, label: string): number | null | string => {
    const t = v.trim();
    if (t === '') return null;
    return re.test(t) ? Number(t) : `${label} must be a number.`;
  };
  const quantity = num(d.quantity, NUMBER_RE, 'Quantity');
  const size = num(d.size_litres, NUMBER_RE, 'Size in litres');
  const buy = num(d.target_buy_cost_aud, MONEY_RE, 'Target buy cost');
  const sell = num(d.target_sell_price_aud, MONEY_RE, 'Target sell price');
  for (const v of [quantity, size, buy, sell]) if (typeof v === 'string') return v;
  if (quantity !== null && quantity === 0) return 'Quantity must be more than 0.';
  if ((quantity === null) !== (d.unit === '')) return 'Enter both a quantity and a unit, or neither.';
  return {
    name: d.name.trim(),
    pack_size: d.pack_size.trim() || null,
    quantity: quantity as number | null,
    unit: d.unit || null,
    size_litres: size as number | null,
    storage: (d.storage || null) as ComponentStorage | null,
    packaging_material: d.packaging_material.trim() || null,
    target_buy_cost_aud: buy as number | null,
    target_sell_price_aud: sell as number | null,
    comments: d.comments.trim() || null,
    is_active: d.is_active,
  };
}

function errorText(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const details =
      err.details && typeof err.details === 'object' ? Object.values(err.details as Record<string, string>).join(' ') : '';
    return details ? `${err.message}: ${details}` : err.message;
  }
  return 'Something went wrong. Please try again.';
}

function ComponentEditor({
  initial,
  units,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: Draft;
  units: string[];
  submitLabel: string;
  onSave: (input: ComponentInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = toInput(d);
    if (typeof input === 'string') return setError(input);
    setSaving(true);
    try {
      await onSave(input);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <p className="rounded-card border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Input label="Name" value={d.name} onChange={set('name')} placeholder="e.g. Beef sausages" />
      <Input label="Pack size" value={d.pack_size} onChange={set('pack_size')} placeholder="e.g. Carton of 60" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Quantity" inputMode="decimal" value={d.quantity} onChange={set('quantity')} placeholder="e.g. 500" />
        <Select
          label="Unit"
          options={[{ value: '', label: '—' }, ...units.map((u) => ({ value: u, label: u }))]}
          value={d.unit}
          onChange={set('unit')}
        />
        <Input label="Size (litres)" inputMode="decimal" value={d.size_litres} onChange={set('size_litres')} />
        <Select
          label="Storage"
          options={[
            { value: '', label: '—' },
            ...(Object.keys(COMPONENT_STORAGE_LABELS) as ComponentStorage[]).map((k) => ({
              value: k,
              label: COMPONENT_STORAGE_LABELS[k],
            })),
          ]}
          value={d.storage}
          onChange={set('storage')}
        />
        <Input label="Target buy cost ($)" inputMode="decimal" value={d.target_buy_cost_aud} onChange={set('target_buy_cost_aud')} />
        <Input label="Target sell price ($)" inputMode="decimal" value={d.target_sell_price_aud} onChange={set('target_sell_price_aud')} />
      </div>
      <Input label="Packaging material" value={d.packaging_material} onChange={set('packaging_material')} placeholder="e.g. Cardboard, plastic film" />
      <div>
        <label className="mb-1 block text-sm font-medium text-charcoal" htmlFor="comp-comments">
          Comments
        </label>
        <textarea
          id="comp-comments"
          rows={3}
          className="w-full rounded-card border border-grey px-3 py-2 text-sm text-charcoal focus-ring"
          value={d.comments}
          onChange={set('comments')}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-charcoal">
        <input type="checkbox" checked={d.is_active} onChange={(e) => setD({ ...d, is_active: e.target.checked })} />
        Active (can be added to packages)
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

function ImageControl({ component, onChanged }: { component: Component; onChanged: (c: Component) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Use a JPEG, PNG or WebP image.');
    if (file.size > MAX_IMAGE_BYTES) return setError('Image must be 4 MB or smaller.');
    setBusy(true);
    try {
      onChanged((await uploadComponentImage(component.id, file)).data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      onChanged((await removeComponentImage(component.id)).data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {component.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={component.image_url} alt={component.name} className="h-32 w-32 rounded-card border border-grey object-cover" />
      ) : (
        <div className="flex h-32 w-32 items-center justify-center rounded-card border border-dashed border-grey text-xs text-charcoal/70">
          No image
        </div>
      )}
      <label className="block text-sm">
        <span className="text-accent underline">{busy ? 'Working…' : component.image_url ? 'Replace image' : 'Upload image'}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {component.image_url && !busy && (
        <button type="button" className="text-sm text-charcoal/70 underline" onClick={remove}>
          Remove image
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function ComponentsPage() {
  const [components, setComponents] = useState<Component[] | null>(null);
  const [units, setUnits] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, u] = await Promise.all([listComponents(true), listComponentUnits()]);
      setComponents(c.data);
      setUnits(u.data.map((x) => x.name));
    } catch {
      setLoadError('Could not load components — refresh and try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (c: Component) => setComponents((list) => list?.map((x) => (x.id === c.id ? c : x)) ?? null);

  return (
    <AdminLayout>
      <h1 className="mb-1">Components</h1>
      <p className="mb-6 text-sm text-charcoal/70">Items and ingredients that make up packages. Add them to a package on the Packages page.</p>
      {message && <p className="mb-4 text-sm text-green-700">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All components</CardTitle>
          </CardHeader>
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}
          {!components && !loadError && <p className="text-sm text-charcoal/70">Loading…</p>}
          {components && components.length === 0 && <p className="text-sm text-charcoal/70">No components yet — add the first one.</p>}
          <ul className="divide-y divide-grey">
            {components?.map((c) => (
              <li key={c.id} className="py-4">
                {editingId === c.id ? (
                  <div className="grid gap-4 sm:grid-cols-[8.5rem_1fr]">
                    <ImageControl component={c} onChanged={replace} />
                    <ComponentEditor
                      initial={toDraft(c)}
                      units={units}
                      submitLabel="Save"
                      onCancel={() => setEditingId(null)}
                      onSave={async (input) => {
                        replace((await updateComponent(c.id, input)).data);
                        setEditingId(null);
                        setMessage(`Saved ${input.name}.`);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    {c.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image_url} alt="" className="h-16 w-16 flex-none rounded-card border border-grey object-cover" />
                    ) : (
                      <div className="h-16 w-16 flex-none rounded-card border border-dashed border-grey" />
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium text-navy">
                        {c.name} {!c.is_active && <Badge>Inactive</Badge>}
                      </p>
                      <p className="text-charcoal/70">
                        {[
                          c.pack_size,
                          c.quantity != null && c.unit ? `${c.quantity} ${c.unit}` : null,
                          c.size_litres != null ? `${c.size_litres} L` : null,
                          c.storage ? COMPONENT_STORAGE_LABELS[c.storage] : null,
                          c.packaging_material,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                      <p className="text-charcoal/70">
                        Buy {fmtMoney(c.target_buy_cost_aud)} · Sell {fmtMoney(c.target_sell_price_aud)}
                      </p>
                      {c.comments && <p className="mt-1 whitespace-pre-wrap text-charcoal/70">{c.comments}</p>}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMessage(null);
                        setEditingId(c.id);
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
            <CardTitle>Add a component</CardTitle>
          </CardHeader>
          <ComponentEditor
            key={addKey}
            initial={EMPTY}
            units={units}
            submitLabel="Add component"
            onSave={async (input) => {
              const { data } = await createComponent(input);
              setAddKey((k) => k + 1);
              setMessage(`Added ${data.name}. Click Edit on it to upload an image.`);
              await load();
            }}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}
