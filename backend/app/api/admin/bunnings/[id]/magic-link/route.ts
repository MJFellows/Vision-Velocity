// POST /api/admin/bunnings/[id]/magic-link
// Admin-triggered: generates a one-time magic link for the store's
// Activities Officer to authenticate into the read-only AO portal.
// Actually emailing the link is deferred to Task 3.3 (email templates &
// notifications); for now this returns the token/URL so it can be sent
// manually or wired up once email sending exists.

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';

const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
  const adminUserId = request.headers.get('x-user-id');
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  const { id } = await params;

  try {
    const supabase = getSupabaseForRequest(request);

    const { data: store, error: storeError } = await supabase
      .from('bunnings_stores')
      .select('id, location, activities_officer_email, activities_officer_name, is_deleted')
      .eq('id', id)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store || store.is_deleted) throw new NotFoundError('Bunnings store not found');
    if (!store.activities_officer_email) {
      throw new ValidationError('Store has no Activities Officer email on file', {
        activities_officer_email: 'Add an AO email to this store before generating a link',
      });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    const { data: link, error: linkError } = await supabase
      .from('bunnings_ao_magic_links')
      .insert({
        token,
        bunnings_store_id: store.id,
        activities_officer_email: store.activities_officer_email,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (linkError) throw linkError;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const magicLinkUrl = `${appUrl}/bunnings/activities-officer/auth?token=${token}`;

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'generated_bunnings_ao_magic_link',
      description: `Generated AO magic link for "${store.location}" (${store.activities_officer_email})`,
      entityType: 'bunnings_stores',
      entityId: store.id,
      changes: { before: null, after: { magic_link_id: link.id, expires_at: link.expires_at } },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        data: {
          token,
          magicLinkUrl,
          activitiesOfficerEmail: store.activities_officer_email,
          expiresAt: expiresAt.toISOString(),
        },
      },
      { status: 201, headers: cors }
    );
  } catch (error) {
    if (!(error instanceof ValidationError) && !(error instanceof NotFoundError)) {
      await logAdminAction({
        adminUserId,
        userEmail: adminEmail,
        action: 'generate_bunnings_ao_magic_link_failed',
        entityType: 'bunnings_stores',
        entityId: id,
        ipAddress,
        userAgent,
        status: 'error',
        errorDetail: error instanceof Error ? error.message : String(error),
      });
    }
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
