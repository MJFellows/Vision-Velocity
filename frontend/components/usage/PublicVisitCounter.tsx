'use client';

/** Counts a public page visit (page, referring site and device type only — no identifiers or cookies). */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { deviceType } from '@/lib/usage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export function PublicVisitCounter() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    fetch(`${API_BASE_URL}/api/public/page-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname, referrer: document.referrer || null, device: deviceType() }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
