/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 *
 * Authenticates against Supabase Auth and returns the session (JWT access
 * token + refresh token) for the client to store. This endpoint issues
 * tokens for BOTH admin users and charity-portal users — it's the same
 * Supabase Auth user pool for both (see charities.auth_user_id and
 * admin_users.id in the schema); it's the admin middleware and RLS
 * policies that decide what each token can subsequently do, not this
 * route.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ValidationError, UnauthorizedError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

const loginSchema = z.object({
  email: z.string().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid login request',
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.session) {
      // Supabase's own error message is intentionally not passed through —
      // it can reveal whether an email is registered. Keep this generic.
      throw new UnauthorizedError('Invalid email or password');
    }

    // Look up the admin profile (name/role) so the frontend gets the shape it
    // expects: { token, user: { id, email, name, role } }. Non-admin users
    // (e.g. future charity-portal logins) simply get name/role = null; the
    // proxy and RLS still decide what any token may do.
    let name: string | null = null;
    let role: string | null = null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey && data.user?.id) {
      const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: adminRow } = await admin
        .from('admin_users')
        .select('name, role, is_active, is_deleted')
        .eq('id', data.user.id)
        .maybeSingle();
      if (adminRow && adminRow.is_active && !adminRow.is_deleted) {
        name = (adminRow.name as string | null) ?? null;
        role = (adminRow.role as string | null) ?? null;
      }
    }

    return NextResponse.json(
      {
        token: data.session.access_token,
        user: { id: data.user?.id, email: data.user?.email, name, role },
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
