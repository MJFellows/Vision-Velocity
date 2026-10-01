/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Starts an admin password reset from the "Forgot password?" link on
 * /admin/login. If the address belongs to an active admin, Supabase sends its
 * "Reset password" email (template links to /admin/reset-password with a
 * token_hash; see reset-password/route.ts). The response is identical whether
 * or not the address is an admin, so the endpoint cannot be used to find out
 * which addresses have accounts.
 *
 * Abuse limits: per-IP rate limiting in proxy.ts (/api/auth/*), plus
 * Supabase's own limit of one recovery email per address per 60 seconds.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getSupabaseAdmin } from '@/lib/supabase';

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
});

const GENERIC_MESSAGE =
  'If that address belongs to an admin account, a password reset email is on its way. The link works once and expires after one hour.';

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid request',
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message])
        )
      );
    }
    const { email } = parsed.data;

    // Only active admins get an email; everyone gets the same response.
    const { data: adminRow, error: lookupError } = await getSupabaseAdmin()
      .from('admin_users')
      .select('id, is_active, is_deleted')
      .ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`)) // case-insensitive exact match
      .maybeSingle();

    if (lookupError) {
      console.error('[forgot-password] admin lookup failed', { message: lookupError.message });
    } else if (adminRow && adminRow.is_active && !adminRow.is_deleted) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(email);
      if (sendError) {
        // Typically Supabase's 60-second per-address limit. Logged, not revealed.
        console.warn('[forgot-password] resetPasswordForEmail failed', {
          status: sendError.status,
          message: sendError.message,
        });
      } else {
        console.info('[forgot-password] reset email requested', { adminId: adminRow.id });
      }
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
