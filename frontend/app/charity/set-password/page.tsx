'use client';

/** Choose a password from the "Set up your sign-in" or "Reset your password" email. */

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiRequestError } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function SetPassword() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenHash = params.get('token_hash');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tokenHash) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Link incomplete</CardTitle>
        </CardHeader>
        <p className="text-sm text-charcoal/80">This link is missing information. Use the button in the email, or request a new link from the sign-in page.</p>
        <Link href="/charity/login" className="mt-4 inline-block text-accent underline">
          Go to sign in
        </Link>
      </Card>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError('Use at least 8 characters, including an uppercase letter and a number.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/reset-password', { token_hash: tokenHash, password }, true);
      router.replace('/charity/login?set=1');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not set your password — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Choose your password</CardTitle>
      </CardHeader>
      <form onSubmit={submit} className="space-y-4" data-form="Charity set password">
        <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <p className="text-xs text-charcoal/60">At least 8 characters, including an uppercase letter and a number. This link works once.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" isLoading={busy}>
          Save password
        </Button>
      </form>
    </Card>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/40 px-4">
      <Suspense fallback={null}>
        <SetPassword />
      </Suspense>
    </div>
  );
}
