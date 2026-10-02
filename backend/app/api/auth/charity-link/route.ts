/**
 * POST /api/auth/charity-link { email, purpose: 'sign_in' | 'reset' }
 *
 * Emails a charity user a one-time sign-in link or a password reset link.
 * Always answers the same way so it cannot reveal which addresses have access.
 * Rate limited by proxy.ts (/api/auth/*).
 */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { sendCharitySignInLink } from '@/lib/charity-auth';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  purpose: z.enum(['sign_in', 'reset']).default('sign_in'),
});

export async function POST(request: Request) {
  try {
    const { email, purpose } = await parseBody(request, schema);
    try {
      await sendCharitySignInLink(email, purpose ?? 'sign_in');
    } catch (e) {
      console.warn('[charity-link] not sent', e instanceof Error ? e.message : e);
    }
    return json(request, {
      success: true,
      message: 'If that address has access to a charity account, an email is on its way. The link works once and expires after one hour.',
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}
