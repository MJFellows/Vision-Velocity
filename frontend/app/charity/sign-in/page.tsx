'use client';

/**
 * Completes an emailed one-time sign-in link. The link is only used when the
 * person presses the button, so email scanners that open links cannot use it up.
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiRequestError, setStoredRefreshToken, setStoredToken } from '@/lib/api';
import type { LoginResponse } from '@/lib/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function SignInWithLink() {
  const params = useSearchParams();
  const tokenHash = params.get('token_hash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<LoginResponse>('/api/auth/verify-link', { token_hash: tokenHash }, true);
      setStoredToken(res.token);
      setStoredRefreshToken(res.session?.refresh_token ?? null);
      try {
        window.localStorage.setItem('vv_auth_user', JSON.stringify(res.user));
      } catch {
        // ignore
      }
      // Full reload so the session is picked up everywhere.
      window.location.replace('/charity');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not sign you in — please request a new link.');
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to your charity area</CardTitle>
      </CardHeader>
      {tokenHash ? (
        <>
          <p className="mb-4 text-sm text-charcoal/80">Press the button to finish signing in. The link works once.</p>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Button type="button" className="w-full" isLoading={busy} onClick={go}>
            Sign in
          </Button>
        </>
      ) : (
        <p className="text-sm text-charcoal/80">This link is incomplete.</p>
      )}
      <Link href="/charity/login" className="mt-4 inline-block text-sm text-accent underline">
        Back to the sign-in page
      </Link>
    </Card>
  );
}

export default function CharitySignInLinkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/40 px-4">
      <Suspense fallback={null}>
        <SignInWithLink />
      </Suspense>
    </div>
  );
}
