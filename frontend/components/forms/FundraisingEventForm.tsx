'use client';

/**
 * Create / edit form for an event record (date, Bunnings store, charity, status, notes).
 * Not to be confused with EventForm.tsx, which creates an *order*. Suppliers are linked
 * to an event afterwards, on the event's detail page.
 */

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormWrapper } from './FormWrapper';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { listBunningsStores, listCharities } from '@/lib/adminApi';
import type { BunningsStore, Charity, EventStatus, FundraisingEvent } from '@/lib/types';

export const EVENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const fundraisingEventSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  bunnings_store_id: z.string().uuid('Choose a Bunnings store'),
  charity_id: z.string().uuid('Choose a charity'),
  status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']),
  notes: z.string().max(5000).optional(),
});

export type FundraisingEventFormValues = z.infer<typeof fundraisingEventSchema>;

function toFormValues(event?: Partial<FundraisingEvent>): FundraisingEventFormValues {
  return {
    event_date: event?.event_date ?? '',
    bunnings_store_id: event?.bunnings_store_id ?? '',
    charity_id: event?.charity_id ?? '',
    status: (event?.status ?? 'planned') as EventStatus,
    notes: event?.notes ?? '',
  };
}

/** A text filter above a select, so a list of hundreds (Bunnings stores) stays usable. */
function FilterableSelect({
  label,
  name,
  error,
  allOptions,
  selectedValue,
  placeholder,
}: {
  label: string;
  name: 'bunnings_store_id' | 'charity_id';
  error?: string;
  allOptions: SelectOption[];
  selectedValue: string;
  placeholder: string;
}) {
  const { register } = useFormContext<FundraisingEventFormValues>();
  const [filter, setFilter] = useState('');

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((o) => o.value === selectedValue || o.label.toLowerCase().includes(q));
  }, [allOptions, filter, selectedValue]);

  return (
    <div className="space-y-1">
      <Input
        label={`${label} — type to narrow the list`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Name, suburb or postcode"
        aria-label={`Filter ${label}`}
        name={`${name}-filter`}
      />
      <Select aria-label={label} error={error} placeholder={placeholder} options={options} defaultValue="" {...register(name)} />
    </div>
  );
}

function EventFields({ storeOptions, charityOptions, selectedStore, selectedCharity, loadError }: {
  storeOptions: SelectOption[];
  charityOptions: SelectOption[];
  selectedStore: string;
  selectedCharity: string;
  loadError: string | null;
}) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<FundraisingEventFormValues>();
  const store = watch('bunnings_store_id') || selectedStore;
  const charity = watch('charity_id') || selectedCharity;

  return (
    <div className="space-y-4">
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      <Input label="Event date" type="date" error={errors.event_date?.message} {...register('event_date')} />
      <FilterableSelect
        label="Bunnings store"
        name="bunnings_store_id"
        error={errors.bunnings_store_id?.message}
        allOptions={storeOptions}
        selectedValue={store}
        placeholder="Choose a Bunnings store"
      />
      <FilterableSelect
        label="Charity"
        name="charity_id"
        error={errors.charity_id?.message}
        allOptions={charityOptions}
        selectedValue={charity}
        placeholder="Choose a charity"
      />
      <Select label="Status" options={EVENT_STATUS_OPTIONS} error={errors.status?.message} {...register('status')} />
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-charcoal">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          className="w-full rounded-card border border-grey px-3 py-2 text-sm text-charcoal focus-ring"
          {...register('notes')}
        />
        {errors.notes?.message && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
      </div>
    </div>
  );
}

export function FundraisingEventForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: {
  defaultValues?: Partial<FundraisingEvent>;
  onSubmit: (values: FundraisingEventFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  const [stores, setStores] = useState<BunningsStore[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listBunningsStores(true), listCharities({ pageSize: 100 })])
      .then(([s, c]) => {
        if (cancelled) return;
        setStores(s.data);
        setCharities(c.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the Bunnings store and charity lists — refresh and try again.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const storeOptions = useMemo(
    () =>
      stores
        .map((s) => ({ value: s.id, label: [s.location, s.suburb, s.postcode].filter(Boolean).join(' · ') }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [stores]
  );
  const charityOptions = useMemo(
    () => charities.map((c) => ({ value: c.id, label: c.postcode ? `${c.name} · ${c.postcode}` : c.name })),
    [charities]
  );

  // Key on list sizes so react-hook-form re-applies the stored ids once the options exist.
  const formKey = `${storeOptions.length}-${charityOptions.length}`;

  return (
    <FormWrapper key={formKey} schema={fundraisingEventSchema} defaultValues={toFormValues(defaultValues)} onSubmit={onSubmit}>
      <EventFields
        storeOptions={storeOptions}
        charityOptions={charityOptions}
        selectedStore={defaultValues?.bunnings_store_id ?? ''}
        selectedCharity={defaultValues?.charity_id ?? ''}
        loadError={loadError}
      />
      <Button type="submit" className="mt-6 w-full">
        {submitLabel}
      </Button>
    </FormWrapper>
  );
}
