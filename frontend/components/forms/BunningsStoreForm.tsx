'use client';

import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormWrapper } from './FormWrapper';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { BunningsStore } from '@/lib/types';

export const bunningsStoreFormSchema = z.object({
  location: z.string().min(2, 'Enter at least 2 characters').max(100),
  store_address: z.string().optional(),
  store_phone: z.string().optional(),
  store_manager_name: z.string().optional(),
  store_manager_email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  store_manager_phone: z.string().optional(),
  activities_officer_name: z.string().optional(),
  activities_officer_email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  activities_officer_phone: z.string().optional(),
  discovered_by: z.enum(['rita', 'natalie', '']).optional(),
});

export type BunningsStoreFormValues = z.infer<typeof bunningsStoreFormSchema>;

function storeToFormValues(store?: Partial<BunningsStore>): BunningsStoreFormValues {
  return {
    location: store?.location ?? '',
    store_address: store?.store_address ?? '',
    store_phone: store?.store_phone ?? '',
    store_manager_name: store?.store_manager_name ?? '',
    store_manager_email: store?.store_manager_email ?? '',
    store_manager_phone: store?.store_manager_phone ?? '',
    activities_officer_name: store?.activities_officer_name ?? '',
    activities_officer_email: store?.activities_officer_email ?? '',
    activities_officer_phone: store?.activities_officer_phone ?? '',
    discovered_by: store?.discovered_by ?? '',
  };
}

function StoreFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<BunningsStoreFormValues>();

  return (
    <div className="space-y-4">
      <Input label="Store name / location" error={errors.location?.message} {...register('location')} />
      <Input label="Store address" error={errors.store_address?.message} {...register('store_address')} />
      <Input label="Store phone" type="tel" error={errors.store_phone?.message} {...register('store_phone')} />

      <h4 className="pt-2 font-display text-base font-semibold text-navy">Store manager</h4>
      <Input label="Name" error={errors.store_manager_name?.message} {...register('store_manager_name')} />
      <Input label="Email" type="email" error={errors.store_manager_email?.message} {...register('store_manager_email')} />
      <Input label="Phone" type="tel" error={errors.store_manager_phone?.message} {...register('store_manager_phone')} />

      <h4 className="pt-2 font-display text-base font-semibold text-navy">Activities officer</h4>
      <Input label="Name" error={errors.activities_officer_name?.message} {...register('activities_officer_name')} />
      <Input label="Email" type="email" error={errors.activities_officer_email?.message} {...register('activities_officer_email')} />
      <Input label="Phone" type="tel" error={errors.activities_officer_phone?.message} {...register('activities_officer_phone')} />

      <Select
        label="Discovered by"
        error={errors.discovered_by?.message}
        options={[
          { value: '', label: 'Not recorded' },
          { value: 'rita', label: 'Rita' },
          { value: 'natalie', label: 'Natalie' },
        ]}
        {...register('discovered_by')}
      />
    </div>
  );
}

export function BunningsStoreForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: {
  defaultValues?: Partial<BunningsStore>;
  onSubmit: (values: BunningsStoreFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  return (
    <FormWrapper schema={bunningsStoreFormSchema} defaultValues={storeToFormValues(defaultValues)} onSubmit={onSubmit}>
      <StoreFields />
      <Button type="submit" className="mt-6 w-full">
        {submitLabel}
      </Button>
    </FormWrapper>
  );
}
