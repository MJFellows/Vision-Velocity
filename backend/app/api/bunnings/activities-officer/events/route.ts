/**
 * GET /api/bunnings/activities-officer/events
 *
 * For a signed-in Activities Officer: the store's details and the events at
 * that store — upcoming (today onwards) and the last six months. Requests not
 * yet arranged by Vision Velocity are left out. No prices, internal notes or
 * supplier details.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse } from '@/lib/route-helpers';
import { requireAoSession, AO_EVENT_COLUMNS } from '@/lib/bunnings-ao';
import { brisbaneToday } from '@/lib/charity-data';
import { NotFoundError } from '@/utils/errors';

export async function GET(request: Request) {
  try {
    const session = await requireAoSession(request);
    const admin = getSupabaseAdmin();
    const today = brisbaneToday();
    const sixMonthsAgo = new Date(Date.now() - 183 * 86_400_000).toISOString().slice(0, 10);

    const [store, upcoming, past] = await Promise.all([
      admin
        .from('bunnings_stores')
        .select('id, location, store_address, suburb, state, postcode, store_phone, activities_officer_name, activities_officer_email, activities_officer_phone')
        .eq('id', session.bunningsStoreId)
        .eq('is_deleted', false)
        .maybeSingle(),
      admin
        .from('events')
        .select(AO_EVENT_COLUMNS)
        .eq('bunnings_store_id', session.bunningsStoreId)
        .eq('is_deleted', false)
        .neq('status', 'requested')
        .gte('event_date', today)
        .order('event_date'),
      admin
        .from('events')
        .select(AO_EVENT_COLUMNS)
        .eq('bunnings_store_id', session.bunningsStoreId)
        .eq('is_deleted', false)
        .neq('status', 'requested')
        .lt('event_date', today)
        .gte('event_date', sixMonthsAgo)
        .order('event_date', { ascending: false }),
    ]);
    for (const r of [store, upcoming, past]) if (r.error) throw r.error;
    if (!store.data) throw new NotFoundError('This store is no longer listed');

    return json(request, { data: { store: store.data, upcoming: upcoming.data ?? [], past: past.data ?? [], today } });
  } catch (error) {
    return errorResponse(request, error);
  }
}
