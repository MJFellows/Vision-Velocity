'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, ApiRequestError } from '@/lib/api';

/**
 * "Forgot password?" page for admins, linked from /admin/login.
 * Calls POST /api/auth/forgot-password, which always answers the same way so
 * that it does not reveal which addresses have admin accounts.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        '/api/auth/forgot-password',
        { email: email.trim() },
        true /* skipAuth: public endpoint */
      );
      setSentMessage(res.message);
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
        </CardHeader>

        {sentMessage ? (
          <div className="space-y-4">
            <p className="text-sm text-charcoal/80">{sentMessage}</p>
            <p className="text-sm text-charcoal/70">
              Use the newest email only. If nothing arrives within a few minutes, check your junk
              folder, then try again.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-card bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}
            <p className="text-sm text-charcoal/70">
              Enter your admin email address and we&apos;ll send you a link to set a new password.
            </p>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            <Button type="submit" className="mt-2 w-full" isLoading={loading}>
              Send reset link
            </Button>
          </form>
        )}

        <div className="mt-6 border-t border-grey pt-4 text-center text-sm text-charcoal/70">
          <a href="/admin/login" className="text-accent hover:underline">
            Back to sign in
          </a>
        </div>
      </Card>
    </div>
  );
}
