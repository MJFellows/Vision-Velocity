'use client';

/**
 * Landing page for the link emailed to a Bunnings Activities Officer. The link
 * is only used up when this page calls the backend (email scanners that open
 * the link do not run this script), then the officer is taken to their events.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { ApiRequestError } from '@/lib/api';
import { bunningsApi, setAoSession } from '@/lib/bunningsApi';

function AuthInner() {
  const router = useRouter();
  const params = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get('token');
    if (!token) {
      setError('This link is incomplete.');
      return;
    }
    bunningsApi
      .openLink(token)
      .then((r) => {
        setAoSession(r.data.sessionToken, r.data.storeName);
        router.replace('/bunnings/activities-officer/events');
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Something went wrong opening your link.'));
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/50 px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="mb-1 text-2xl font-bold text-navy">Vision Velocity</h1>
        <p className="mb-6 text-sm text-charcoal/70">Bunnings Activities Officers</p>
        {error ? (
          <>
            <p role="alert" className="mb-4 rounded-card bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
            <Link href="/bunnings/activities-officer/sign-in" className="font-medium text-accent underline">
              Email me a new link
            </Link>
          </>
        ) : (
          <p className="text-charcoal" aria-live="polite">
            Opening your store&apos;s events…
          </p>
        )}
      </Card>
    </div>
  );
}

export default function BunningsAuthPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-charcoal/60">Opening…</div>}>
      <AuthInner />
    </Suspense>
  );
}
