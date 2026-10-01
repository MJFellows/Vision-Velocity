/**
 * GET   /api/admin/suppliers/:id
 *   A single supplier store with every field, including normalised opening hours,
 *   the original source hours text, facilities and the store contact.
 *
 * PATCH /api/admin/suppliers/:id
 *   Edit store details and the store contact (contact_name, contact_email,
 *   contact_mobile). Opening hours and facilities come from the store import and
 *   are not editable here. Empty strings should be sent as null to clear a field.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges } from '@/lib/audit';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
const optionalText = (max: number) => z.string().trim().max(max).nullable();

const updateSupplierSchema = z
  .object({
    supplier_chain: z.string().trim().min(1, 'Supplier chain is required').max(100),
    source_store_id: optionalText(50),
    store_name: z.string().trim().min(1, 'Store name is required').max(200),
    address: optionalText(300),
    suburb: optionalText(100),
    state: z.enum(AU_STATES),
    postcode: z.string().regex(/^\d{4}$/, 'Postcode must be 4 digits'),
    phone: optionalText(30),
    contact_name: optionalText(200),
    contact_email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254).nullable(),
    contact_mobile: z
      .string()
      .trim()
      .regex(/^[0-9 +()-]{8,20}$/, 'Enter a valid mobile number')
      .nullable(),
    is_active: z.boolean(),
  })
  .partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid supplier id');

    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Supplier not found');

    return NextResponse.json({ data }, { headers: cors });
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
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid supplier id');
    requestBody = await request.json().catch(() => null);
    const parsed = updateSupplierSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid supplier update',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) throw new ValidationError('No fields to update');

    const supabase = getSupabaseForRequest(request);
    const { data: before, error: beforeError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('Supplier not found');

    const { data, error } = await supabase.from('suppliers').update(parsed.data).eq('id', id).select('*').single();
    if (error) {
      if (error.code === '23503') throw new ValidationError('Unknown supplier chain');
      if (error.code === '23514') throw new ValidationError('One of the values is not allowed (check the email address)');
      throw error;
    }

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'updated_supplier',
      description: `Updated supplier ${before.store_name} (${Object.keys(parsed.data).join(', ')})`,
      entityType: 'suppliers',
      entityId: id,
      changes: diffChanges(before, { ...before, ...parsed.data }),
      requestParams: parsed.data,
      recordIds: [id],
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    if (!(error instanceof ValidationError) && !(error instanceof NotFoundError)) {
      await logAdminAction({
        adminUserId,
        userEmail: adminEmail,
        action: 'update_supplier_failed',
        entityType: 'suppliers',
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
