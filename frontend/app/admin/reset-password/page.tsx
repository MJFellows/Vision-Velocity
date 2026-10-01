'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormWrapper } from '@/components/forms/FormWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/lib/api';

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ResetPasswordValues>();

  return (
    <div className="space-y-4">
      <Input
        label="New Password"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Input
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <p className="text-xs text-grey/60 mt-2">
        Password must be at least 8 characters and include an uppercase letter and a number.
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const type = searchParams.get('type');
    const code = searchParams.get('code');

    if (type === 'recovery' && code) {
      setHasToken(true);
    } else {
      setTokenError('Invalid or missing recovery link. Redirecting to login...');
      const timer = setTimeout(() => router.push('/admin/login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  const handleSubmit = async (values: ResetPasswordValues) => {
    setIsSubmitting(true);
    try {
      const code = searchParams.get('code');
      await api.post(
        '/api/auth/reset-password',
        {
          code,
          newPassword: values.newPassword,
        },
        true // skipAuth
      );

      router.push('/admin/login?resetSuccess=true');
    } catch (err) {
      console.error('Password reset failed:', err);
      setTokenError('Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tokenError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grey/40 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <p className="text-red-600 text-sm">{tokenError}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!hasToken) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <FormWrapper schema={resetPasswordSchema} onSubmit={handleSubmit}>
          <ResetPasswordFields />
          <Button type="submit" className="mt-6 w-full" isLoading={isSubmitting}>
            Reset password
          </Button>
        </FormWrapper>
        <div className="px-6 pb-6 border-t pt-6">
          <p className="text-sm text-grey/60 text-center">
            Remembered your password?{' '}
            <a href="/admin/login" className="text-red-500 hover:text-red-600 font-medium">
              Sign in instead
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
