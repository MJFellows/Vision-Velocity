/**
 * GET   /api/admin/supplier-contact?supplier_chain=Woolworths
 * POST  /api/admin/supplier-contact
 * PATCH /api/admin/supplier-contact?supplier_chain=Woolworths
 *
 * Supplier negotiation tracking (Task 2.4). There is one national
 * negotiation record per supplier chain (Woolworths, Coles, IGA, ...),
 * held in `supplier_contact`. The database enforces this with a partial
 * unique index on supplier_chain (where is_deleted = false); this route
 * mirrors it: GET returns that chain's record (or null if none exists yet),
 * POST refuses to create a second one for the same chain, and PATCH always
 * targets the chain's existing row rather than trusting a client-supplied id.
 * supplier_chain defaults to 'Woolworths' when omitted, so existing callers
 * keep working.
 *
 * Admin-only (enforced by proxy.ts, and independently by Postgres RLS via
 * supplier_contact_admin_all — see the schema). All reads/writes go
 * through getSupabaseForRequest(), i.e. as the calling admin's own JWT.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, ConflictError, NotFoundError, handleApiError } from '@/utils/errors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { buildCorsHeaders } from '@/utils/cors';

const DEFAULT_CHAIN = 'Woolworths';

const contactRoleEnum = z.enum(['category_manager', 'store_manager', 'supply_manager', 'other']);
const statusEnum = z.enum(['interested', 'meeting_scheduled', 'proposal_submitted', 'negotiating', 'agreed']);

const createSupplierContactSchema = z.object({
  supplier_chain: z.string().min(1).max(50).optional(),
  contact_person_name: z.string().min(2).max(100),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_role: contactRoleEnum.optional().nullable(),
  status: statusEnum.optional(),
  last_contact_date: z.string().optional().nullable(),
  next_contact_date: z.string().optional().nullable(),
  discussion_summary: z.string().optional().nullable(),
  delivery_logistics_status: z.string().optional().nullable(),
  supply_pricing_status: z.string().optional().nullable(),
  commercial_agreement_status: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
});

// The chain identifies which record to update, so it is taken from the query string, not the patch body.
const updateSupplierContactSchema = createSupplierContactSchema.omit({ supplier_chain: true }).partial();

function chainFromRequest(request: Request): string {
  return new URL(request.url).searchParams.get('supplier_chain')?.trim() || DEFAULT_CHAIN;
}

async function getSingletonRow(supabase: ReturnType<typeof getSupabaseForRequest>, supplierChain: string) {
  const { data, error } = await supabase
    .from('supplier_contact')
    .select('*')
    .eq('supplier_chain', supplierChain)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const supabase = getSupabaseForRequest(request);
    const data = await getSingletonRow(supabase, chainFromRequest(request));
    return NextResponse.json({ data }, { headers: cors });
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
    const parsed = createSupplierContactSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid Supplier contact data',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }

    const supabase = getSupabaseForRequest(request);
    const supplierChain = parsed.data.supplier_chain ?? DEFAULT_CHAIN;
    const existing = await getSingletonRow(supabase, supplierChain);
    if (existing) {
      throw new ConflictError(`A ${supplierChain} negotiation contact already exists — use PATCH to update it`);
    }

    const { data, error } = await supabase
      .from('supplier_contact')
      .insert({ ...parsed.data, supplier_chain: supplierChain })
      .select()
      .single();
    if (error) throw error;

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'created_supplier_contact',
      description: `Added ${supplierChain} negotiation contact "${data.contact_person_name}"`,
      entityType: 'supplier_contact',
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
        action: 'create_supplier_contact_failed',
        entityType: 'supplier_contact',
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

export async function PATCH(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
  const adminUserId = request.headers.get('x-user-id');
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  let requestBody: unknown = null;

  try {
    requestBody = await request.json().catch(() => null);
    const parsed = updateSupplierContactSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid Supplier contact data',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const supabase = getSupabaseForRequest(request);
    const supplierChain = chainFromRequest(request);
    const before = await getSingletonRow(supabase, supplierChain);
    if (!before) {
      throw new NotFoundError(`No ${supplierChain} negotiation contact exists yet — create one first`);
    }

    const { data, error } = await supabase
      .from('supplier_contact')
      .update(parsed.data)
      .eq('id', before.id)
      .select()
      .single();
    if (error) throw error;

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'updated_supplier_contact',
      description: `Updated ${supplierChain} negotiation status`,
      entityType: 'supplier_contact',
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
        action: 'update_supplier_contact_failed',
        entityType: 'supplier_contact',
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
