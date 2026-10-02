'use client';

/** One help guide, with "Was this helpful?" and links to related guides. */

import { useState } from 'react';
import Link from 'next/link';
import { guide } from '@/lib/help-content';
import { trackUsage } from '@/lib/usage';
import { Card } from '@/components/ui/Card';

export function HelpGuidePage({ slug, base }: { slug: string; base: string }) {
  const g = guide(slug);
  const [answered, setAnswered] = useState<null | 'yes' | 'no'>(null);

  if (!g) {
    return (
      <>
        <p className="mb-4 text-sm text-charcoal/70">That guide was not found.</p>
        <Link href={base} className="text-accent underline">
          Back to Help
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href={base} className="mb-4 inline-block text-sm text-accent underline">
        &larr; All help guides
      </Link>
      <h1 className="mb-1">{g.title}</h1>
      <p className="mb-6 text-charcoal/70">{g.summary}</p>
      <Card className="max-w-2xl">
        <ol className="list-decimal space-y-3 pl-5 text-sm text-charcoal">
          {g.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {g.tips && g.tips.length > 0 && (
          <div className="mt-6 rounded-card bg-blue-50 p-4 text-sm text-blue-900">
            {g.tips.map((t) => (
              <p key={t}>Tip: {t}</p>
            ))}
          </div>
        )}
      </Card>

      {g.related && g.related.length > 0 && (
        <div className="mt-6 max-w-2xl">
          <h2 className="mb-2 text-sm font-semibold text-navy">What next?</h2>
          <ul className="space-y-1 text-sm">
            {g.related.map((r) => {
              const rg = guide(r);
              return rg ? (
                <li key={r}>
                  <Link href={`${base}/${r}`} className="text-accent underline">
                    {rg.title}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      )}

      <div className="mt-8 max-w-2xl text-sm">
        {answered ? (
          <p className="text-charcoal/70">
            {answered === 'yes' ? 'Thanks for letting us know.' : 'Thanks — please use Feedback at the top of the page to tell us what was missing.'}
          </p>
        ) : (
          <p className="flex items-center gap-3 text-charcoal/70">
            Was this helpful?
            <button type="button" data-track={`Guide helpful: yes — ${g.slug}`} className="rounded-full border border-grey px-3 py-1" onClick={() => setAnswered('yes')}>
              Yes
            </button>
            <button
              type="button"
              data-track={`Guide helpful: no — ${g.slug}`}
              className="rounded-full border border-grey px-3 py-1"
              onClick={() => {
                setAnswered('no');
                trackUsage('help_open', `Unhelpful guide: ${g.slug}`);
              }}
            >
              No
            </button>
          </p>
        )}
      </div>
    </>
  );
}
