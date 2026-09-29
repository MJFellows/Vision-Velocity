/**
 * GET  /api/admin/interactions?charity_id=&page=&pageSize=
 * POST /api/admin/interactions
 *
 * customer_interactions is the CRM journal for a charity (calls, emails,
 * SMS, meetings, free-text notes). Added alongside Task 2.2 (mobile admin
 * dashboard) specifically to back the charity detail page's "Notes" tab —
 * GET /api/admin/charities/[id] already embeds the 20 most recent
 * interactions inline, but there was no way to create one from the app.
 * This is a small piece of Task 2.3's planned scope (charity CRUD API),
 * pulled forward because 2.2 needed it to be functional rather than a
 * static placeholder.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';

const createInteractionSchema = z.object({
  charity_id: z.string().uuid(),
  interaction_type: z.enum(['phone_call', 'email', 'sms', 'meeting', 'note']),
  direction: z.enum(['inbound', 'outbound']),
  subject: z.string().optional().nullable(),
  details: z.string().optional().nullable(),
  outcome: z.enum(['inquiry', 'order_placed', 'issue_resolved', 'follow_up_needed', 'no_outcome']).optional().nullable(),
  next_action: z.string().optional().nullable(),
  next_action_date: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const url = new URL(request.url);
    const charityId = url.searchParams.get('charity_id');
    if (!charityId) {
      throw new ValidationError('charity_id query parameter is required');
    }
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '25')));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = getSupabaseForRequest(request);
    const { data, error, count } = await supabase
      .from('customer_interactions')
      .select('*', { count: 'exact' })
      .eq('charity_id', charityId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json(
      { data, pagination: { page, pageSize, total: count ?? 0 } },
      { headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
  const adminUserId = request.headers.get('x-user-id');
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  let requestBody: unknown = null;

  try {
    requestBody = await request.json().catch(() => null);
    const parsed = createInteractionSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid interaction data',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }

    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase
      .from('customer_interactions')
      .insert({ ...parsed.data, created_by: adminEmail })
      .select()
      .single();

    if (error) throw error;

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'logged_customer_interaction',
      description: `Logged ${parsed.data.interaction_type} for charity ${parsed.data.charity_id}`,
      entityType: 'customer_interactions',
      entityId: data.id,
      changes: { before: null, after: parsed.data },
      requestParams: parsed.data,
      recordIds: [data.id],
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data }, { status: 201, headers: cors });
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      await logAdminAction({
        adminUserId,
        userEmail: adminEmail,
        action: 'log_customer_interaction_failed',
        entityType: 'customer_interactions',
        requestParams: requestBody as Record<string, unknown> | null,
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
