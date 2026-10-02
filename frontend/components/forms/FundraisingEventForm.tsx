'use client';

/**
 * Create / edit form for an event record: date, Bunnings store, charity, status, notes,
 * event details (name, estimates, staffing, shifts, cover, actual sales) and packages used.
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
import { listAdminPackages, listBunningsStores, listCharities, type CreateEventInput } from '@/lib/adminApi';
import { EVENT_COVER_LABELS, type BunningsStore, type Charity, type EventCoverType, type EventStatus, type FundraisingEvent, type Package } from '@/lib/types';

export const EVENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'requested', label: 'Requested by charity' },
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const wholeNumber = z.string().trim().regex(/^\d{0,7}$/, 'Enter a whole number (or leave blank)');

const COVER_OPTIONS: SelectOption[] = (Object.keys(EVENT_COVER_LABELS) as EventCoverType[]).map((k) => ({
  value: k,
  label: EVENT_COVER_LABELS[k],
}));

export const fundraisingEventSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  bunnings_store_id: z.string().uuid('Choose a Bunnings store'),
  charity_id: z.string().uuid('Choose a charity'),
  status: z.enum(['requested', 'planned', 'confirmed', 'completed', 'cancelled']),
  notes: z.string().max(5000).optional(),
  event_name: z.string().trim().max(200),
  estimated_hotdogs: wholeNumber,
  estimated_staff: wholeNumber,
  number_of_shifts: wholeNumber,
  cover_type: z.union([z.literal(''), z.enum(['inside', 'outside_covered', 'outside_uncovered'])]),
  actual_hotdogs_sold: wholeNumber,
  number_of_sales: wholeNumber,
  sales_value_aud: z.string().trim().regex(/^(\d{1,8}(\.\d{1,2})?)?$/, 'Enter dollars and cents, e.g. 1250.50'),
});

export type FundraisingEventFormValues = z.infer<typeof fundraisingEventSchema>;

function toFormValues(event?: Partial<FundraisingEvent>): FundraisingEventFormValues {
  return {
    event_date: event?.event_date ?? '',
    bunnings_store_id: event?.bunnings_store_id ?? '',
    charity_id: event?.charity_id ?? '',
    status: (event?.status ?? 'planned') as EventStatus,
    notes: event?.notes ?? '',
    event_name: event?.event_name ?? '',
    estimated_hotdogs: numToText(event?.estimated_hotdogs),
    estimated_staff: numToText(event?.estimated_staff),
    number_of_shifts: numToText(event?.number_of_shifts),
    cover_type: event?.cover_type ?? '',
    actual_hotdogs_sold: numToText(event?.actual_hotdogs_sold),
    number_of_sales: numToText(event?.number_of_sales),
    sales_value_aud: numToText(event?.sales_value_aud),
  };
}

function numToText(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : String(n);
}

function textToInt(v: string): number | null {
  return v.trim() === '' ? null : Number.parseInt(v, 10);
}

/** Converts form values plus package quantities into the API payload for create/update. */
export function toEventPayload(
  values: FundraisingEventFormValues,
  packageQuantities: Record<string, string>
): CreateEventInput & { packages: { package_id: string; quantity: number }[] } {
  return {
    event_date: values.event_date,
    bunnings_store_id: values.bunnings_store_id,
    charity_id: values.charity_id,
    status: values.status,
    notes: values.notes?.trim() ? values.notes : null,
    event_name: values.event_name.trim() || null,
    estimated_hotdogs: textToInt(values.estimated_hotdogs),
    estimated_staff: textToInt(values.estimated_staff),
    number_of_shifts: textToInt(values.number_of_shifts),
    cover_type: values.cover_type === '' ? null : values.cover_type,
    actual_hotdogs_sold: textToInt(values.actual_hotdogs_sold),
    number_of_sales: textToInt(values.number_of_sales),
    sales_value_aud: values.sales_value_aud.trim() === '' ? null : Math.round(Number(values.sales_value_aud) * 100) / 100,
    packages: Object.entries(packageQuantities)
      .map(([package_id, q]) => ({ package_id, quantity: Number.parseInt(q, 10) }))
      .filter((p) => Number.isInteger(p.quantity) && p.quantity > 0),
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

      <fieldset className="space-y-4 border-t border-grey pt-4">
        <legend className="text-sm font-semibold text-navy">Event details</legend>
        <Input label="Event name" placeholder="e.g. Kids Footy Club Spring Sizzle" error={errors.event_name?.message} {...register('event_name')} />
        <Select label="Location" options={[{ value: '', label: 'Not recorded' }, ...COVER_OPTIONS]} error={errors.cover_type?.message} {...register('cover_type')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Estimated hotdogs" inputMode="numeric" error={errors.estimated_hotdogs?.message} {...register('estimated_hotdogs')} />
          <Input label="Estimated staff" inputMode="numeric" error={errors.estimated_staff?.message} {...register('estimated_staff')} />
          <Input label="Number of shifts" inputMode="numeric" error={errors.number_of_shifts?.message} {...register('number_of_shifts')} />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-grey pt-4">
        <legend className="text-sm font-semibold text-navy">Results (after the event)</legend>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Hotdogs sold" inputMode="numeric" error={errors.actual_hotdogs_sold?.message} {...register('actual_hotdogs_sold')} />
          <Input label="Number of sales" inputMode="numeric" error={errors.number_of_sales?.message} {...register('number_of_sales')} />
          <Input label="Value of sales ($)" inputMode="decimal" placeholder="0.00" error={errors.sales_value_aud?.message} {...register('sales_value_aud')} />
        </div>
      </fieldset>
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

/** Quantity inputs for each package; blank or 0 means the package was not used. */
function PackagesPicker({
  packages,
  quantities,
  onChange,
}: {
  packages: Package[];
  quantities: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <fieldset className="mt-4 space-y-3 border-t border-grey pt-4">
      <legend className="text-sm font-semibold text-navy">Packages used</legend>
      {packages.length === 0 ? (
        <p className="text-sm text-charcoal/60">
          No packages have been set up yet.{' '}
          <a href="/admin/packages" className="text-accent underline">
            Add packages
          </a>{' '}
          and they will appear here.
        </p>
      ) : (
        <>
          <p className="text-xs text-charcoal/60">Enter how many of each package; leave blank if not used.</p>
          {packages.map((p) => {
            const value = quantities[p.id] ?? '';
            const invalid = value !== '' && !/^\d{1,5}$/.test(value);
            return (
              <div key={p.id} className="flex items-center justify-between gap-4">
                <label htmlFor={`pkg-${p.id}`} className="text-sm text-charcoal">
                  {p.name}
                  {!p.is_active && <span className="ml-1 text-xs text-charcoal/50">(inactive)</span>}
                  <span className="block text-xs text-charcoal/50">${Number(p.base_price_aud).toFixed(2)}</span>
                </label>
                <input
                  id={`pkg-${p.id}`}
                  inputMode="numeric"
                  className={`w-20 rounded-card border px-2 py-1 text-right text-sm focus-ring ${invalid ? 'border-red-500' : 'border-grey'}`}
                  value={value}
                  onChange={(e) => onChange(p.id, e.target.value.trim())}
                  aria-label={`Quantity of ${p.name}`}
                  aria-invalid={invalid}
                />
              </div>
            );
          })}
        </>
      )}
    </fieldset>
  );
}

export function FundraisingEventForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: {
  defaultValues?: Partial<FundraisingEvent>;
  onSubmit: (payload: ReturnType<typeof toEventPayload>) => Promise<void>;
  submitLabel?: string;
}) {
  const [stores, setStores] = useState<BunningsStore[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries((defaultValues?.event_packages ?? []).map((p) => [p.package_id, String(p.quantity)]))
  );

  useEffect(() => {
    let cancelled = false;
    listAdminPackages(true)
      .then((res) => {
        if (!cancelled) setAllPackages(res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the packages list — refresh and try again.');
      });
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

  // Show active packages, plus any inactive ones already recorded on this event.
  const visiblePackages = useMemo(
    () => allPackages.filter((p) => p.is_active || quantities[p.id]),
    [allPackages, quantities]
  );

  // Key on list sizes so react-hook-form re-applies the stored ids once the options exist.
  const formKey = `${storeOptions.length}-${charityOptions.length}`;

  const handleSubmit = async (values: FundraisingEventFormValues) => {
    const bad = Object.entries(quantities).find(([, q]) => q !== '' && !/^\d{1,5}$/.test(q));
    if (bad) throw new Error('Package quantities must be whole numbers.');
    await onSubmit(toEventPayload(values, quantities));
  };

  return (
    <FormWrapper key={formKey} schema={fundraisingEventSchema} defaultValues={toFormValues(defaultValues)} onSubmit={handleSubmit}>
      <EventFields
        storeOptions={storeOptions}
        charityOptions={charityOptions}
        selectedStore={defaultValues?.bunnings_store_id ?? ''}
        selectedCharity={defaultValues?.charity_id ?? ''}
        loadError={loadError}
      />
      <PackagesPicker
        packages={visiblePackages}
        quantities={quantities}
        onChange={(pid, value) => setQuantities((prev) => ({ ...prev, [pid]: value }))}
      />
      <Button type="submit" className="mt-6 w-full">
        {submitLabel}
      </Button>
    </FormWrapper>
  );
}
