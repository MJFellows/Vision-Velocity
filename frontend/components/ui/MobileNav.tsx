'use client';

/**
 * Bottom tab bar for phone-width admin screens (Rita & Natalie's primary
 * device). Four main items — Home, Events, Charities, More — with "More"
 * opening the rest of the menu. Hidden at md+ where AdminNav's sidebar takes over.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { navItems } from '@/components/layouts/AdminNav';
import { useAuth } from '@/lib/auth';

const MAIN = ['/admin/dashboard', '/admin/events', '/admin/charities'];
const LABELS: Record<string, string> = { '/admin/dashboard': 'Home', '/admin/events': 'Events', '/admin/charities': 'Charities' };

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useAuth();
  const inMore = !MAIN.some((h) => pathname?.startsWith(h));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-16 rounded-t-card bg-white p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {navItems
              .filter((i) => !MAIN.includes(i.href))
              .map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setMoreOpen(false)}
                  className={clsx('block rounded-card px-4 py-3 text-base', pathname?.startsWith(i.href) ? 'bg-accent/10 font-semibold text-accent' : 'text-charcoal')}
                >
                  {i.label}
                </Link>
              ))}
            <button type="button" onClick={() => logout()} className="block w-full rounded-card px-4 py-3 text-left text-base text-charcoal/70">
              Log out
            </button>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-grey bg-white md:hidden">
        {MAIN.map((href) => {
          const active = pathname?.startsWith(href);
          const Icon = href === '/admin/dashboard' ? HomeIcon : href === '/admin/events' ? CalendarIcon : UsersIcon;
          return (
            <Link key={href} href={href} className={clsx('flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium', active ? 'text-accent' : 'text-charcoal/60')}>
              <Icon className="h-6 w-6" />
              {LABELS[href]}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={clsx('flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium', inMore || moreOpen ? 'text-accent' : 'text-charcoal/60')}
        >
          <MoreIcon className="h-6 w-6" />
          More
        </button>
      </nav>
    </>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.2c2.9.4 5 2.4 5 5.8" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}
