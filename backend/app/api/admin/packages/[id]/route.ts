/**
 * PATCH /api/admin/packages/:id   update name, description, base price, active flag;
 *                                 is_deleted=true removes it (packages already used
 *                                 on events stay linked to those events).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ConflictError, NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { PACKAGE_COLUMNS, packageFields } from '@/lib/packages';

const updatePackageSchema = z.object({ ...packageFields, is_deleted: z.boolean() }).partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
  const adminUserId = request.headers.get('x-user-id');
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid package id');
    const body = await request.json().catch(() => null);
    const parsed = updatePackageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid package update',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) throw new ValidationError('No fields to update');

    const supabase = getSupabaseForRequest(request);
    const { data: before, error: beforeError } = await supabase
      .from('packages')
      .select(PACKAGE_COLUMNS)
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('Package not found');

    const { data, error } = await supabase.from('packages').update(parsed.data).eq('id', id).select(PACKAGE_COLUMNS).single();
    if (error) {
      if (error.code === '23505') throw new ConflictError('A package with that name already exists');
      throw error;
    }
    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: parsed.data.is_deleted ? 'deleted_package' : 'updated_package',
      description: `Updated package ${before.name} (${Object.keys(parsed.data).join(', ')})`,
      entityType: 'packages',
      entityId: id,
      changes: diffChanges(before as Record<string, unknown>, { ...before, ...parsed.data }),
      requestParams: parsed.data,
      recordIds: [id],
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
