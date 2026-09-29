'use client';

/**
 * "Add Event" form — creates an order. Fields match the deployed `orders`
 * table exactly (charity_id, package_id, event_date, delivery_address,
 * delivery_contact_name, delivery_phone, special_requests, total_price_aud).
 * Note: the original Task 2.2 brief mentions "Bunnings location" and
 * "expected attendees" fields on the event form, but neither exists as a
 * column on `orders` in the deployed schema (see lib/types.ts, generated
 * from the live database) — a charity's Bunnings store is recorded on the
 * charity record itself, not per-order. Built against the real schema
 * rather than the brief's aspirational fields.
 */

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormWrapper } from './FormWrapper';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { listCharities, listActivePackages } from '@/lib/adminApi';
import type { Charity, Package } from '@/lib/types';

export const eventFormSchema = z.object({
  charity_id: z.string().uuid('Choose a charity'),
  package_id: z.string().uuid('Choose a package'),
  event_date: z.string().min(1, 'Choose a date'),
  delivery_address: z.string().min(1, 'Delivery address is required'),
  delivery_contact_name: z.string().optional(),
  delivery_phone: z.string().optional(),
  special_requests: z.string().optional(),
  total_price_aud: z.coerce.number().nonnegative('Must be zero or more'),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

function EventFields() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<EventFormValues>();

  const [charities, setCharities] = useState<Charity[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const packageId = useWatch({ control, name: 'package_id' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCharities({ pageSize: 100 }), listActivePackages()])
      .then(([charitiesRes, packagesRes]) => {
        if (cancelled) return;
        setCharities(charitiesRes.data);
        setPackages(packagesRes.data.packages);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load charities/packages — try refreshing.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Default the price to the chosen package's base price — still editable,
  // since the final price can vary (discounts, add-ons) from the base rate.
  useEffect(() => {
    const selected = packages.find((p) => p.id === packageId);
    if (selected) setValue('total_price_aud', selected.base_price_aud, { shouldValidate: true });
  }, [packageId, packages, setValue]);

  const charityOptions: SelectOption[] = charities.map((c) => ({ value: c.id, label: c.name }));
  const packageOptions: SelectOption[] = packages.map((p) => ({
    value: p.id,
    label: `${p.name} — $${p.base_price_aud}`,
  }));

  return (
    <div className="space-y-4">
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      <Select
        label="Charity"
        placeholder="Choose a charity"
        options={charityOptions}
        error={errors.charity_id?.message}
        {...register('charity_id')}
      />
      <Select
        label="Package"
        placeholder="Choose a package"
        options={packageOptions}
        error={errors.package_id?.message}
        {...register('package_id')}
      />
      <Input label="Event date" type="date" error={errors.event_date?.message} {...register('event_date')} />
      <Input label="Delivery address" error={errors.delivery_address?.message} {...register('delivery_address')} />
      <Input label="Delivery contact name" error={errors.delivery_contact_name?.message} {...register('delivery_contact_name')} />
      <Input label="Delivery phone" error={errors.delivery_phone?.message} {...register('delivery_phone')} />
      <Input label="Special requests" error={errors.special_requests?.message} {...register('special_requests')} />
      <Input
        label="Total price (AUD)"
        type="number"
        step="0.01"
        error={errors.total_price_aud?.message}
        {...register('total_price_aud')}
      />
    </div>
  );
}

export function EventForm({ onSubmit, submitLabel = 'Create event' }: { onSubmit: (values: EventFormValues) => Promise<void>; submitLabel?: string }) {
  return (
    <FormWrapper
      schema={eventFormSchema}
      defaultValues={{
        charity_id: '',
        package_id: '',
        event_date: '',
        delivery_address: '',
        delivery_contact_name: '',
        delivery_phone: '',
        special_requests: '',
        total_price_aud: 0,
      }}
      onSubmit={onSubmit}
    >
      <EventFields />
      <Button type="submit" className="mt-6 w-full">
        {submitLabel}
      </Button>
    </FormWrapper>
  );
}
