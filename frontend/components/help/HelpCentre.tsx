'use client';

/** Help Centre index (shared by the admin and charity areas): searchable guides and the glossary. */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { GLOSSARY, GUIDES } from '@/lib/help-content';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function HelpCentre({ audience, base }: { audience: 'admin' | 'charity' | 'bunnings'; base: string }) {
  const [q, setQ] = useState('');
  const guides = useMemo(() => {
    const term = q.trim().toLowerCase();
    return GUIDES.filter((g) => g.audience === audience).filter(
      (g) => !term || [g.title, g.summary, ...g.steps].join(' ').toLowerCase().includes(term)
    );
  }, [q, audience]);

  return (
    <>
      <h1 className="mb-1">Help</h1>
      <p className="mb-6 text-sm text-charcoal/70">Short, step-by-step guides. Press ? on any page for help with that page.</p>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the guides"
        aria-label="Search the guides"
        className="mb-6 w-full max-w-md rounded-full border border-grey bg-white px-4 py-2 text-sm focus-ring"
        data-no-track
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {guides.length === 0 && <p className="text-sm text-charcoal/70">No guide matches “{q}”. Try other words, or use Feedback to ask us.</p>}
          {guides.map((g) => (
            <Link key={g.slug} href={`${base}/${g.slug}`} className="block rounded-card border border-grey bg-white p-4 hover:border-accent">
              <p className="font-medium text-navy">{g.title}</p>
              <p className="text-sm text-charcoal/70">{g.summary}</p>
            </Link>
          ))}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What the words mean</CardTitle>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              {GLOSSARY.filter((g) => audience === 'admin' || !['Head-office negotiations', 'Component', 'Possible / Declined', 'Invoice'].includes(g.term)).map((g) => (
                <div key={g.term}>
                  <dt className="font-medium text-navy">{g.term}</dt>
                  <dd className="text-charcoal/70">{g.meaning}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {audience !== 'bunnings' && (
          <Card>
            <CardHeader>
              <CardTitle>Welcome tour</CardTitle>
            </CardHeader>
            <p className="mb-3 text-sm text-charcoal/70">See the short introduction again.</p>
            <Button type="button" variant="outline" onClick={() => window.dispatchEvent(new Event(`vv-replay-tour-${audience}`))}>
              Replay the tour
            </Button>
          </Card>
          )}
        </div>
      </div>
    </>
  );
}
