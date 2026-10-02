'use client';

/**
 * Right-hand slide-over panel used by the "same postcode" buttons on the Bunnings
 * and Charity detail pages. It shows one or more titled lists of matching records,
 * each row linking to that record's own page. Escape or the backdrop closes it.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { NEARBY_RADIUS_OPTIONS, type NearbyRadiusKm } from '@/lib/adminApi';

export interface PanelItem {
  id: string;
  href: string;
  primary: string;
  secondary?: string;
  badge?: string;
}

export interface PanelSection {
  title: string;
  items: PanelItem[];
  emptyText: string;
}

export function SamePostcodePanel({
  title,
  postcode,
  sections,
  isLoading,
  error,
  noPostcodeMessage,
  radiusKm,
  onRadiusChange,
  originAvailable,
  onClose,
}: {
  title: string;
  postcode: string | null | undefined;
  sections: PanelSection[];
  isLoading: boolean;
  error: string | null;
  /** Shown when the record being viewed has no postcode, so nothing can be matched. */
  noPostcodeMessage: string;
  radiusKm: NearbyRadiusKm;
  onRadiusChange: (radius: NearbyRadiusKm) => void;
  /** false when a radius was requested but the postcode can not be placed on the map. */
  originAvailable: boolean | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  let body: ReactNode;
  if (isLoading) {
    body = <p className="text-sm text-charcoal/70">Loading…</p>;
  } else if (error) {
    body = <p className="text-sm text-red-600">{error}</p>;
  } else if (!postcode) {
    body = <p className="text-sm text-charcoal/70">{noPostcodeMessage}</p>;
  } else {
    body = (
      <div className="space-y-6">
        {radiusKm > 0 && originAvailable === false && (
          <p className="rounded-card bg-amber-50 p-3 text-sm text-amber-800">
            This postcode can not be placed on the map (no stores with coordinates in it), so only exact postcode matches are shown.
          </p>
        )}
        {sections.map((section) => (
          <section key={section.title}>
            <h3 className="mb-2 text-sm font-semibold text-navy">
              {section.title} ({section.items.length})
            </h3>
            {section.items.length === 0 ? (
              <p className="text-sm text-charcoal/70">{section.emptyText}</p>
            ) : (
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="block rounded-card border border-grey p-3 hover:border-accent">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-navy">{item.primary}</span>
                        {item.badge && <Badge>{item.badge}</Badge>}
                      </div>
                      {item.secondary && <p className="mt-0.5 text-xs text-charcoal/70">{item.secondary}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close panel" className="absolute inset-0 bg-black/30" onClick={onClose} tabIndex={-1} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-grey px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-navy">{title}</h2>
            {postcode && <p className="text-sm text-charcoal/70">Postcode {postcode}</p>}
          </div>
          <Button ref={closeRef} variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="border-b border-grey px-4 py-3">
          <Select
            label="Area"
            value={String(radiusKm)}
            onChange={(e) => onRadiusChange(Number(e.target.value) as NearbyRadiusKm)}
            options={NEARBY_RADIUS_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            disabled={!postcode && !isLoading}
          />
          {radiusKm > 0 && (
            <p className="mt-1 text-xs text-charcoal/70">Distances are approximate, measured in a straight line. Charities are placed at the centre of their postcode.</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{body}</div>
      </aside>
    </div>
  );
}
