/**
 * POST /api/auth/refresh
 * Body: { refresh_token: string }
 *
 * Exchanges a Supabase refresh token for a new session (access token + rotated
 * refresh token), so admins are not signed out every hour. Sits under /api/auth/,
 * so it is covered by the proxy's rate limiting. Errors are generic on purpose.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ValidationError, UnauthorizedError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

const refreshSchema = z.object({
  refresh_token: z.string().min(10, 'Refresh token is required'),
});

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const body = await request.json().catch(() => null);
    const parsed = refreshSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid refresh request', {
        refresh_token: 'Refresh token is required',
      });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: parsed.data.refresh_token,
    });

    if (error || !data.session) {
      throw new UnauthorizedError('Session expired — please sign in again');
    }

    return NextResponse.json(
      {
        token: data.session.access_token,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      },
      { headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
