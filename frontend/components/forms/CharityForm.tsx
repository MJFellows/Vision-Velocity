'use client';

import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import type { ReactNode } from 'react';
import { FormWrapper } from './FormWrapper';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Charity } from '@/lib/types';

// Every field after `name` is optional: nothing new is mandatory yet.
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const charityFormSchema = z.object({
  name: z.string().min(2, 'Enter at least 2 characters').max(100),
  trading_name: optionalText(150),
  tax_id: z.string().optional(),
  acnc_registration: optionalText(100),
  organisation_type: z.string().optional(),
  registered_address: optionalText(300),
  location: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().regex(/^[0-9]{4}$/, 'Enter a 4-digit postcode').or(z.literal('')).optional(),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  website: optionalText(300),
  contact_name: z.string().optional(),
  contact_position: optionalText(150),
  contact_phone: optionalText(30),
  contact_email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  confirmed_authorised_contact: z.boolean().optional(),
  confirmed_accurate_information: z.boolean().optional(),
  accepted_terms: z.boolean().optional(),
  acknowledged_privacy_policy: z.boolean().optional(),
  consented_to_contact: z.boolean().optional(),
  acknowledged_fees: z.boolean().optional(),
  fundraising_authority_details: optionalText(1000),
  fundraising_purpose: optionalText(1000),
  short_description: optionalText(300),
  fundraising_approver_name: optionalText(150),
});

export type CharityFormValues = z.infer<typeof charityFormSchema>;

const ORGANISATION_TYPE_OPTIONS = [
  { value: '', label: 'Not recorded' },
  { value: 'charity', label: 'Registered charity' },
  { value: 'not_for_profit', label: 'Not-for-profit' },
  { value: 'community_group', label: 'Community group' },
  { value: 'sporting_club', label: 'Sporting club' },
  { value: 'school', label: 'School' },
  { value: 'other', label: 'Other' },
];

const STATE_OPTIONS = [
  { value: '', label: 'Not recorded' },
  ...['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map((s) => ({ value: s, label: s })),
];

const BOOLEAN_FIELDS = [
  'confirmed_authorised_contact',
  'confirmed_accurate_information',
  'accepted_terms',
  'acknowledged_privacy_policy',
  'consented_to_contact',
  'acknowledged_fees',
] as const;

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
    trading_name: t(v.trading_name),
    acnc_registration: t(v.acnc_registration),
    organisation_type: (v.organisation_type || null) as string | null,
    registered_address: t(v.registered_address),
    state: (v.state || null) as string | null,
    website: t(v.website),
    contact_position: t(v.contact_position),
    contact_phone: t(v.contact_phone),
    contact_email: t(v.contact_email),
    confirmed_authorised_contact: !!v.confirmed_authorised_contact,
    confirmed_accurate_information: !!v.confirmed_accurate_information,
    accepted_terms: !!v.accepted_terms,
    acknowledged_privacy_policy: !!v.acknowledged_privacy_policy,
    consented_to_contact: !!v.consented_to_contact,
    acknowledged_fees: !!v.acknowledged_fees,
    fundraising_authority_details: t(v.fundraising_authority_details),
    fundraising_purpose: t(v.fundraising_purpose),
    short_description: t(v.short_description),
    fundraising_approver_name: t(v.fundraising_approver_name),
  };
}

function charityToFormValues(charity?: Partial<Charity>): CharityFormValues {
  const b = (k: (typeof BOOLEAN_FIELDS)[number]) => Boolean(charity?.[k]);
  return {
    name: charity?.name ?? '',
    trading_name: charity?.trading_name ?? '',
    tax_id: charity?.tax_id ?? '',
    acnc_registration: charity?.acnc_registration ?? '',
    organisation_type: charity?.organisation_type ?? '',
    registered_address: charity?.registered_address ?? '',
    location: charity?.location ?? '',
    state: charity?.state ?? '',
    postcode: charity?.postcode ?? '',
    email: charity?.email ?? '',
    phone: charity?.phone ?? '',
    website: charity?.website ?? '',
    contact_name: charity?.contact_name ?? '',
    contact_position: charity?.contact_position ?? '',
    contact_phone: charity?.contact_phone ?? '',
    contact_email: charity?.contact_email ?? '',
    confirmed_authorised_contact: b('confirmed_authorised_contact'),
    confirmed_accurate_information: b('confirmed_accurate_information'),
    accepted_terms: b('accepted_terms'),
    acknowledged_privacy_policy: b('acknowledged_privacy_policy'),
    consented_to_contact: b('consented_to_contact'),
    acknowledged_fees: b('acknowledged_fees'),
    fundraising_authority_details: charity?.fundraising_authority_details ?? '',
    fundraising_purpose: charity?.fundraising_purpose ?? '',
    short_description: charity?.short_description ?? '',
    fundraising_approver_name: charity?.fundraising_approver_name ?? '',
  };
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-grey pt-5">
      <legend className="text-sm font-semibold text-navy">{title}</legend>
      {hint && <p className="-mt-2 text-xs text-charcoal/70">{hint}</p>}
      {children}
    </fieldset>
  );
}

function Confirmation({ name, label }: { name: (typeof BOOLEAN_FIELDS)[number]; label: string }) {
  const { register } = useFormContext<CharityFormValues>();
  return (
    <label className="flex items-start gap-2 text-sm text-charcoal">
      <input type="checkbox" className="mt-0.5 h-4 w-4" {...register(name)} />
      <span>{label}</span>
    </label>
  );
}

function CharityFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CharityFormValues>();

  return (
    <div className="space-y-6">
      <Section title="Organisation details" hint="Only the charity name is required.">
        <Input label="Charity name" required error={errors.name?.message} {...register('name')} />
        <Input label="Trading name (if different)" error={errors.trading_name?.message} {...register('trading_name')} />
        <Input label="ABN (Australian Business Number)" error={errors.tax_id?.message} {...register('tax_id')} />
        <Input
          label="ACNC charity registration number or status"
          error={errors.acnc_registration?.message}
          {...register('acnc_registration')}
        />
        <Select label="Organisation type" options={ORGANISATION_TYPE_OPTIONS} error={errors.organisation_type?.message} {...register('organisation_type')} />
        <Input label="Registered business address" error={errors.registered_address?.message} {...register('registered_address')} />
        <Input label="Location" error={errors.location?.message} {...register('location')} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="State or territory" options={STATE_OPTIONS} error={errors.state?.message} {...register('state')} />
          <Input label="Postcode" inputMode="numeric" maxLength={4} error={errors.postcode?.message} {...register('postcode')} />
        </div>
        <Input label="Website address" type="url" error={errors.website?.message} {...register('website')} />
        <Input label="Organisation email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Organisation phone" error={errors.phone?.message} {...register('phone')} />
      </Section>

      <Section title="Authorised contact person">
        <Input label="Full name" error={errors.contact_name?.message} {...register('contact_name')} />
        <Input label="Position within the organisation" error={errors.contact_position?.message} {...register('contact_position')} />
        <Input label="Direct contact phone" error={errors.contact_phone?.message} {...register('contact_phone')} />
        <Input label="Email address" type="email" error={errors.contact_email?.message} {...register('contact_email')} />
      </Section>

      <Section title="Confirmations">
        <Confirmation
          name="confirmed_authorised_contact"
          label="The contact is authorised to register on behalf of the organisation"
        />
        <Confirmation
          name="confirmed_accurate_information"
          label="The organisation is legitimate and the information supplied is accurate"
        />
        <Confirmation name="accepted_terms" label="Agreement to the website's terms and conditions" />
        <Confirmation name="acknowledged_privacy_policy" label="Acknowledgement of the privacy policy" />
        <Confirmation name="consented_to_contact" label="Permission to contact the organisation about its registration and use of services" />
        <Confirmation name="acknowledged_fees" label="Confirmation of any fees, commissions or fundraising arrangements that apply" />
      </Section>

      <Section
        title="Fundraising details"
        hint="Only needed if the charity will raise funds or organise fundraising activities through the website. Bank details are collected by the payment provider, not stored here."
      >
        <Input
          label="Fundraising registration or authority details (where required)"
          error={errors.fundraising_authority_details?.message}
          {...register('fundraising_authority_details')}
        />
        <Input label="Intended fundraising purpose" error={errors.fundraising_purpose?.message} {...register('fundraising_purpose')} />
        <Input label="Short description of the organisation" error={errors.short_description?.message} {...register('short_description')} />
        <Input
          label="Name of the person authorised to approve fundraising activities"
          error={errors.fundraising_approver_name?.message}
          {...register('fundraising_approver_name')}
        />
      </Section>
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
