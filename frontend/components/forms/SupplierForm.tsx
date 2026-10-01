'use client';

/**
 * Edit form for a supplier store: store details plus the store contact
 * (name, email, mobile). Opening hours and facilities come from the store
 * import and are not edited here.
 */

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormWrapper } from './FormWrapper';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { listSupplierChains, type UpdateSupplierInput } from '@/lib/adminApi';
import type { AuState, Supplier } from '@/lib/types';

const STATE_OPTIONS: SelectOption[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map((s) => ({ value: s, label: s }));

const optional = (max: number) => z.string().trim().max(max);

export const supplierFormSchema = z.object({
  supplier_chain: z.string().min(1, 'Choose a supplier chain'),
  store_name: z.string().trim().min(1, 'Store name is required').max(200),
  source_store_id: optional(50),
  address: optional(300),
  suburb: optional(100),
  state: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
  postcode: z.string().regex(/^\d{4}$/, 'Postcode must be 4 digits'),
  phone: optional(30),
  contact_name: optional(200),
  contact_email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address').max(254)]),
  contact_mobile: z.union([z.literal(''), z.string().trim().regex(/^[0-9 +()-]{8,20}$/, 'Enter a valid mobile number')]),
  is_active: z.enum(['true', 'false']),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

const blankToNull = (v: string) => (v.trim() === '' ? null : v.trim());

export function toSupplierPayload(v: SupplierFormValues): UpdateSupplierInput {
  return {
    supplier_chain: v.supplier_chain,
    store_name: v.store_name.trim(),
    source_store_id: blankToNull(v.source_store_id),
    address: blankToNull(v.address),
    suburb: blankToNull(v.suburb),
    state: v.state as AuState,
    postcode: v.postcode,
    phone: blankToNull(v.phone),
    contact_name: blankToNull(v.contact_name),
    contact_email: blankToNull(v.contact_email)?.toLowerCase() ?? null,
    contact_mobile: blankToNull(v.contact_mobile),
    is_active: v.is_active === 'true',
  };
}

function toFormValues(s: Supplier): SupplierFormValues {
  return {
    supplier_chain: s.supplier_chain,
    store_name: s.store_name,
    source_store_id: s.source_store_id ?? '',
    address: s.address ?? '',
    suburb: s.suburb ?? '',
    state: s.state,
    postcode: s.postcode,
    phone: s.phone ?? '',
    contact_name: s.contact_name ?? '',
    contact_email: s.contact_email ?? '',
    contact_mobile: s.contact_mobile ?? '',
    is_active: s.is_active ? 'true' : 'false',
  };
}

function SupplierFields({ chainOptions }: { chainOptions: SelectOption[] }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<SupplierFormValues>();

  return (
    <div className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold text-navy">Store contact</legend>
        <Input label="Contact name" autoComplete="off" error={errors.contact_name?.message} {...register('contact_name')} />
        <Input label="Contact email" type="email" autoComplete="off" error={errors.contact_email?.message} {...register('contact_email')} />
        <Input label="Contact mobile" type="tel" autoComplete="off" placeholder="04xx xxx xxx" error={errors.contact_mobile?.message} {...register('contact_mobile')} />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold text-navy">Store details</legend>
        <Select label="Supplier chain" options={chainOptions} error={errors.supplier_chain?.message} {...register('supplier_chain')} />
        <Input label="Store name" error={errors.store_name?.message} {...register('store_name')} />
        <Input label="Store ID" error={errors.source_store_id?.message} {...register('source_store_id')} />
        <Input label="Address" error={errors.address?.message} {...register('address')} />
        <Input label="Suburb" error={errors.suburb?.message} {...register('suburb')} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="State" options={STATE_OPTIONS} error={errors.state?.message} {...register('state')} />
          <Input label="Postcode" inputMode="numeric" maxLength={4} error={errors.postcode?.message} {...register('postcode')} />
        </div>
        <Input label="Store phone" type="tel" error={errors.phone?.message} {...register('phone')} />
        <Select
          label="Status"
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
          {...register('is_active')}
        />
      </fieldset>
    </div>
  );
}

export function SupplierForm({
  supplier,
  onSubmit,
  onCancel,
}: {
  supplier: Supplier;
  onSubmit: (payload: UpdateSupplierInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [chains, setChains] = useState<string[]>([]);

  useEffect(() => {
    listSupplierChains()
      .then((res) => setChains(res.data.map((c) => c.name)))
      .catch(() => setChains([]));
  }, []);

  // Always include the store's current chain, even if the lookup fails.
  const chainOptions = Array.from(new Set([supplier.supplier_chain, ...chains])).map((c) => ({ value: c, label: c }));

  return (
    <FormWrapper
      key={chainOptions.length}
      schema={supplierFormSchema}
      defaultValues={toFormValues(supplier)}
      onSubmit={(values) => onSubmit(toSupplierPayload(values))}
    >
      <SupplierFields chainOptions={chainOptions} />
      <div className="mt-6 flex gap-3">
        <Button type="submit" className="flex-1">
          Save changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </FormWrapper>
  );
}
