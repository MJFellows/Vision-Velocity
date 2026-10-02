/** PATCH /api/charity/events/:id/results — the charity enters its results once the event date has arrived. */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CHARITY_EVENT_COLUMNS, brisbaneToday } from '@/lib/charity-data';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';

const count = z.number().int('Whole numbers only').min(0).max(1_000_000).nullable();
const schema = z.object({
  actual_hotdogs_sold: count,
  number_of_sales: count,
  sales_value_aud: z.number().min(0).max(10_000_000).multipleOf(0.01, 'Use dollars and cents').nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const caller = await requireCharityCaller(request);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event');
    const body = await parseBody(request, schema, 'Invalid results');
    const admin = getSupabaseAdmin();
    const { data: event, error: evError } = await admin
      .from('events')
      .select('id, event_date, status, actual_hotdogs_sold, number_of_sales, sales_value_aud')
      .eq('id', id)
      .eq('charity_id', caller.charityId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (evError) throw evError;
    if (!event) throw new NotFoundError('Event not found');
    if (event.event_date > brisbaneToday()) throw new ValidationError('Results can be entered on or after the event day');
    if (['requested', 'cancelled'].includes(event.status as string)) throw new ValidationError('Results can only be entered for events that went ahead');

    const { data, error } = await admin.from('events').update(body).eq('id', id).select(CHARITY_EVENT_COLUMNS).single();
    if (error) throw error;
    await logAdminAction({
      adminUserId: null,
      userEmail: `${caller.email} (charity)`,
      action: 'charity_entered_results',
      description: `${caller.charityName} entered results for ${event.event_date}`,
      entityType: 'events',
      entityId: id,
      changes: diffChanges(event, { ...event, ...body }),
      recordIds: [id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    });
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}
