'use client';

/** One search box for the whole admin site (charities, events, orders, stores, suppliers, packages, components). */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { trackUsage } from '@/lib/usage';

interface Hit {
  kind: string;
  id: string;
  label: string;
  detail: string | null;
  href: string;
}

export function GlobalSearch({ onNavigate }: { onNavigate?: () => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<{ data: Hit[] }>('/api/admin/search', { q: term });
        setHits(res.data);
        setOpen(true);
        if (res.data.length === 0) trackUsage('search_no_results', term.slice(0, 60));
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const showResults = open && q.trim().length >= 2 && hits !== null;

  return (
    <div ref={boxRef} className="relative w-full max-w-md" data-no-track>
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (e.target.value.trim().length < 2) setHits(null);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search charities, events, stores, suppliers…"
        aria-label="Search the site"
        className="w-full rounded-full border border-grey bg-white px-4 py-2 text-sm focus-ring"
      />
      {showResults && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-96 overflow-y-auto rounded-card border border-grey bg-white shadow-lg">
          {loading && <p className="px-4 py-3 text-sm text-charcoal/60">Searching…</p>}
          {!loading && hits!.length === 0 && <p className="px-4 py-3 text-sm text-charcoal/60">Nothing found for “{q.trim()}”.</p>}
          {!loading &&
            hits!.map((h) => (
              <Link
                key={`${h.kind}-${h.id}`}
                href={h.href}
                onClick={() => {
                  trackUsage('click', `Search result: ${h.kind}`);
                  setOpen(false);
                  setQ('');
                  setHits(null);
                  onNavigate?.();
                }}
                className="block border-b border-grey/60 px-4 py-2 last:border-0 hover:bg-grey/30"
              >
                <span className="mr-2 text-xs font-semibold uppercase text-charcoal/50">{h.kind}</span>
                <span className="text-sm font-medium text-navy">{h.label}</span>
                {h.detail && <span className="block text-xs text-charcoal/60">{h.detail}</span>}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
