'use client';

import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormWrapper } from './FormWrapper';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { SupplierContact } from '@/lib/types';

export const supplierContactFormSchema = z.object({
  contact_person_name: z.string().min(2, 'Enter at least 2 characters').max(100),
  contact_email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  contact_phone: z.string().optional(),
  contact_role: z.enum(['category_manager', 'store_manager', 'supply_manager', 'other', '']).optional(),
  status: z.enum(['interested', 'meeting_scheduled', 'proposal_submitted', 'negotiating', 'agreed']),
  last_contact_date: z.string().optional(),
  next_contact_date: z.string().optional(),
  discussion_summary: z.string().optional(),
  delivery_logistics_status: z.string().optional(),
  supply_pricing_status: z.string().optional(),
  commercial_agreement_status: z.string().optional(),
  internal_notes: z.string().optional(),
});

export type SupplierContactFormValues = z.infer<typeof supplierContactFormSchema>;

const dateOnly = (value?: string | null) => (value ? value.slice(0, 10) : '');

function contactToFormValues(contact?: Partial<SupplierContact>): SupplierContactFormValues {
  return {
    contact_person_name: contact?.contact_person_name ?? '',
    contact_email: contact?.contact_email ?? '',
    contact_phone: contact?.contact_phone ?? '',
    contact_role: contact?.contact_role ?? '',
    status: contact?.status ?? 'interested',
    last_contact_date: dateOnly(contact?.last_contact_date),
    next_contact_date: dateOnly(contact?.next_contact_date),
    discussion_summary: contact?.discussion_summary ?? '',
    delivery_logistics_status: contact?.delivery_logistics_status ?? '',
    supply_pricing_status: contact?.supply_pricing_status ?? '',
    commercial_agreement_status: contact?.commercial_agreement_status ?? '',
    internal_notes: contact?.internal_notes ?? '',
  };
}

const textareaClass =
  'w-full rounded-card border border-grey px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/40 focus-ring';

function SupplierContactFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SupplierContactFormValues>();

  return (
    <div className="space-y-4">
      <Input label="Contact name" error={errors.contact_person_name?.message} {...register('contact_person_name')} />
      <Input label="Email" type="email" error={errors.contact_email?.message} {...register('contact_email')} />
      <Input label="Phone" type="tel" error={errors.contact_phone?.message} {...register('contact_phone')} />
      <Select
        label="Contact role"
        error={errors.contact_role?.message}
        options={[
          { value: '', label: 'Not recorded' },
          { value: 'category_manager', label: 'Category manager' },
          { value: 'store_manager', label: 'Store manager' },
          { value: 'supply_manager', label: 'Supply manager' },
          { value: 'other', label: 'Other' },
        ]}
        {...register('contact_role')}
      />
      <Select
        label="Negotiation status"
        error={errors.status?.message}
        options={[
          { value: 'interested', label: 'Interested' },
          { value: 'meeting_scheduled', label: 'Meeting scheduled' },
          { value: 'proposal_submitted', label: 'Proposal submitted' },
          { value: 'negotiating', label: 'Negotiating' },
          { value: 'agreed', label: 'Agreed' },
        ]}
        {...register('status')}
      />
      <Input label="Last contact" type="date" error={errors.last_contact_date?.message} {...register('last_contact_date')} />
      <Input label="Next contact" type="date" error={errors.next_contact_date?.message} {...register('next_contact_date')} />
      <div>
        <label htmlFor="discussion_summary" className="mb-1 block text-sm font-medium text-charcoal">
          Discussion summary
        </label>
        <textarea id="discussion_summary" rows={3} className={textareaClass} {...register('discussion_summary')} />
      </div>
      <Input label="Delivery and logistics status" error={errors.delivery_logistics_status?.message} {...register('delivery_logistics_status')} />
      <Input label="Supply and pricing status" error={errors.supply_pricing_status?.message} {...register('supply_pricing_status')} />
      <Input label="Commercial agreement status" error={errors.commercial_agreement_status?.message} {...register('commercial_agreement_status')} />
      <div>
        <label htmlFor="internal_notes" className="mb-1 block text-sm font-medium text-charcoal">
          Internal notes
        </label>
        <textarea id="internal_notes" rows={3} className={textareaClass} {...register('internal_notes')} />
      </div>
    </div>
  );
}

export function SupplierContactForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: {
  defaultValues?: Partial<SupplierContact>;
  onSubmit: (values: SupplierContactFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  return (
    <FormWrapper schema={supplierContactFormSchema} defaultValues={contactToFormValues(defaultValues)} onSubmit={onSubmit}>
      <SupplierContactFields />
      <Button type="submit" className="mt-6 w-full">
        {submitLabel}
      </Button>
    </FormWrapper>
  );
}
