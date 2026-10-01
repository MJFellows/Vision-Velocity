'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, ApiRequestError } from '@/lib/api';

/**
 * Admin password reset form, opened from the Supabase "Reset password" email.
 *
 * Accepts two link formats (see backend/app/api/auth/reset-password/route.ts):
 *   ?type=recovery&token_hash=<hash>  — preferred; no email needed
 *   ?type=recovery&code=<otp>         — older links; email address required
 *
 * The link itself is never verified on page load — only when the form is
 * submitted — so email link scanners that open the link cannot use up the
 * one-time token.
 */
export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenHash = searchParams.get('token_hash');
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const needsEmail = !tokenHash;

  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain an uppercase letter';
    if (!/\d/.test(pwd)) return 'Password must contain a number';
    return null;
  };

  if (type !== 'recovery' || (!tokenHash && !code)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grey/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Reset Link</CardTitle>
          </CardHeader>
          <p className="text-charcoal/80">
            The password reset link is invalid or incomplete. Please request a new one.
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
    setPasswordError(pwd ? validatePassword(pwd) : null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      setPasswordError(pwdError);
      return;
    }

    setLoading(true);
    try {
      const body = tokenHash
        ? { token_hash: tokenHash, password }
        : { email: email.trim(), code: code?.trim(), password };

      await api.post('/api/auth/reset-password', body, true /* skipAuth: public endpoint */);
      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/login');
      }, 2500);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const details =
          err.details && typeof err.details === 'object'
            ? Object.values(err.details as Record<string, string>).join(' ')
            : '';
        setError(details ? `${err.message}: ${details}` : err.message);
      } else if (err instanceof Error) {
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
            Your password has been changed. Redirecting you to sign in…
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

          {needsEmail && (
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="The email address the reset link was sent to"
              disabled={loading}
              required
            />
          )}

          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
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
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={loading}
            required
          />

          <p className="text-xs text-charcoal/60">
            At least 8 characters, including an uppercase letter and a number. Each reset link
            works once; if it fails, request a new email and use the newest link.
          </p>

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
