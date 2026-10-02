'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAoToken } from '@/lib/bunningsApi';

/** /bunnings/activities-officer: go to the events (signed in) or the sign-in page. */
export default function BunningsHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getAoToken() ? '/bunnings/activities-officer/events' : '/bunnings/activities-officer/sign-in');
  }, [router]);
  return null;
}
