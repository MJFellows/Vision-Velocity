/**
 * POST /api/admin/bunnings/:id/magic-link { send?: boolean }
 *
 * Creates a one-time sign-in link for the store's Activities Officer (7 days).
 * With send: true (the default from the store page) the link is emailed to the
 * Activities Officer; the link is also returned so a founder can copy it.
 */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse } from '@/lib/route-helpers';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';
import { createAoLink } from '@/lib/bunnings-ao';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const schema = z.object({ send: z.boolean().optional() }).nullable();

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid store');
    const parsed = schema.safeParse(await request.json().catch(() => null));
    const send = parsed.success ? parsed.data?.send === true : false;

    const { data: store, error } = await getSupabaseAdmin()
      .from('bunnings_stores')
      .select('id, location, activities_officer_email, activities_officer_name, is_deleted')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!store || store.is_deleted) throw new NotFoundError('Bunnings store not found');

    const link = await createAoLink(store, { send });
    await logAdminAction({
      adminUserId: request.headers.get('x-user-id'),
      userEmail: request.headers.get('x-user-email') ?? 'unknown',
      action: send ? (link.emailed ? 'emailed_bunnings_ao_link' : 'email_bunnings_ao_link_failed') : 'generated_bunnings_ao_magic_link',
      description: `Activities Officer link for "${store.location}" (${store.activities_officer_email})`,
      entityType: 'bunnings_stores',
      entityId: store.id,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
      status: send && !link.emailed ? 'error' : 'success',
      errorDetail: link.emailError ?? null,
    });

    return json(
      request,
      {
        data: {
          magicLinkUrl: link.url,
          activitiesOfficerEmail: store.activities_officer_email,
          expiresAt: link.expiresAt,
          emailed: link.emailed,
          emailError: link.emailError,
        },
      },
      201
    );
  } catch (error) {
    return errorResponse(request, error);
  }
}
