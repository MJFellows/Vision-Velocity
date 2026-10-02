'use client';

/** Tick-list from planning to results, computed from the event record. */

import type { FundraisingEvent } from '@/lib/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

export function EventChecklist({ event }: { event: FundraisingEvent }) {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isPast = event.event_date <= todayIso;
  const items: { label: string; done: boolean; hint?: string }[] = [
    { label: 'Charity and Bunnings store chosen', done: Boolean(event.charity_id && event.bunnings_store_id) },
    { label: 'Event confirmed', done: ['confirmed', 'completed'].includes(event.status), hint: event.status === 'requested' ? 'Press Confirm request when agreed' : 'Set the status to Confirmed' },
    { label: 'At least one supplier store confirmed', done: event.event_suppliers.some((s) => s.status === 'confirmed'), hint: 'Add suppliers below' },
    { label: 'Packages recorded', done: event.event_packages.length > 0, hint: 'Edit the event to add packages' },
    { label: 'Staff and shifts entered', done: event.estimated_staff != null && event.number_of_shifts != null, hint: 'Edit the event' },
    {
      label: 'Results entered',
      done: event.actual_hotdogs_sold != null || event.sales_value_aud != null,
      hint: isPast ? 'Edit the event and fill in Results' : 'After the event',
    },
  ];
  const done = items.filter((i) => i.done).length;
  return (
    <Card className="mb-6 max-w-2xl">
      <CardHeader>
        <CardTitle>
          Checklist <span className="ml-2 text-sm font-normal text-charcoal/60">{done} of {items.length} done</span>
        </CardTitle>
      </CardHeader>
      <ul className="space-y-1.5 text-sm">
        {items.map((i) => (
          <li key={i.label} className="flex items-start gap-2">
            <span aria-hidden className={i.done ? 'text-green-600' : 'text-charcoal/30'}>
              {i.done ? '✓' : '○'}
            </span>
            <span className={i.done ? 'text-charcoal' : 'text-charcoal/80'}>
              {i.label}
              {!i.done && i.hint && <span className="ml-1 text-xs text-charcoal/50">— {i.hint}</span>}
            </span>
            <span className="sr-only">{i.done ? 'done' : 'not done'}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
