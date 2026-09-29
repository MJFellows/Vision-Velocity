'use client';

/**
 * Generic form wrapper combining React Hook Form + Zod validation with consistent
 * submit-error handling (surfaces ApiRequestError messages from /lib/api.ts).
 */

import type { ReactNode } from 'react';
import { useForm, FormProvider, type DefaultValues, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import { ApiRequestError } from '@/lib/api';
import { useState } from 'react';

interface FormWrapperProps<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues?: DefaultValues<T>;
  onSubmit: (values: T) => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function FormWrapper<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
}: FormWrapperProps<T>) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const methods = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = methods.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className={className} noValidate>
        {submitError && (
          <div role="alert" className="mb-4 rounded-card border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </div>
        )}
        {children}
      </form>
    </FormProvider>
  );
}
