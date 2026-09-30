import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, NotFoundError, ConflictError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges, getAuditTrail, getAdminActionLog } from '@/lib/audit';

const updateCharitySchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    postcode: z.string().regex(/^[0-9]{4}$/, 'Postcode must be 4 digits').nullable(),
    contact_name: z.string().nullable(),
    tax_id: z.string().nullable(),
    subscription_status: z.enum(['trial', 'active', 'inactive']),
    annual_membership_fee_paid: z.boolean(),
    bunnings_store_id: z.string().uuid().nullable(),
    internal_notes: z.string().nullable(),
    tags: z.array(z.string()),
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

    const { data: charity, error: charityError } = await supabase
      .from('charities')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (charityError) throw charityError;
    if (!charity) throw new NotFoundError('Charity not found');

    const { data: interactions, error: interactionsError } = await supabase
      .from('customer_interactions')
      .select('*')
      .eq('charity_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (interactionsError) throw interactionsError;

    let auditTrail: unknown = undefined;
    let adminActionLog: unknown = undefined;
    if (includeAudit) {
      // Row-level history (audit_log, trigger-populated) and the
      // application-level history (admin_action_log) side by side — see
      // lib/audit.ts for what each one captures that the other doesn't.
      [auditTrail, adminActionLog] = await Promise.all([
        getAuditTrail(supabase, 'charities', id),
        getAdminActionLog(supabase, 'charities', id),
      ]);
    }

    return NextResponse.json(
      { data: { ...charity, recent_interactions: interactions, audit_trail: auditTrail, admin_action_log: adminActionLog } },
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
    const parsed = updateCharitySchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid charity update',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const supabase = getSupabaseForRequest(request);

    // Fetched before the update specifically so the audit entry can carry a
    // real before/after diff (diffChanges), not just "these fields were
    // sent" — a field sent with the same value it already had shouldn't
    // show up as a change.
    const { data: before, error: beforeError } = await supabase
      .from('charities')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('Charity not found');

    const { data, error } = await supabase
      .from('charities')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictError('A charity with this email already exists');
      }
      throw error;
    }
    if (!data) throw new NotFoundError('Charity not found');

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'updated_charity',
      description: `Updated charity "${data.name}" (${Object.keys(parsed.data).join(', ')})`,
      entityType: 'charities',
      entityId: data.id,
      changes: diffChanges(before, data),
      requestParams: parsed.data,
      recordIds: [data.id],
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    if (!(error instanceof ValidationError) && !(error instanceof ConflictError)) {
      await logAdminAction({
        adminUserId,
        userEmail: adminEmail,
        action: 'update_charity_failed',
        entityType: 'charities',
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
