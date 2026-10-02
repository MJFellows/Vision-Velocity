'use client';

/** Remembers admin record pages (charity, event, order, supplier, store) as "Recently viewed", using the page heading. */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { rememberRecent } from '@/lib/recent';

const RECORD_RE = /^\/admin\/(charities|events|orders|suppliers|bunnings)\/[0-9a-f-]{36}$/i;

export function RecentTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || !RECORD_RE.test(pathname)) return;
    const timer = setTimeout(() => {
      const h1 = document.querySelector('main h1')?.textContent?.trim();
      if (h1 && h1 !== 'Loading…') rememberRecent(pathname, h1);
    }, 1500);
    return () => clearTimeout(timer);
  }, [pathname]);
  return null;
}
