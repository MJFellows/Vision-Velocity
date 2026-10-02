'use client';

/** The "?" button on every page: opens a side panel explaining the page, with links to full guides. */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { guide, helpForPath } from '@/lib/help-content';
import { trackUsage } from '@/lib/usage';

export function HelpPanel({ helpHome }: { helpHome: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const help = helpForPath(pathname);

  return (
    <>
      <button
        type="button"
        data-track="Page help"
        aria-label="Help for this page"
        onClick={() => {
          setOpen(true);
          trackUsage('help_open');
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-grey bg-white text-base font-bold text-navy shadow-sm hover:bg-grey/40 focus-ring"
      >
        ?
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-label="Help"
            className="h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-navy">{help?.title ?? 'Help'}</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-charcoal/70 underline" aria-label="Close help">
                Close
              </button>
            </div>
            {help ? (
              <>
                <p className="mb-4 text-sm text-charcoal/80">{help.purpose}</p>
                <h3 className="mb-2 text-sm font-semibold text-navy">Things you can do here</h3>
                <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-charcoal/80">
                  {help.tasks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {help.guides.length > 0 && (
                  <>
                    <h3 className="mb-2 text-sm font-semibold text-navy">Step-by-step guides</h3>
                    <ul className="mb-6 space-y-1 text-sm">
                      {help.guides.map((slug) => {
                        const g = guide(slug);
                        return g ? (
                          <li key={slug}>
                            <Link href={`${helpHome}/${slug}`} className="text-accent underline" onClick={() => setOpen(false)}>
                              {g.title}
                            </Link>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <p className="mb-6 text-sm text-charcoal/80">There is no specific help for this page yet.</p>
            )}
            <Link href={helpHome} className="text-sm font-medium text-accent underline" onClick={() => setOpen(false)}>
              Open the Help Centre
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
