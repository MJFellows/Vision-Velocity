'use client';

/**
 * Records page views, button/link presses and form submitted/abandoned events
 * for the signed-in area it is mounted in (admin or charity). See lib/usage.ts.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { flushUsage, labelFor, setUsageEndpoint, trackUsage } from '@/lib/usage';

export function UsageTracker({ endpoint, getToken }: { endpoint: string; getToken?: () => string | null }) {
  const pathname = usePathname();
  const dirtyForms = useRef(new Set<string>());

  useEffect(() => {
    setUsageEndpoint(endpoint, getToken);
    const formName = (form: HTMLFormElement | null) => form?.getAttribute('data-form') || form?.getAttribute('aria-label') || 'form';

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest('button, a, [data-track]') as HTMLElement | null;
      if (!el) return;
      const label = labelFor(el);
      if (label) trackUsage('click', label);
    };
    const onInput = (e: Event) => {
      const form = (e.target as HTMLElement | null)?.closest('form');
      if (form && !form.closest('[data-no-track]')) dirtyForms.current.add(`${window.location.pathname}|${formName(form)}`);
    };
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      const key = `${window.location.pathname}|${formName(form)}`;
      dirtyForms.current.delete(key);
      trackUsage('form_submitted', formName(form));
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushUsage(true);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('visibilitychange', onHide);
      flushUsage(true);
    };
  }, [endpoint, getToken]);

  useEffect(() => {
    trackUsage('page_view');
    const forms = dirtyForms.current;
    return () => {
      // Leaving the page: any form that was typed in but never submitted counts as abandoned.
      for (const key of forms) {
        const [page, name] = key.split('|');
        trackUsage('form_abandoned', name, page);
      }
      forms.clear();
    };
  }, [pathname]);

  return null;
}
