'use client';

import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormWrapper } from './FormWrapper';
import {
  RegistrationFields,
  registrationFieldsSchema,
  registrationToFormValues,
  toRegistrationPayload,
  type RegistrationFormValues,
} from './RegistrationFields';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Charity } from '@/lib/types';

// Every field after `name` is optional: nothing new is mandatory yet.
export const charityFormSchema = z.object({
  name: z.string().min(2, 'Enter at least 2 characters').max(100),
  tax_id: z.string().optional(),
  location: z.string().optional(),
  postcode: z.string().regex(/^[0-9]{4}$/, 'Enter a 4-digit postcode').or(z.literal('')).optional(),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  contact_name: z.string().optional(),
  ...registrationFieldsSchema.shape,
});

export type CharityFormValues = z.infer<typeof charityFormSchema>;

/** Converts a form value to the API shape: blank text becomes null, booleans are always sent. */
export function toCharityPayload(v: CharityFormValues) {
  const t = (s?: string) => {
    const trimmed = s?.trim();
    return trimmed ? trimmed : null;
  };
  return {
    name: v.name.trim(),
    email: t(v.email),
    phone: t(v.phone),
    location: t(v.location),
    postcode: t(v.postcode),
    contact_name: t(v.contact_name),
    tax_id: t(v.tax_id),
    ...toRegistrationPayload(v as RegistrationFormValues),
  };
}

function charityToFormValues(charity?: Partial<Charity>): CharityFormValues {
  return {
    name: charity?.name ?? '',
    tax_id: charity?.tax_id ?? '',
    location: charity?.location ?? '',
    postcode: charity?.postcode ?? '',
    email: charity?.email ?? '',
    phone: charity?.phone ?? '',
    contact_name: charity?.contact_name ?? '',
    ...registrationToFormValues(charity),
  };
}

function CharityFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CharityFormValues>();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input label="Charity name" required error={errors.name?.message} {...register('name')} />
        <Input label="Contact name" error={errors.contact_name?.message} {...register('contact_name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
        <Input label="Location" error={errors.location?.message} {...register('location')} />
        <Input
          label="Postcode"
          inputMode="numeric"
          maxLength={4}
          error={errors.postcode?.message}
          helperText="Used to find Bunnings stores and suppliers in the same postcode"
          {...register('postcode')}
        />
        <Input label="ABN (Australian Business Number)" error={errors.tax_id?.message} {...register('tax_id')} />
      </div>
      <RegistrationFields />
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
