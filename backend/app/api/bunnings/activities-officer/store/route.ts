/**
 * PATCH /api/bunnings/activities-officer/store { activities_officer_name, activities_officer_email, activities_officer_phone }
 * The AO corrects their own contact details for their store. The founders are emailed about the change.
 */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireAoSession } from '@/lib/bunnings-ao';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { adminNotificationRecipients, emailLayout, escapeHtml, sendMail } from '@/lib/mailer';
import { frontendUrl } from '@/lib/app-url';
import { getClientIp } from '@/utils/rateLimit';
import { NotFoundError } from '@/utils/errors';

const schema = z.object({
  activities_officer_name: z.string().trim().min(1, 'Please enter your name').max(120),
  activities_officer_email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  activities_officer_phone: z.string().trim().max(40).optional().nullable(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireAoSession(request);
    const body = await parseBody(request, schema, 'Please check your details');
    const admin = getSupabaseAdmin();
    const { data: before, error: beforeError } = await admin
      .from('bunnings_stores')
      .select('id, location, activities_officer_name, activities_officer_email, activities_officer_phone')
      .eq('id', session.bunningsStoreId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('This store is no longer listed');

    const update = {
      activities_officer_name: body.activities_officer_name,
      activities_officer_email: body.activities_officer_email,
      activities_officer_phone: body.activities_officer_phone || null,
    };
    const { data, error } = await admin
      .from('bunnings_stores')
      .update(update)
      .eq('id', session.bunningsStoreId)
      .select('id, location, activities_officer_name, activities_officer_email, activities_officer_phone')
      .single();
    if (error) throw error;

    const changes = diffChanges(before, data);
    await logAdminAction({
      adminUserId: null,
      userEmail: `${session.aoEmail} (Bunnings Activities Officer)`,
      action: 'bunnings_ao_updated_contact',
      description: `Activities Officer updated contact details for ${before.location}`,
      entityType: 'bunnings_stores',
      entityId: session.bunningsStoreId,
      changes,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    });

    try {
      const rows = (['activities_officer_name', 'activities_officer_email', 'activities_officer_phone'] as const)
        .filter((k) => (before[k] ?? '') !== (data[k] ?? ''))
        .map((k) => `<li>${escapeHtml(k.replace('activities_officer_', '').replace('_', ' '))}: ${escapeHtml(before[k] ?? '—')} → <strong>${escapeHtml(data[k] ?? '—')}</strong></li>`);
      if (rows.length > 0) {
        await sendMail({
          to: adminNotificationRecipients(),
          subject: `Bunnings ${before.location}: Activities Officer details updated`,
          html: emailLayout(
            'Activities Officer details updated',
            `<p>The Activities Officer for Bunnings ${escapeHtml(before.location)} updated their details:</p><ul>${rows.join('')}</ul><p><a href="${escapeHtml(frontendUrl())}/admin/bunnings/${data.id}">Open the store</a></p>`
          ),
          text: `The Activities Officer for Bunnings ${before.location} updated their details. ${frontendUrl()}/admin/bunnings/${data.id}`,
        });
      }
    } catch (e) {
      console.warn('[ao-store] notification not sent', e instanceof Error ? e.message : e);
    }

    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}
