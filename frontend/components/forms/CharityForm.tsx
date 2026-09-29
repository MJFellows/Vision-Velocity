'use client';

import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormWrapper } from './FormWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Charity } from '@/lib/types';

export const charityFormSchema = z.object({
  name: z.string().min(2, 'Enter at least 2 characters').max(100),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  contact_name: z.string().optional(),
  tax_id: z.string().optional(),
});

export type CharityFormValues = z.infer<typeof charityFormSchema>;

function charityToFormValues(charity?: Partial<Charity>): CharityFormValues {
  return {
    name: charity?.name ?? '',
    email: charity?.email ?? '',
    phone: charity?.phone ?? '',
    location: charity?.location ?? '',
    contact_name: charity?.contact_name ?? '',
    tax_id: charity?.tax_id ?? '',
  };
}

function CharityFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CharityFormValues>();

  return (
    <div className="space-y-4">
      <Input label="Charity name" error={errors.name?.message} {...register('name')} />
      <Input label="Contact name" error={errors.contact_name?.message} {...register('contact_name')} />
      <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
      <Input label="Location" error={errors.location?.message} {...register('location')} />
      <Input label="ABN / tax ID" error={errors.tax_id?.message} {...register('tax_id')} />
    </div>
  );
}

export function CharityForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: {
  defaultValues?: Partial<Charity>;
  onSubmit: (values: CharityFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  return (
    <FormWrapper schema={charityFormSchema} defaultValues={charityToFormValues(defaultValues)} onSubmit={onSubmit}>
      <CharityFields />
      <Button type="submit" className="mt-6 w-full">
        {submitLabel}
      </Button>
    </FormWrapper>
  );
}
