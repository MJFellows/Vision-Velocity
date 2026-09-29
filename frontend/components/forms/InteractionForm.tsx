'use client';

import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormWrapper } from './FormWrapper';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export const interactionFormSchema = z.object({
  interaction_type: z.enum(['phone_call', 'email', 'sms', 'meeting', 'note']),
  direction: z.enum(['inbound', 'outbound']),
  subject: z.string().optional(),
  details: z.string().optional(),
  next_action: z.string().optional(),
  next_action_date: z.string().optional(),
});

export type InteractionFormValues = z.infer<typeof interactionFormSchema>;

function InteractionFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<InteractionFormValues>();

  return (
    <div className="space-y-4">
      <Select
        label="Type"
        options={[
          { value: 'note', label: 'Note' },
          { value: 'phone_call', label: 'Phone call' },
          { value: 'email', label: 'Email' },
          { value: 'sms', label: 'SMS' },
          { value: 'meeting', label: 'Meeting' },
        ]}
        error={errors.interaction_type?.message}
        {...register('interaction_type')}
      />
      <Select
        label="Direction"
        options={[
          { value: 'outbound', label: 'Outbound (we contacted them)' },
          { value: 'inbound', label: 'Inbound (they contacted us)' },
        ]}
        error={errors.direction?.message}
        {...register('direction')}
      />
      <Input label="Subject" error={errors.subject?.message} {...register('subject')} />
      <Input label="Details" error={errors.details?.message} {...register('details')} />
      <Input label="Follow-up action" error={errors.next_action?.message} {...register('next_action')} />
      <Input label="Follow-up date" type="date" error={errors.next_action_date?.message} {...register('next_action_date')} />
    </div>
  );
}

export function InteractionForm({ onSubmit, submitLabel = 'Log interaction' }: { onSubmit: (values: InteractionFormValues) => Promise<void>; submitLabel?: string }) {
  return (
    <FormWrapper
      schema={interactionFormSchema}
      defaultValues={{ interaction_type: 'note', direction: 'outbound', subject: '', details: '', next_action: '', next_action_date: '' }}
      onSubmit={onSubmit}
    >
      <InteractionFields />
      <Button type="submit" className="mt-6 w-full">
        {submitLabel}
      </Button>
    </FormWrapper>
  );
}
