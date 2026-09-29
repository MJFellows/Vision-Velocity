'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormWrapper } from '@/components/forms/FormWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<LoginValues>();

  return (
    <div className="space-y-4">
      <Input label="Email" type="email" autoComplete="username" error={errors.email?.message} {...register('email')} />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
    </div>
  );
}

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: LoginValues) => {
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      router.push('/admin/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
        </CardHeader>
        <FormWrapper schema={loginSchema} onSubmit={handleSubmit}>
          <LoginFields />
          <Button type="submit" className="mt-6 w-full" isLoading={isSubmitting}>
            Sign in
          </Button>
        </FormWrapper>
      </Card>
    </div>
  );
}
