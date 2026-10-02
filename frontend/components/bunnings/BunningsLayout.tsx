'use client';

/**
 * Layout for the Bunnings Activities Officer area: checks the sign-in (from the
 * emailed link), loads the store and its events once, and shows the menu,
 * page help and "Contact us".
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ApiRequestError } from '@/lib/api';
import { bunningsApi, getAoToken, setAoSession, type AoEvent, type AoStore } from '@/lib/bunningsApi';
import { HelpPanel } from '@/components/help/HelpPanel';
import { FeedbackButton } from '@/components/help/FeedbackButton';
import { UsageTracker } from '@/components/usage/UsageTracker';

interface AoData {
  store: AoStore;
  upcoming: AoEvent[];
  past: AoEvent[];
  today: string;
}

const AoContext = createContext<{ data: AoData; reload: () => Promise<void> } | null>(null);

export function useAo() {
  const ctx = useContext(AoContext);
  if (!ctx) throw new Error('useAo must be used inside BunningsLayout');
  return ctx;
}

const BASE = '/bunnings/activities-officer';
const NAV = [
  { href: `${BASE}/events`, label: 'Events at my store' },
  { href: `${BASE}/store`, label: 'My details' },
  { href: `${BASE}/help`, label: 'Help' },
];

export function BunningsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<AoData | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await bunningsApi.events();
      setData(res.data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) router.replace(`${BASE}/sign-in?expired=1`);
      else setProblem(err instanceof ApiRequestError ? err.message : 'Could not load your store — please refresh.');
    }
  }, [router]);

  useEffect(() => {
    if (!getAoToken()) {
      router.replace(`${BASE}/sign-in`);
      return;
    }
    load();
  }, [load, router]);

  const signOut = () => {
    setAoSession(null);
    router.replace(`${BASE}/sign-in`);
  };

  if (problem) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="mb-4 text-charcoal">{problem}</p>
          <button type="button" className="text-accent underline" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }
  if (!data) return <div className="flex min-h-screen items-center justify-center text-charcoal/70">Loading your store…</div>;

  return (
    <AoContext.Provider value={{ data, reload: load }}>
      <div className="min-h-screen bg-grey/40">
        <header className="sticky top-0 z-30 border-b border-grey bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs uppercase text-charcoal/70">Vision Velocity · Bunnings Activities Officer</p>
              <p className="truncate font-display font-semibold text-navy">Bunnings {data.store.location}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <FeedbackButton endpoint="/api/bunnings/activities-officer/feedback" label="Contact us" send={bunningsApi.feedback} />
              <HelpPanel helpHome={`${BASE}/help`} />
            </div>
          </div>
          <nav aria-label="Bunnings menu" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2 text-sm">
            {NAV.map((n) => {
              const active = pathname?.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx('whitespace-nowrap rounded-full px-3 py-1.5', active ? 'bg-accent text-white' : 'text-charcoal hover:bg-grey/50')}
                >
                  {n.label}
                </Link>
              );
            })}
            <button type="button" onClick={signOut} className="ml-auto whitespace-nowrap rounded-full px-3 py-1.5 text-charcoal/80 hover:bg-grey/50">
              Sign out
            </button>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl p-4 sm:p-6">
          {children}
        </main>
      </div>
      <UsageTracker endpoint="/api/bunnings/activities-officer/usage" getToken={getAoToken} />
    </AoContext.Provider>
  );
}
