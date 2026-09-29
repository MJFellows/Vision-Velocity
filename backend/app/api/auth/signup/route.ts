/**
 * POST /api/auth/signup
 * Body: { email: string, password: string }
 *
 * Creates a new Supabase Auth user. This is intended as the charity-portal
 * login path (an admin account for Rita/Natalie should be provisioned
 * directly in Supabase, not through a public endpoint).
 *
 * IMPORTANT — not yet wired up to anything: the public charity signup flow
 * built for Task 3.1 (POST /api/public/charities/signup) does NOT call this
 * endpoint and does NOT set charities.auth_user_id. It creates a `charities`
 * row directly via the service-role client, with no Supabase Auth account
 * attached. That means charities_self_select/charities_self_update RLS
 * (which key off auth_user_id) currently has no charity that can ever
 * satisfy them, and the placeholder /charity/profile and /charity/my-events
 * pages have no real login path to reach. Building that link — whether by
 * having the signup flow call this endpoint, or some other design — is
 * unstarted work, not a bug in either endpoint individually. See
 * claude/BUILD_STATUS.md.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ValidationError, ConflictError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

const signupSchema = z.object({
  email: z.string().email('A valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const body = await request.json().catch(() => null);
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid signup request',
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])
        )
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      if (error.status === 422 || /already registered/i.test(error.message)) {
        throw new ConflictError('An account with this email already exists');
      }
      throw new ValidationError(error.message);
    }

    return NextResponse.json(
      {
        user: { id: data.user?.id, email: data.user?.email },
        // If Supabase Auth has email confirmation enabled, session will be
        // null here until the user confirms — the client should handle
        // both cases.
        session: data.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
            }
          : null,
        confirmationRequired: !data.session,
      },
      { status: 201, headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
