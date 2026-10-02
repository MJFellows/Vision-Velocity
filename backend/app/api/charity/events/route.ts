/**
 * GET  /api/charity/events   the charity's own events (newest first)
 * POST /api/charity/events   request an event: { event_date, bunnings_store_id, event_name?, alternative_dates?, message? }
 *                            Created with status "requested"; a founder confirms it. The founders are emailed.
 */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CHARITY_EVENT_COLUMNS, brisbaneToday } from '@/lib/charity-data';
import { ValidationError } from '@/utils/errors';
import { adminNotificationRecipients, emailLayout, escapeHtml, sendMail } from '@/lib/mailer';
import { frontendUrl } from '@/lib/app-url';
import { longDate } from '@/lib/documents';
import { logAdminAction } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';

const requestSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  bunnings_store_id: z.string().uuid('Choose a Bunnings store'),
  event_name: z.string().trim().max(200).optional().nullable(),
  alternative_dates: z.string().trim().max(300).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const caller = await requireCharityCaller(request);
    const { data, error } = await getSupabaseAdmin()
      .from('events')
      .select(CHARITY_EVENT_COLUMNS)
      .eq('charity_id', caller.charityId)
      .eq('is_deleted', false)
      .order('event_date', { ascending: false })
      .limit(200);
    if (error) throw error;
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const caller = await requireCharityCaller(request);
    const body = await parseBody(request, requestSchema, 'Invalid event request');
    if (body.event_date < brisbaneToday()) throw new ValidationError('Choose a date from today onwards');

    const notes = [
      `Requested by ${caller.name ?? caller.email} (${caller.email}) through the charity area.`,
      body.alternative_dates ? `Other dates that suit: ${body.alternative_dates}` : null,
      body.message ? `Message: ${body.message}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('events')
      .insert({
        event_date: body.event_date,
        bunnings_store_id: body.bunnings_store_id,
        charity_id: caller.charityId,
        event_name: body.event_name || null,
        status: 'requested',
        requested_by_charity: true,
        notes,
      })
      .select(CHARITY_EVENT_COLUMNS)
      .single();
    if (error) {
      if (error.code === '23503') throw new ValidationError('That Bunnings store was not found');
      throw error;
    }

    await logAdminAction({
      adminUserId: null,
      userEmail: `${caller.email} (charity)`,
      action: 'charity_requested_event',
      description: `${caller.charityName} requested an event on ${body.event_date}`,
      entityType: 'events',
      entityId: (data as unknown as { id: string }).id,
      recordIds: [(data as unknown as { id: string }).id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    });

    const store = (data as unknown as { bunnings_stores: { location: string } | null }).bunnings_stores?.location ?? 'Bunnings';
    const link = `${frontendUrl()}/admin/events/${(data as unknown as { id: string }).id}`;
    try {
      await sendMail({
        to: adminNotificationRecipients(),
        replyTo: caller.email,
        subject: `Event request: ${caller.charityName}, ${longDate(body.event_date)}`,
        html: emailLayout(
          'New event request from a charity',
          `<p><strong>${escapeHtml(caller.charityName)}</strong> has asked for an event at <strong>${escapeHtml(store)}</strong> on <strong>${escapeHtml(longDate(body.event_date))}</strong>.</p>
<p style="white-space:pre-wrap">${escapeHtml(notes)}</p>
<p><a href="${link}">Open the event to confirm it</a></p>`
        ),
        text: `${caller.charityName} has asked for an event at ${store} on ${longDate(body.event_date)}.\n\n${notes}\n\nOpen: ${link}`,
      });
    } catch (e) {
      console.warn('[charity event request] notification not sent', e instanceof Error ? e.message : e);
    }
    return json(request, { data }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}
