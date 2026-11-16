'use client';

import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

// Registration details recorded for a charity. Every field is optional.
// Bank details are not collected here (payment provider) and the logo is not included yet.
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const registrationFieldsSchema = z.object({
  trading_name: optionalText(150),
  organisation_type: z.string().optional(),
  acnc_registration: optionalText(100),
  registered_address: optionalText(300),
  state: z.string().optional(),
  website: optionalText(300),
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

export type RegistrationFormValues = z.infer<typeof registrationFieldsSchema>;

/** Any record that carries these registration columns (admin charity or the signed-in charity). */
export type RegistrationSource = Partial<Record<keyof RegistrationFormValues, string | boolean | null>>;

export const ORGANISATION_TYPE_OPTIONS = [
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

export const CONFIRMATION_FIELDS = [
  'confirmed_authorised_contact',
  'confirmed_accurate_information',
  'accepted_terms',
  'acknowledged_privacy_policy',
  'consented_to_contact',
  'acknowledged_fees',
] as const;

type ConfirmationField = (typeof CONFIRMATION_FIELDS)[number];

export function registrationToFormValues(src?: RegistrationSource | null): RegistrationFormValues {
  const s = (v: string | boolean | null | undefined) => (typeof v === 'string' ? v : '');
  const b = (k: ConfirmationField) => Boolean(src?.[k]);
  return {
    trading_name: s(src?.trading_name),
    organisation_type: s(src?.organisation_type),
    acnc_registration: s(src?.acnc_registration),
    registered_address: s(src?.registered_address),
    state: s(src?.state),
    website: s(src?.website),
    contact_position: s(src?.contact_position),
    contact_phone: s(src?.contact_phone),
    contact_email: s(src?.contact_email),
    confirmed_authorised_contact: b('confirmed_authorised_contact'),
    confirmed_accurate_information: b('confirmed_accurate_information'),
    accepted_terms: b('accepted_terms'),
    acknowledged_privacy_policy: b('acknowledged_privacy_policy'),
    consented_to_contact: b('consented_to_contact'),
    acknowledged_fees: b('acknowledged_fees'),
    fundraising_authority_details: s(src?.fundraising_authority_details),
    fundraising_purpose: s(src?.fundraising_purpose),
    short_description: s(src?.short_description),
    fundraising_approver_name: s(src?.fundraising_approver_name),
  };
}

/** API shape: blank text becomes null and booleans are always sent. */
export function toRegistrationPayload(v: RegistrationFormValues) {
  const t = (s?: string) => {
    const trimmed = s?.trim();
    return trimmed ? trimmed : null;
  };
  return {
    trading_name: t(v.trading_name),
    organisation_type: (v.organisation_type || null) as string | null,
    acnc_registration: t(v.acnc_registration),
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

export function RegistrationSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-grey pt-5">
      <legend className="text-sm font-semibold text-navy">{title}</legend>
      {hint && <p className="-mt-2 text-xs text-charcoal/70">{hint}</p>}
      {children}
    </fieldset>
  );
}

function Confirmation({ name, label }: { name: ConfirmationField; label: string }) {
  const { register } = useFormContext<RegistrationFormValues>();
  return (
    <label className="flex items-start gap-2 text-sm text-charcoal">
      <input type="checkbox" className="mt-0.5 h-4 w-4" {...register(name)} />
      <span>{label}</span>
    </label>
  );
}

/** The registration sections. Must be rendered inside a FormProvider using registrationFieldsSchema. */
export function RegistrationFields({ includeOrganisation = true }: { includeOrganisation?: boolean }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<RegistrationFormValues>();

  return (
    <div className="space-y-6">
      {includeOrganisation && (
        <RegistrationSection title="Organisation details">
          <Input label="Trading name (if different)" error={errors.trading_name?.message} {...register('trading_name')} />
          <Input label="ACNC charity registration number or status" error={errors.acnc_registration?.message} {...register('acnc_registration')} />
          <Select label="Organisation type" options={ORGANISATION_TYPE_OPTIONS} error={errors.organisation_type?.message} {...register('organisation_type')} />
          <Input label="Registered business address" error={errors.registered_address?.message} {...register('registered_address')} />
          <Select label="State or territory" options={STATE_OPTIONS} error={errors.state?.message} {...register('state')} />
          <Input label="Website address" type="url" error={errors.website?.message} {...register('website')} />
        </RegistrationSection>
      )}

      <RegistrationSection title="Authorised contact person">
        <Input label="Position within the organisation" error={errors.contact_position?.message} {...register('contact_position')} />
        <Input label="Direct contact phone" error={errors.contact_phone?.message} {...register('contact_phone')} />
        <Input label="Contact email address" type="email" error={errors.contact_email?.message} {...register('contact_email')} />
      </RegistrationSection>

      <RegistrationSection title="Confirmations">
        <Confirmation name="confirmed_authorised_contact" label="The contact is authorised to register on behalf of the organisation" />
        <Confirmation name="confirmed_accurate_information" label="The organisation is legitimate and the information supplied is accurate" />
        <Confirmation name="accepted_terms" label="Agreement to the website's terms and conditions" />
        <Confirmation name="acknowledged_privacy_policy" label="Acknowledgement of the privacy policy" />
        <Confirmation name="consented_to_contact" label="Permission to contact the organisation about its registration and use of services" />
        <Confirmation name="acknowledged_fees" label="Confirmation of any fees, commissions or fundraising arrangements that apply" />
      </RegistrationSection>

      <RegistrationSection
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
      </RegistrationSection>
    </div>
  );
}
