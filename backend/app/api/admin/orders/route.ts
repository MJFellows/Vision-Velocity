import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';

const createOrderSchema = z.object({
  charity_id: z.string().uuid(),
  package_id: z.string().uuid(),
  event_date: z.string().refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date'),
  delivery_address: z.string().min(1),
  delivery_contact_name: z.string().optional().nullable(),
  delivery_phone: z.string().optional().nullable(),
  special_requests: z.string().optional().nullable(),
  total_price_aud: z.number().nonnegative(),
});

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    const charityId = url.searchParams.get('charity_id');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '25')));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = getSupabaseForRequest(request);
    let query = supabase
      .from('orders')
      .select('*, charities(name), packages(name)', { count: 'exact' })
      .eq('is_deleted', false)
      .order('event_date', { ascending: true })
      .range(from, to);

    if (status) query = query.eq('status', status);
    if (fromDate) query = query.gte('event_date', fromDate);
    if (toDate) query = query.lte('event_date', toDate);
    if (charityId) query = query.eq('charity_id', charityId);

    const { data, error, count } = await query;
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
    const parsed = createOrderSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid order data',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }

    if (new Date(parsed.data.event_date) < new Date(new Date().toDateString())) {
      throw new ValidationError('Event date cannot be in the past', { event_date: 'must be today or later' });
    }

    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase
      .from('orders')
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'created_order',
      description: `Created order for event ${data.event_date}`,
      entityType: 'orders',
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
        action: 'create_order_failed',
        entityType: 'orders',
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
