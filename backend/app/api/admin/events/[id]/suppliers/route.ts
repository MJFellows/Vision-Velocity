/**
 * POST /api/admin/events/:id/suppliers   { supplier_id, status?, notes? }
 *
 * Links a supplier store to an event. status defaults to "possible". A supplier can
 * be linked to an event only once (409 otherwise); change its status with PATCH on
 * ./[linkId].
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ConflictError, NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';
import { EVENT_SUPPLIER_STATUSES } from '@/lib/events';

const linkSchema = z.object({
  supplier_id: z.string().uuid(),
  status: z.enum(EVENT_SUPPLIER_STATUSES).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
  const adminUserId = request.headers.get('x-user-id');
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  const { id } = await params;
  try {
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event id');
    const body = await request.json().catch(() => null);
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid supplier link',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }

    const supabase = getSupabaseForRequest(request);
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) throw new NotFoundError('Event not found');

    const { data, error } = await supabase
      .from('event_suppliers')
      .insert({ event_id: id, ...parsed.data })
      .select('id, supplier_id, status, notes, suppliers(id, supplier_chain, store_name, suburb, state, postcode)')
      .single();
    if (error) {
      if (error.code === '23505') throw new ConflictError('This supplier is already linked to the event');
      if (error.code === '23503') throw new ValidationError('That supplier does not exist');
      throw error;
    }

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'added_event_supplier',
      description: `Linked supplier to event as ${data.status}`,
      entityType: 'event_suppliers',
      entityId: data.id,
      changes: { before: null, after: parsed.data },
      requestParams: parsed.data,
      recordIds: [data.id],
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data }, { status: 201, headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
}
