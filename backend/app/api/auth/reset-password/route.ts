/**
 * POST /api/auth/reset-password
 * Body: { code: string, newPassword: string }
 *
 * Handles password reset using Supabase's recovery token from password reset emails.
 * The recovery token comes from the email link with type=recovery&code=<token>.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ValidationError, BadRequestError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

const resetPasswordSchema = z.object({
  code: z.string().min(1, 'Recovery code is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const body = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid password reset request',
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])
        )
      );
    }

    const { code, newPassword } = parsed.data;

    // Create a Supabase client without a session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // First, verify the recovery code by exchanging it for a session
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: '', // Recovery tokens don't require email
      token: code,
      type: 'recovery',
    });

    if (verifyError || !verifyData.session) {
      throw new BadRequestError('Invalid or expired recovery token. Please request a new password reset.');
    }

    // Now update the password using the session from the recovery token
    const { error: updateError } = await supabase.auth.updateUser(
      { password: newPassword },
      { headers: { Authorization: `Bearer ${verifyData.session.access_token}` } }
    );

    if (updateError) {
      throw new BadRequestError(updateError.message || 'Failed to reset password');
    }

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
