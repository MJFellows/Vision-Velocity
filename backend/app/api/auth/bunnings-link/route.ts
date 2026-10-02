/**
 * POST /api/auth/bunnings-link { email }
 *
 * Public: an Activities Officer asks for a new sign-in link. If the address is
 * the Activities Officer email of a listed store, a one-time link is emailed
 * to it. The reply is the same either way, so the form cannot be used to find
 * out which addresses are on file. Rate limited by proxy.ts (/api/auth/*).
 */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { createAoLink } from '@/lib/bunnings-ao';

const schema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address') });
const GENERIC = 'If that address belongs to a Bunnings Activities Officer we work with, a sign-in link is on its way. Check your inbox (and junk folder) in a few minutes.';

export async function POST(request: Request) {
  try {
    const { email } = await parseBody(request, schema, 'Enter a valid email address');
    const { data: stores, error } = await getSupabaseAdmin()
      .from('bunnings_stores')
      .select('id, location, activities_officer_email, activities_officer_name')
      .ilike('activities_officer_email', email)
      .eq('is_deleted', false)
      .limit(3);
    if (error) throw error;
    for (const store of stores ?? []) {
      // Exact match only (ilike without wildcards, but guard against % or _ in the input).
      if ((store.activities_officer_email ?? '').toLowerCase() !== email) continue;
      const r = await createAoLink(store, { send: true });
      if (!r.emailed) console.warn('[bunnings-link] email failed', r.emailError);
    }
    return json(request, { data: { message: GENERIC } });
  } catch (error) {
    return errorResponse(request, error);
  }
}
