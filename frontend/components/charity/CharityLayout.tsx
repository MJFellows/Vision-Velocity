'use client';

/**
 * Layout for the signed-in charity area: checks the session with /api/charity/me,
 * provides the charity's details to pages, and shows the charity menu, help,
 * "Contact us" and the welcome tour.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ApiRequestError } from '@/lib/api';
import { charityApi, type CharityMe } from '@/lib/charityApi';
import { useAuth } from '@/lib/auth';
import { HelpPanel } from '@/components/help/HelpPanel';
import { FeedbackButton } from '@/components/help/FeedbackButton';
import { FirstVisitTour, CHARITY_TOUR } from '@/components/help/FirstVisitTour';
import { UsageTracker } from '@/components/usage/UsageTracker';

const CharityContext = createContext<{ me: CharityMe; reload: () => Promise<void> } | null>(null);

export function useCharity() {
  const ctx = useContext(CharityContext);
  if (!ctx) throw new Error('useCharity must be used inside CharityLayout');
  return ctx;
}

const NAV = [
  { href: '/charity', label: 'Home', exact: true },
  { href: '/charity/my-events', label: 'My events' },
  { href: '/charity/orders', label: 'My orders' },
  { href: '/charity/profile', label: 'Profile' },
  { href: '/charity/help', label: 'Help' },
];

export function CharityLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, isLoading, isAuthenticated, user } = useAuth();
  const [me, setMe] = useState<CharityMe | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await charityApi.me();
      setMe(res.data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) router.replace('/charity/login');
      else if (err instanceof ApiRequestError && err.status === 403) setProblem(err.message);
      else setProblem('Could not load your charity — please refresh.');
    }
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/charity/login');
      return;
    }
    if (user?.role) {
      // An admin account: the admin area is the right place.
      router.replace('/admin/dashboard');
      return;
    }
    load();
  }, [isLoading, isAuthenticated, user, load, router]);

  const signOut = async () => {
    await logout();
    router.replace('/charity/login');
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
  if (!me) {
    return <div className="flex min-h-screen items-center justify-center text-charcoal/60">Loading your charity…</div>;
  }

  return (
    <CharityContext.Provider value={{ me, reload: load }}>
      <div className="min-h-screen bg-grey/40">
        <header className="sticky top-0 z-30 border-b border-grey bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs uppercase text-charcoal/50">Vision Velocity</p>
              <p className="truncate font-display font-semibold text-navy">{me.charity.name}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <FeedbackButton endpoint="/api/charity/feedback" label="Contact us" />
              <HelpPanel helpHome="/charity/help" />
            </div>
          </div>
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2 text-sm">
            {NAV.map((n) => {
              const active = n.exact ? pathname === n.href : pathname?.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} className={clsx('whitespace-nowrap rounded-full px-3 py-1.5', active ? 'bg-accent text-white' : 'text-charcoal hover:bg-grey/50')}>
                  {n.label}
                </Link>
              );
            })}
            <button type="button" onClick={signOut} className="ml-auto whitespace-nowrap rounded-full px-3 py-1.5 text-charcoal/70 hover:bg-grey/50">
              Sign out
            </button>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
      </div>
      <UsageTracker endpoint="/api/charity/usage" />
      <FirstVisitTour area="charity" steps={CHARITY_TOUR} />
    </CharityContext.Provider>
  );
}
