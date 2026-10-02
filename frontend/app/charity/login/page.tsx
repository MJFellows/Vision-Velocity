'use client';

/** Charity sign-in: password, or "Email me a sign-in link" / "Forgot password?". */

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiRequestError } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function CharityLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(params.get('set') ? 'Your password is set. Sign in below.' : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy('login');
    try {
      await login(email.trim(), password);
      router.replace('/charity');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not sign in — please try again.');
    } finally {
      setBusy(null);
    }
  };

  const sendLink = async (purpose: 'sign_in' | 'reset') => {
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(purpose);
    try {
      const res = await api.post<{ message: string }>('/api/auth/charity-link', { email: email.trim(), purpose }, true);
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not send the email — please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Charity sign in</CardTitle>
        </CardHeader>
        <form onSubmit={submit} className="space-y-4" data-form="Charity sign in">
          <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-green-700">{info}</p>}
          <Button type="submit" className="w-full" isLoading={busy === 'login'} disabled={!password}>
            Sign in
          </Button>
        </form>
        <div className="mt-4 space-y-2 border-t border-grey pt-4 text-center text-sm">
          <button type="button" className="block w-full text-accent underline" disabled={busy !== null} onClick={() => sendLink('sign_in')}>
            Email me a sign-in link (no password needed)
          </button>
          <button type="button" className="block w-full text-charcoal/70 underline" disabled={busy !== null} onClick={() => sendLink('reset')}>
            Forgot password?
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-charcoal/70">
          Not signed up yet?{' '}
          <Link href="/charity/signup" className="text-accent underline">
            Register your charity
          </Link>
          . Vision Velocity staff sign in{' '}
          <Link href="/admin/login" className="underline">
            here
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}

export default function CharityLoginPage() {
  return (
    <Suspense fallback={null}>
      <CharityLogin />
    </Suspense>
  );
}
