/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <access_token>
 *
 * Revokes the given session server-side via the Supabase Auth admin API
 * (requires the service-role client — see lib/supabase.ts). The caller is
 * still responsible for discarding the token from wherever it stored it —
 * this endpoint only guarantees the token stops being valid on the server.
 */

import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getSupabaseAdmin, getBearerToken } from '@/lib/supabase';

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const token = getBearerToken(request);

    if (token) {
      const supabaseAdmin = getSupabaseAdmin();
      // Revokes this specific session's refresh token server-side. If the
      // token is already invalid/expired, treat that as an idempotent
      // success too — the caller's intent (be logged out) is satisfied
      // either way.
      const { error } = await supabaseAdmin.auth.admin.signOut(token, 'local');
      if (error) {
        console.warn('[auth/logout] signOut returned an error (treated as idempotent):', error.message);
      }
    }

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
