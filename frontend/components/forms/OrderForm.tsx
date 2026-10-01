'use client';

/**
 * Create / edit form for an order (replaces the old "Add Event" EventForm,
 * which only created orders). Fields match the `orders` table: charity,
 * package, event date, delivery address, contact, phone, special requests
 * and total price. Choosing a different package fills in its base price;
 * the price can still be changed (discounts, add-ons).
 */

import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormWrapper } from './FormWrapper';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { listAdminPackages, listCharities } from '@/lib/adminApi';
import type { Charity, Order, Package } from '@/lib/types';

export const orderFormSchema = z.object({
  charity_id: z.string().uuid('Choose a charity'),
  package_id: z.string().uuid('Choose a package'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  delivery_address: z.string().trim().min(1, 'Delivery address is required').max(500),
  delivery_contact_name: z.string().max(200).optional(),
  delivery_phone: z.string().max(30).optional(),
  special_requests: z.string().max(5000).optional(),
  total_price_aud: z.coerce.number().nonnegative('Must be zero or more').max(1_000_000),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

/** Converts form values to the API payload (blank optional fields become null). */
export function toOrderPayload(v: OrderFormValues) {
  const blank = (s?: string) => (s && s.trim() ? s.trim() : null);
  return {
    charity_id: v.charity_id,
    package_id: v.package_id,
    event_date: v.event_date,
    delivery_address: v.delivery_address.trim(),
    delivery_contact_name: blank(v.delivery_contact_name),
    delivery_phone: blank(v.delivery_phone),
    special_requests: blank(v.special_requests),
    total_price_aud: Math.round(Number(v.total_price_aud) * 100) / 100,
  };
}

function OrderFields({ charities, packages, loadError }: { charities: Charity[]; packages: Package[]; loadError: string | null }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<OrderFormValues>();

  const packageId = useWatch({ control, name: 'package_id' });
  const lastPackage = useRef<string | undefined>(packageId);

  // Fill in the base price only when the package is changed by the user,
  // so opening an existing order does not overwrite its agreed price.
  useEffect(() => {
    if (packageId === lastPackage.current) return;
    lastPackage.current = packageId;
    const selected = packages.find((p) => p.id === packageId);
    if (selected) setValue('total_price_aud', Number(selected.base_price_aud), { shouldValidate: true });
  }, [packageId, packages, setValue]);

  const charityOptions: SelectOption[] = charities.map((c) => ({ value: c.id, label: c.name }));
  const packageOptions: SelectOption[] = packages.map((p) => ({
    value: p.id,
    label: `${p.name} — $${Number(p.base_price_aud).toFixed(2)}${p.is_active ? '' : ' (inactive)'}`,
  }));

  return (
    <div className="space-y-4">
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {packages.length === 0 && !loadError && (
        <p className="text-sm text-charcoal/60">
          No active packages yet —{' '}
          <a href="/admin/packages" className="text-accent underline">
            add one on the Packages page
          </a>{' '}
          first.
        </p>
      )}
      <Select label="Charity" placeholder="Choose a charity" options={charityOptions} error={errors.charity_id?.message} {...register('charity_id')} />
      <Select label="Package" placeholder="Choose a package" options={packageOptions} error={errors.package_id?.message} {...register('package_id')} />
      <Input label="Event date" type="date" error={errors.event_date?.message} {...register('event_date')} />
      <Input label="Delivery address" error={errors.delivery_address?.message} {...register('delivery_address')} />
      <Input label="Delivery contact name" error={errors.delivery_contact_name?.message} {...register('delivery_contact_name')} />
      <Input label="Delivery phone" type="tel" error={errors.delivery_phone?.message} {...register('delivery_phone')} />
      <div>
        <label htmlFor="special_requests" className="mb-1 block text-sm font-medium text-charcoal">
          Special requests
        </label>
        <textarea
          id="special_requests"
          rows={3}
          className="w-full rounded-card border border-grey px-3 py-2 text-sm text-charcoal focus-ring"
          {...register('special_requests')}
        />
      </div>
      <Input label="Total price (AUD)" type="number" step="0.01" min="0" error={errors.total_price_aud?.message} {...register('total_price_aud')} />
    </div>
  );
}

export function OrderForm({
  order,
  onSubmit,
  onCancel,
  submitLabel = 'Create order',
}: {
  order?: Order;
  onSubmit: (payload: ReturnType<typeof toOrderPayload>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCharities({ pageSize: 100 }), listAdminPackages(true)])
      .then(([c, p]) => {
        if (cancelled) return;
        setCharities(c.data);
        // Active packages, plus the order's current package even if it has since been deactivated.
        setPackages(p.data.filter((pkg) => pkg.is_active || pkg.id === order?.package_id));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load charities and packages — refresh and try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [order?.package_id]);

  const defaults: OrderFormValues = {
    charity_id: order?.charity_id ?? '',
    package_id: order?.package_id ?? '',
    event_date: order?.event_date?.slice(0, 10) ?? '',
    delivery_address: order?.delivery_address ?? '',
    delivery_contact_name: order?.delivery_contact_name ?? '',
    delivery_phone: order?.delivery_phone ?? '',
    special_requests: order?.special_requests ?? '',
    total_price_aud: order ? Number(order.total_price_aud) : 0,
  };

  // Re-mount once the option lists exist so the selects show the stored values.
  return (
    <FormWrapper key={loaded ? 'ready' : 'loading'} schema={orderFormSchema} defaultValues={defaults} onSubmit={(v) => onSubmit(toOrderPayload(v))}>
      <OrderFields charities={charities} packages={packages} loadError={loadError} />
      <div className="mt-6 flex gap-3">
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </FormWrapper>
  );
}
