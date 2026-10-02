'use client';

/** Bunnings Activities Officers ask for a new sign-in link here (no password needed). */

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api';
import { bunningsApi } from '@/lib/bunningsApi';

function SignInInner() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const r = await bunningsApi.requestLink(email.trim());
      setDone(r.data.message);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not send — please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/50 px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-1 text-2xl font-bold text-navy">Bunnings Activities Officers</h1>
        <p className="mb-6 text-sm text-charcoal/70">See the charity sausage sizzles Vision Velocity is arranging at your store.</p>
        {params.get('expired') && !done && <p className="mb-4 rounded-card bg-amber-50 p-3 text-sm text-amber-900">Your sign-in has expired. Enter your email for a new link.</p>}
        {done ? (
          <p role="status" className="rounded-card bg-green-50 p-3 text-sm text-green-800">
            {done}
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4" data-no-track>
            <Input id="ao-email" type="email" label="Your work email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={sending} className="w-full">
              Email me a sign-in link
            </Button>
            <p className="text-xs text-charcoal/70">
              The link works once and lasts 7 days. Use the email address Vision Velocity has for your store; if it has changed, email{' '}
              <a href="mailto:support@visionvelocity.com.au" className="text-accent underline">
                support@visionvelocity.com.au
              </a>
              .
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function BunningsSignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}
