'use client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Validate password requirements
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Password must contain an uppercase letter');
    }
    if (!/\d/.test(pwd)) {
      errors.push('Password must contain a number');
    }
    return errors;
  };

  if (!code || type !== 'recovery') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-red-600">Invalid Reset Link</h1>
          <p className="mt-4 text-gray-700">
            The password reset link is invalid or has expired. Please request a new one.
          </p>
          <a href="/admin/login" className="mt-6 inline-block text-blue-600 hover:underline">
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
      setPasswordErrors(validatePassword(pwd));
    } else {
      setPasswordErrors([]);
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
    const errors = validatePassword(password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to reset password');
        return;
      }

      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-green-600">Password Reset Successful</h1>
          <p className="mt-4 text-gray-700">
            Your password has been reset. Redirecting to login...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-2 text-2xl font-bold">Reset Your Password</h1>
        <p className="mb-6 text-gray-600">Enter your new password below</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter new password"
              className="mt-1"
              disabled={loading}
              required
            />
            {passwordErrors.length > 0 && (
              <div className="mt-2 space-y-1">
                {passwordErrors.map((err, idx) => (
                  <p key={idx} className="text-xs text-red-600">
                    • {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="mt-1"
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || passwordErrors.length > 0}
            className="w-full"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <a href="/admin/login" className="text-blue-600 hover:underline">
            Back to Login
          </a>
        </p>
      </Card>
    </div>
  );
}
