/**
 * GET /api/public/landing-page-data
 *
 * Unauthenticated, rate-limited (see proxy.ts) endpoint feeding the
 * public marketing site. Uses the anon-key client with no Authorization
 * header, so it runs as Postgres's `anon` role — only packages_public_select
 * (is_active AND NOT is_deleted) is readable this way; everything else in
 * the schema is admin- or self-scoped and correctly invisible here. Extend
 * this route's selected fields as the landing page (Task 3.1 in the build
 * plan) needs more public data, but don't reach for the service-role
 * client to do it — if RLS is blocking something this route needs, that's
 * a sign a new public-read policy belongs in the schema, not that this
 * route should bypass RLS.
 */

import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const supabase = getSupabaseForRequest(request);
    const { data: packages, error } = await supabase
      .from('packages')
      .select('id, name, description, base_price_aud, items')
      .eq('is_active', true)
      .order('base_price_aud', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: { packages } }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
