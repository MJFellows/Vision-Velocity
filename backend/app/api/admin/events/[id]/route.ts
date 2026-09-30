/**
 * GET   /api/admin/events/:id            event with Bunnings store, charity and supplier links
 * PATCH /api/admin/events/:id            update date, store, charity, status, notes; is_deleted=true removes it
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { EVENT_SELECT, EVENT_STATUSES } from '@/lib/events';

const updateEventSchema = z
  .object({
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    bunnings_store_id: z.string().uuid(),
    charity_id: z.string().uuid(),
    status: z.enum(EVENT_STATUSES),
    notes: z.string().max(5000).nullable(),
    is_deleted: z.boolean(),
  })
  .partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

function withCors(res: NextResponse, cors: Record<string, string>) {
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

export async function GET(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event id');
    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq('id', id).eq('is_deleted', false).maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Event not found');
    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    return withCors(handleApiError(error), cors);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
  const adminUserId = request.headers.get('x-user-id');
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  let requestBody: unknown = null;
  const { id } = await params;

  try {
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event id');
    requestBody = await request.json().catch(() => null);
    const parsed = updateEventSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid event update',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) throw new ValidationError('No fields to update');

    const supabase = getSupabaseForRequest(request);
    const { data: before, error: beforeError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('Event not found');

    const { error } = await supabase.from('events').update(parsed.data).eq('id', id);
    if (error) {
      if (error.code === '23503') throw new ValidationError('The chosen Bunnings store or charity does not exist');
      throw error;
    }
    const { data, error: readError } = await supabase.from('events').select(EVENT_SELECT).eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!data) throw new NotFoundError('Event not found');

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: parsed.data.is_deleted ? 'deleted_event' : 'updated_event',
      description: `Updated event ${before.event_date} (${Object.keys(parsed.data).join(', ')})`,
      entityType: 'events',
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
        action: 'update_event_failed',
        entityType: 'events',
        entityId: id,
        requestParams: requestBody as Record<string, unknown> | null,
        ipAddress,
        userAgent,
        status: 'error',
        errorDetail: error instanceof Error ? error.message : String(error),
      });
    }
    return withCors(handleApiError(error), cors);
  }
}
