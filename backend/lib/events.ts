/** Shared constants and schemas for the Events feature (events, event_suppliers, event_packages). */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

export const EVENT_STATUSES = ['requested', 'planned', 'confirmed', 'completed', 'cancelled'] as const;
export const EVENT_SUPPLIER_STATUSES = ['possible', 'confirmed', 'declined'] as const;
export const EVENT_COVER_TYPES = ['inside', 'outside_covered', 'outside_uncovered'] as const;

/** PostgREST select for an event with its Bunnings store, charity, linked supplier stores and packages used. */
export const EVENT_SELECT = `*, bunnings_stores(id, location, suburb, state, postcode), charities(id, name, postcode), event_suppliers(id, supplier_id, status, notes, suppliers(id, supplier_chain, store_name, suburb, state, postcode)), event_packages(id, package_id, quantity, packages(id, name, base_price_aud))` as const;

const count = z.number().int('Whole numbers only').min(0, 'Cannot be negative').max(1_000_000).nullable();

/** Optional event detail fields (added 2026-10-01). Each may be null to clear it. */
export const eventDetailFields = {
  event_name: z.string().trim().max(200).nullable(),
  estimated_hotdogs: count,
  estimated_staff: count,
  number_of_shifts: count,
  cover_type: z.enum(EVENT_COVER_TYPES).nullable(),
  actual_hotdogs_sold: count,
  number_of_sales: count,
  sales_value_aud: z.number().min(0, 'Cannot be negative').max(10_000_000).multipleOf(0.01, 'Use dollars and cents').nullable(),
};

/** Packages used at an event: the full list replaces whatever was recorded before. */
export const eventPackagesSchema = z
  .array(z.object({ package_id: z.string().uuid(), quantity: z.number().int().min(1).max(100_000) }))
  .max(50)
  .refine((list) => new Set(list.map((p) => p.package_id)).size === list.length, 'Each package can be listed once');

export type EventPackageInput = z.infer<typeof eventPackagesSchema>;

/**
 * Replaces an event's packages with `packages`. Runs as the calling admin (RLS).
 * Not a single transaction: if the insert fails after the delete, the error is
 * raised and the caller reports it; re-saving the event restores the list.
 */
export async function replaceEventPackages(
  supabase: SupabaseClient,
  eventId: string,
  packages: EventPackageInput
): Promise<void> {
  const { error: deleteError } = await supabase.from('event_packages').delete().eq('event_id', eventId);
  if (deleteError) throw deleteError;
  if (packages.length === 0) return;
  const { error: insertError } = await supabase
    .from('event_packages')
    .insert(packages.map((p) => ({ event_id: eventId, package_id: p.package_id, quantity: p.quantity })));
  if (insertError) throw insertError;
}
