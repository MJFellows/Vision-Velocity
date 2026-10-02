/**
 * POST /api/auth/verify-link { token_hash }
 *
 * Completes a charity one-time sign-in link: verifies the token with Supabase
 * and, if the person belongs to an active charity, returns a session in the
 * same shape as /api/auth/login.
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ForbiddenError, ValidationError } from '@/utils/errors';

const schema = z.object({ token_hash: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const { token_hash } = await parseBody(request, schema);
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anon.auth.verifyOtp({ token_hash, type: 'magiclink' });
    if (error || !data.session || !data.user) {
      throw new ValidationError('This sign-in link has expired or has already been used. Please request a new one.');
    }
    const admin = getSupabaseAdmin();
    const { data: row } = await admin.from('charity_users').select('id, name, is_active').eq('auth_user_id', data.user.id).maybeSingle();
    if (!row || !row.is_active) {
      await admin.auth.admin.signOut(data.session.access_token).catch(() => undefined);
      throw new ForbiddenError('This sign-in is not linked to an active charity');
    }
    await admin.from('charity_users').update({ last_sign_in_at: new Date().toISOString() }).eq('id', row.id);
    return json(request, {
      token: data.session.access_token,
      user: { id: data.user.id, email: data.user.email, name: row.name ?? null, role: null },
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}
