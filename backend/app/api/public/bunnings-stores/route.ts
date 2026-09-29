/**
 * GET /api/public/bunnings-stores
 *
 * Unauthenticated, read-only list of active Bunnings store locations, for
 * populating the "preferred location" dropdown on the public charity
 * signup form (Task 3.1).
 *
 * Uses the service-role client deliberately, not getSupabaseForRequest():
 * unlike `packages`, `bunnings_stores` has no public-read RLS policy at
 * all (only bunnings_stores_admin_all for authenticated admins — verified
 * against the live schema), so an anon-scoped client would silently
 * return zero rows rather than erroring, breaking the signup dropdown
 * with no visible failure. The right long-term fix is a public SELECT
 * policy limited to (id, location) for active, non-deleted stores; until
 * that's added to the schema, this route only ever selects those two
 * columns and nothing else, keeping the exposure equivalent to what such
 * a policy would allow anyway.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('bunnings_stores')
      .select('id, location')
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('location', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
