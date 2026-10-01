/**
 * PATCH /api/admin/components/:id — edit a component; is_deleted=true removes it.
 * The image is managed separately via ./image (POST to upload, DELETE to remove).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ConflictError, NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { COMPONENT_COLUMNS, componentFields, componentWriteError, withImageUrl } from '@/lib/components';

const updateComponentSchema = z.object({ ...componentFields, is_deleted: z.boolean() }).partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid component id');
    const body = await request.json().catch(() => null);
    const parsed = updateComponentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid component update',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) throw new ValidationError('No fields to update');

    const supabase = getSupabaseForRequest(request);
    const { data: before, error: beforeError } = await supabase
      .from('components')
      .select(COMPONENT_COLUMNS)
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('Component not found');

    const { data, error } = await supabase.from('components').update(parsed.data).eq('id', id).select(COMPONENT_COLUMNS).single();
    if (error) {
      const msg = componentWriteError(error);
      if (error.code === '23505') throw new ConflictError(msg!);
      if (msg) throw new ValidationError(msg);
      throw error;
    }
    await logAdminAction({
      adminUserId: request.headers.get('x-user-id'),
      userEmail: request.headers.get('x-user-email') ?? 'unknown',
      action: parsed.data.is_deleted ? 'deleted_component' : 'updated_component',
      description: `Updated component ${before.name} (${Object.keys(parsed.data).join(', ')})`,
      entityType: 'components',
      entityId: id,
      changes: diffChanges(before as Record<string, unknown>, { ...before, ...parsed.data }),
      requestParams: parsed.data,
      recordIds: [id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    });
    return NextResponse.json({ data: withImageUrl(data) }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
