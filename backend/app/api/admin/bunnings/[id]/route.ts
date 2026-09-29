import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, NotFoundError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges, getAuditTrail, getAdminActionLog } from '@/lib/audit';

const updateStoreSchema = z
  .object({
    location: z.string().min(1),
    store_address: z.string().nullable(),
    store_phone: z.string().nullable(),
    store_manager_name: z.string().nullable(),
    store_manager_email: z.string().email().nullable(),
    store_manager_phone: z.string().nullable(),
    activities_officer_name: z.string().nullable(),
    activities_officer_email: z.string().email().nullable(),
    activities_officer_phone: z.string().nullable(),
    interaction_notes: z.string().nullable(),
    is_active: z.boolean(),
    is_deleted: z.boolean(),
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

    const { data: store, error: storeError } = await supabase
      .from('bunnings_stores')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (storeError) throw storeError;
    if (!store) throw new NotFoundError('Bunnings store not found');

    const { data: charities, error: charitiesError } = await supabase
      .from('bunnings_store_charities')
      .select('charity_id, charity_name')
      .eq('bunnings_store_id', id);
    if (charitiesError) throw charitiesError;

    let auditTrail: unknown = undefined;
    let adminActionLog: unknown = undefined;
    if (includeAudit) {
      [auditTrail, adminActionLog] = await Promise.all([
        getAuditTrail(supabase, 'bunnings_stores', id),
        getAdminActionLog(supabase, 'bunnings_stores', id),
      ]);
    }

    return NextResponse.json(
      { data: { ...store, charities, audit_trail: auditTrail, admin_action_log: adminActionLog } },
      { headers: cors }
    );
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
    const parsed = updateStoreSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid Bunnings store update',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const supabase = getSupabaseForRequest(request);

    const { data: before, error: beforeError } = await supabase
      .from('bunnings_stores')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('Bunnings store not found');

    const { data, error } = await supabase
      .from('bunnings_stores')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Bunnings store not found');

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'updated_bunnings_store',
      description: `Updated Bunnings store "${data.location}" (${Object.keys(parsed.data).join(', ')})`,
      entityType: 'bunnings_stores',
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
        action: 'update_bunnings_store_failed',
        entityType: 'bunnings_stores',
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
