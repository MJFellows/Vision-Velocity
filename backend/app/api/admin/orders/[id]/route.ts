import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, NotFoundError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges, getAuditTrail, getAdminActionLog } from '@/lib/audit';

const updateOrderSchema = z
  .object({
    status: z.enum(['pending', 'confirmed', 'scheduled', 'delivered', 'cancelled']),
    charity_id: z.string().uuid(),
    package_id: z.string().uuid(),
    event_date: z.string().refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date'),
    delivery_address: z.string().trim().min(1, 'Delivery address is required'),
    delivery_contact_name: z.string().nullable(),
    delivery_phone: z.string().nullable(),
    special_requests: z.string().nullable(),
    total_price_aud: z.number().nonnegative(),
    completed_at: z.string().nullable(),
  })
  .partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const includeAudit = url.searchParams.get('includeAudit') === 'true';
    const supabase = getSupabaseForRequest(request);

    const { data, error } = await supabase
      .from('orders')
      .select('*, charities(*), packages(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Order not found');

    let auditTrail: unknown = undefined;
    let adminActionLog: unknown = undefined;
    if (includeAudit) {
      [auditTrail, adminActionLog] = await Promise.all([
        getAuditTrail(supabase, 'orders', id),
        getAdminActionLog(supabase, 'orders', id),
      ]);
    }

    return NextResponse.json({ data: { ...data, audit_trail: auditTrail, admin_action_log: adminActionLog } }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
  const adminUserId = request.headers.get('x-user-id');
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  let requestBody: unknown = null;
  const { id } = await params;

  try {
    requestBody = await request.json().catch(() => null);
    const parsed = updateOrderSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid order update',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const supabase = getSupabaseForRequest(request);

    const { data: before, error: beforeError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('Order not found');

    const { data, error } = await supabase
      .from('orders')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23503') throw new ValidationError('The chosen charity or package does not exist');
      throw error;
    }
    if (!data) throw new NotFoundError('Order not found');

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'updated_order',
      description: `Updated order ${data.id} (${Object.keys(parsed.data).join(', ')})`,
      entityType: 'orders',
      entityId: data.id,
      changes: diffChanges(before, data),
      requestParams: parsed.data,
      recordIds: [data.id],
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      await logAdminAction({
        adminUserId,
        userEmail: adminEmail,
        action: 'update_order_failed',
        entityType: 'orders',
        entityId: id,
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
