/**
 * PATCH  /api/admin/events/:id/suppliers/:linkId   { status?, notes? }   change the supplier's status for this event
 * DELETE /api/admin/events/:id/suppliers/:linkId                          unlink the supplier from the event
 *
 * :linkId is the event_suppliers row id. Row-level history is kept by the audit trigger.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';
import { EVENT_SUPPLIER_STATUSES } from '@/lib/events';

const patchSchema = z
  .object({
    status: z.enum(EVENT_SUPPLIER_STATUSES),
    notes: z.string().max(2000).nullable(),
  })
  .partial();

interface RouteParams {
  params: Promise<{ id: string; linkId: string }>;
}

const uuid = z.string().uuid();

function actor(request: Request) {
  return {
    adminEmail: request.headers.get('x-user-email') ?? 'unknown',
    adminUserId: request.headers.get('x-user-id'),
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent'),
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  const a = actor(request);
  try {
    const { id, linkId } = await params;
    if (!uuid.safeParse(id).success || !uuid.safeParse(linkId).success) throw new ValidationError('Invalid id');
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid supplier update',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) throw new ValidationError('No fields to update');

    const supabase = getSupabaseForRequest(request);
    const { data: before, error: beforeError } = await supabase
      .from('event_suppliers')
      .select('id, status, notes')
      .eq('id', linkId)
      .eq('event_id', id)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('Supplier link not found for this event');

    const { data, error } = await supabase
      .from('event_suppliers')
      .update(parsed.data)
      .eq('id', linkId)
      .eq('event_id', id)
      .select('id, supplier_id, status, notes, suppliers(id, supplier_chain, store_name, suburb, state, postcode)')
      .single();
    if (error) throw error;

    await logAdminAction({
      adminUserId: a.adminUserId,
      userEmail: a.adminEmail,
      action: 'updated_event_supplier',
      description: `Event supplier status ${before.status} -> ${data.status}`,
      entityType: 'event_suppliers',
      entityId: linkId,
      changes: { before, after: { id: data.id, status: data.status, notes: data.notes } },
      requestParams: parsed.data,
      recordIds: [linkId],
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
    });

    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  const a = actor(request);
  try {
    const { id, linkId } = await params;
    if (!uuid.safeParse(id).success || !uuid.safeParse(linkId).success) throw new ValidationError('Invalid id');

    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase
      .from('event_suppliers')
      .delete()
      .eq('id', linkId)
      .eq('event_id', id)
      .select('id, supplier_id, status')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Supplier link not found for this event');

    await logAdminAction({
      adminUserId: a.adminUserId,
      userEmail: a.adminEmail,
      action: 'removed_event_supplier',
      description: 'Unlinked supplier from event',
      entityType: 'event_suppliers',
      entityId: linkId,
      changes: { before: data, after: null },
      recordIds: [linkId],
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
    });

    return NextResponse.json({ data: { id: linkId } }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
}
