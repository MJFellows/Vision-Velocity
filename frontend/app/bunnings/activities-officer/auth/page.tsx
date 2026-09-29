// File: app/bunnings/activities-officer/auth/page.tsx
// Magic link authentication landing page for Bunnings Activities Officers.
// Wrapped in <Suspense> because useSearchParams() opts the page out of
// static rendering under Next.js 16 — without it, `next build` fails.

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

function AOAuthInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your link…');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Missing authentication token.');
      setErrorDetail('No token was provided in this link.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/bunnings/activities-officer/auth?token=${encodeURIComponent(token)}`);
        const body = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setStatus('error');
          setMessage(body?.error?.message ?? 'Authentication failed.');
          const details = body?.error?.details;
          setErrorDetail(details?.token ?? (details ? JSON.stringify(details) : null));
          return;
        }

        const { sessionToken, storeId, storeName, aoName } = body.data;
        localStorage.setItem('ao_session_token', sessionToken);
        localStorage.setItem('ao_store_id', storeId);
        localStorage.setItem('ao_store_name', storeName);
        localStorage.setItem('ao_name', aoName ?? '');

        setStatus('success');
        setMessage(`Welcome, ${aoName ?? 'there'}!`);

        setTimeout(() => {
          if (!cancelled) router.push('/bunnings/activities-officer/events');
        }, 1500);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage('Something went wrong verifying your link.');
        setErrorDetail(err instanceof Error ? err.message : null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey/50 px-4 sm:px-6">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="mb-1 text-2xl font-bold text-navy sm:text-3xl">Vision Velocity</h1>
        <p className="mb-8 text-sm text-charcoal/60">Activities Officer Portal</p>

        {status === 'loading' && (
          <div>
            <div className="mb-6 flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-accent" />
            </div>
            <p className="text-base text-charcoal">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <p className="mb-2 text-base font-medium text-charcoal">{message}</p>
            <p className="text-sm text-charcoal/60">Taking you to your event list…</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="mb-2 text-base font-medium text-charcoal">{message}</p>
            {errorDetail && (
              <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{errorDetail}</p>
            )}
            <p className="mb-6 text-sm text-charcoal/60">
              Contact Vision Velocity support if this keeps happening.
            </p>
            <Link href="/" className="text-sm font-medium text-accent hover:underline">
              Return to Home
            </Link>
          </div>
        )}

        <div className="mt-8 border-t border-grey pt-6">
          <p className="text-xs text-charcoal/50">
            Questions? Email{' '}
            <a href="mailto:support@visionvelocity.com.au" className="text-accent hover:underline">
              support@visionvelocity.com.au
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function AOAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-grey/50">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-accent" />
        </div>
      }
    >
      <AOAuthInner />
    </Suspense>
  );
}
