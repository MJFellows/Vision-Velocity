/**
 * GET  /api/admin/components?include_inactive=true&search=
 * POST /api/admin/components
 *
 * Components are the items and ingredients that make up packages (sausages,
 * bread, sauce, napkins ...). Each row includes `image_url`, the public URL of
 * its photo in the component-images bucket (uploaded via ./[id]/image).
 * Admin-only via proxy.ts; queries run as the calling admin (RLS components_admin_all).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ConflictError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';
import { safeSearchTerm } from '@/lib/location-filters';
import { COMPONENT_COLUMNS, componentFields, componentWriteError, withImageUrl } from '@/lib/components';

const createComponentSchema = z
  .object(componentFields)
  .partial()
  .extend({ name: componentFields.name });

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('include_inactive') === 'true';
    const search = safeSearchTerm(url.searchParams.get('search'));
    let query = getSupabaseForRequest(request)
      .from('components')
      .select(COMPONENT_COLUMNS)
      .eq('is_deleted', false)
      .order('name');
    if (!includeInactive) query = query.eq('is_active', true);
    if (search) query = query.ilike('name', `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: (data ?? []).map(withImageUrl) }, { headers: cors });
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
  try {
    const body = await request.json().catch(() => null);
    const parsed = createComponentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid component',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    const { data, error } = await getSupabaseForRequest(request)
      .from('components')
      .insert(parsed.data)
      .select(COMPONENT_COLUMNS)
      .single();
    if (error) {
      const msg = componentWriteError(error);
      if (error.code === '23505') throw new ConflictError(msg!);
      if (msg) throw new ValidationError(msg);
      throw error;
    }
    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'created_component',
      description: `Created component ${data.name}`,
      entityType: 'components',
      entityId: data.id,
      changes: { before: null, after: parsed.data },
      requestParams: parsed.data,
      recordIds: [data.id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    });
    return NextResponse.json({ data: withImageUrl(data) }, { status: 201, headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
