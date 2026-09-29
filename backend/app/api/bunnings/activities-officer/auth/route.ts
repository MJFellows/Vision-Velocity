// GET /api/bunnings/activities-officer/auth?token=...
// Public route: verifies a one-time magic link (sent to a Bunnings
// Activities Officer) and issues a short-lived AO session token. There is
// no Supabase Auth session for an AO — they never sign up — so this
// deliberately uses the service-role client rather than
// getSupabaseForRequest(): an anonymous caller has no JWT for RLS to key
// off, and this table's only RLS policy is admin-only.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ValidationError, InternalServerError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

const authSchema = z.object({
  token: z.string().uuid('Invalid token format'),
});

const AO_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new InternalServerError('Missing JWT_SECRET — cannot issue AO session token');
  }
  return new TextEncoder().encode(secret);
}

export async function GET(request: NextRequest) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const token = request.nextUrl.searchParams.get('token');

    const parsed = authSchema.safeParse({ token });
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid or missing token',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: link, error: linkError } = await supabase
      .from('bunnings_ao_magic_links')
      .select('id, token, bunnings_store_id, activities_officer_email, expires_at, used_at')
      .eq('token', parsed.data.token)
      .maybeSingle();

    if (linkError) throw linkError;
    if (!link) {
      throw new ValidationError('Magic link not found', { token: 'This link does not exist' });
    }
    if (link.used_at) {
      throw new ValidationError('Magic link already used', {
        token: 'This link has already been used. Ask Vision Velocity for a new one.',
      });
    }
    if (new Date(link.expires_at) < new Date()) {
      throw new ValidationError('Magic link expired', {
        token: 'This link has expired. Ask Vision Velocity for a new one.',
      });
    }

    const { data: store, error: storeError } = await supabase
      .from('bunnings_stores')
      .select('id, location, activities_officer_name')
      .eq('id', link.bunnings_store_id)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store) throw new InternalServerError('Store for this magic link no longer exists');

    const { error: updateError } = await supabase
      .from('bunnings_ao_magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', link.id);
    if (updateError) throw updateError;

    const sessionToken = await new SignJWT({
      type: 'bunnings_ao',
      bunningsStoreId: store.id,
      aoEmail: link.activities_officer_email,
      aoName: store.activities_officer_name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${AO_SESSION_TTL_SECONDS}s`)
      .sign(getJwtSecret());

    return NextResponse.json(
      {
        data: {
          sessionToken,
          storeId: store.id,
          storeName: store.location,
          aoName: store.activities_officer_name,
          expiresIn: AO_SESSION_TTL_SECONDS,
        },
      },
      { status: 200, headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
