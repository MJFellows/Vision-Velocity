/**
 * GET /api/bunnings/activities-officer/auth?token=…
 *
 * Public: checks a one-time link emailed to a Bunnings Activities Officer,
 * marks it used and returns a 7-day AO session token. AOs have no Supabase
 * Auth account, so this uses the service-role client (the links table is
 * admin-only under row-level security). See lib/bunnings-ao.ts.
 */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse } from '@/lib/route-helpers';
import { ValidationError } from '@/utils/errors';
import { AO_SESSION_TTL_SECONDS, signAoSession } from '@/lib/bunnings-ao';

const USED_OR_EXPIRED = 'This link has already been used or has expired. Request a new link below.';

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    if (!z.string().uuid().safeParse(token).success) throw new ValidationError('This link is incomplete. Request a new link below.');

    const admin = getSupabaseAdmin();
    const { data: link, error } = await admin
      .from('bunnings_ao_magic_links')
      .select('id, bunnings_store_id, activities_officer_email, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    if (!link || link.used_at || new Date(link.expires_at) < new Date()) throw new ValidationError(USED_OR_EXPIRED);

    // Mark used only if nobody else has (one-time link).
    const { data: claimed, error: claimError } = await admin
      .from('bunnings_ao_magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', link.id)
      .is('used_at', null)
      .select('id');
    if (claimError) throw claimError;
    if (!claimed || claimed.length === 0) throw new ValidationError(USED_OR_EXPIRED);

    const { data: store, error: storeError } = await admin
      .from('bunnings_stores')
      .select('id, location, activities_officer_name, is_deleted')
      .eq('id', link.bunnings_store_id)
      .maybeSingle();
    if (storeError) throw storeError;
    if (!store || store.is_deleted) throw new ValidationError('This store is no longer listed. Please contact Vision Velocity.');

    const sessionToken = await signAoSession({
      bunningsStoreId: store.id,
      aoEmail: link.activities_officer_email,
      aoName: store.activities_officer_name,
    });
    return json(request, {
      data: { sessionToken, storeId: store.id, storeName: store.location, aoName: store.activities_officer_name, expiresIn: AO_SESSION_TTL_SECONDS },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}
