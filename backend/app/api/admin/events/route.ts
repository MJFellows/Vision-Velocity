/**
 * GET  /api/admin/events?status=&charity_id=&bunnings_store_id=&from=&to=&page=&pageSize=
 * POST /api/admin/events
 *
 * An event is a date, a Bunnings store and a charity, with any number of supplier
 * stores linked through event_suppliers (see ./[id]/suppliers). Admin-only; all
 * queries run as the calling admin's JWT so Postgres RLS (events_admin_all) is the
 * real authority.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';
import { EVENT_SELECT, EVENT_STATUSES } from '@/lib/events';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const createEventSchema = z.object({
  event_date: isoDate,
  bunnings_store_id: z.string().uuid(),
  charity_id: z.string().uuid(),
  status: z.enum(EVENT_STATUSES).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const charityId = url.searchParams.get('charity_id');
    const storeId = url.searchParams.get('bunnings_store_id');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '25') || 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (status && !(EVENT_STATUSES as readonly string[]).includes(status)) throw new ValidationError('Invalid status');
    for (const [name, v] of [['charity_id', charityId], ['bunnings_store_id', storeId]] as const) {
      if (v && !z.string().uuid().safeParse(v).success) throw new ValidationError(`Invalid ${name}`);
    }
    for (const [name, v] of [['from', fromDate], ['to', toDate]] as const) {
      if (v && !isoDate.safeParse(v).success) throw new ValidationError(`${name} must be YYYY-MM-DD`);
    }

    const supabase = getSupabaseForRequest(request);
    let query = supabase
      .from('events')
      .select(EVENT_SELECT, { count: 'exact' })
      .eq('is_deleted', false)
      .order('event_date', { ascending: true })
      .range(from, to);

    if (status) query = query.eq('status', status);
    if (charityId) query = query.eq('charity_id', charityId);
    if (storeId) query = query.eq('bunnings_store_id', storeId);
    if (fromDate) query = query.gte('event_date', fromDate);
    if (toDate) query = query.lte('event_date', toDate);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? 0;
    return NextResponse.json(
      { data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } },
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
    const parsed = createEventSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid event data',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }

    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase.from('events').insert(parsed.data).select(EVENT_SELECT).single();
    if (error) {
      // Foreign-key violation: the Bunnings store or charity does not exist.
      if (error.code === '23503') throw new ValidationError('The chosen Bunnings store or charity does not exist');
      throw error;
    }

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'created_event',
      description: `Created event on ${data.event_date}`,
      entityType: 'events',
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
        action: 'create_event_failed',
        entityType: 'events',
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
