'use client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate password requirements
  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain an uppercase letter';
    }
    if (!/\d/.test(pwd)) {
      return 'Password must contain a number';
    }
    return null;
  };

  if (!code || type !== 'recovery') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grey/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Reset Link</CardTitle>
          </CardHeader>
          <p className="text-charcoal/80">
            The password reset link is invalid or has expired. Please request a new one.
          </p>
          <a href="/admin/login" className="mt-6 inline-block text-accent hover:underline">
            Back to Login
          </a>
        </Card>
      </div>
    );
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    if (pwd) {
      setPasswordError(validatePassword(pwd));
    } else {
      setPasswordError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password requirements
    const pwd_error = validatePassword(password);
    if (pwd_error) {
      setPasswordError(pwd_error);
      return;
    }

    setLoading(true);

    try {
      await api.post(
        '/api/auth/reset-password',
        { code, password },
        true // skipAuth: true because this endpoint is public
      );
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 2000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grey/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Password Reset Successful</CardTitle>
          </CardHeader>
          <p className="text-charcoal/80">
            Your password has been reset. Redirecting to login...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-card bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Enter new password"
            disabled={loading}
            error={passwordError || undefined}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={loading}
            required
          />

          <Button
            type="submit"
            disabled={loading || !!passwordError}
            isLoading={loading}
            className="w-full mt-6"
          >
            Reset Password
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-grey text-center text-sm text-charcoal/60">
          Remember your password?{' '}
          <a href="/admin/login" className="text-accent hover:underline">
            Back to Login
          </a>
        </div>
      </Card>
    </div>
  );
}
