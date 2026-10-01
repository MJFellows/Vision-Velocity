/**
 * POST /api/auth/reset-password
 *
 * Completes an admin password reset started from a Supabase "Reset password"
 * email. Two link formats are accepted, so the email template can be changed
 * without breaking links already sitting in someone's inbox:
 *
 *   1. { token_hash, password }        — link built with {{ .TokenHash }}
 *                                        (preferred: no email needed)
 *   2. { email, code, password }       — link built with {{ .Token }}
 *                                        (the one-time code needs the email)
 *
 * How it works (fixed 2026-10-01):
 *   - verifyOtp() checks the one-time token with Supabase. On success Supabase
 *     returns the user (and a recovery session). The token is now USED — it
 *     cannot be verified a second time.
 *   - The password is then set with the service-role admin API,
 *     auth.admin.updateUserById(user.id, …). This needs no client session.
 *
 * Why not auth.updateUser()? That method reads the session the client has
 * stored. Server-side clients here are created with persistSession: false
 * and a fresh client has no stored session, so updateUser() throws
 * "Auth session missing!" without ever calling Supabase — which was the
 * production fault on 2026-10-01. Passing an Authorization header does not
 * help; auth methods ignore global headers.
 *
 * Security: the admin API is only reached after Supabase has verified the
 * token, and it only ever changes the password of the user the token belongs
 * to. The recovery session is revoked afterwards.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getSupabaseAdmin } from '@/lib/supabase';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const resetPasswordSchema = z.union([
  z.object({
    token_hash: z.string().min(1, 'Recovery link is incomplete'),
    password: passwordRule,
  }),
  z.object({
    email: z.string().trim().toLowerCase().email('Valid email required'),
    code: z.string().trim().min(1, 'Recovery code is required'),
    password: passwordRule,
  }),
]);

const LINK_USED_OR_EXPIRED =
  'This reset link has expired or has already been used. Please request a new password reset email and use the newest link.';

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const body = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(
        'Invalid password reset request',
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message])
        )
      );
    }

    const input = parsed.data;

    // Anon client, used only to verify the one-time token.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: verifyData, error: verifyError } =
      'token_hash' in input
        ? await supabase.auth.verifyOtp({ token_hash: input.token_hash, type: 'recovery' })
        : await supabase.auth.verifyOtp({ email: input.email, token: input.code, type: 'recovery' });

    const userId = verifyData?.user?.id;
    if (verifyError || !userId) {
      console.warn('[reset-password] verifyOtp failed', {
        code: (verifyError as { code?: string } | null)?.code,
        status: verifyError?.status,
      });
      throw new ValidationError(LINK_USED_OR_EXPIRED);
    }

    const admin = getSupabaseAdmin();
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password: input.password,
    });

    if (updateError) {
      console.error('[reset-password] updateUserById failed', {
        userId,
        message: updateError.message,
      });
      // The token has been consumed at this point, so a fresh email is needed.
      throw new ValidationError(
        `${updateError.message || 'The password could not be updated'}. Please request a new password reset email.`
      );
    }

    // Revoke the short-lived recovery session; the user signs in normally next.
    const accessToken = verifyData.session?.access_token;
    if (accessToken) {
      await admin.auth.admin.signOut(accessToken).catch(() => undefined);
    }

    console.info('[reset-password] password updated', { userId });

    return NextResponse.json(
      { success: true, message: 'Password reset successfully' },
      { headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
