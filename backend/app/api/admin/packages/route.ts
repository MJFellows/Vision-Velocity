/**
 * GET  /api/admin/packages?include_inactive=true
 * POST /api/admin/packages
 *
 * Admin management of fundraising packages (name, description, base price,
 * active flag). Active packages are also read publicly by
 * /api/public/landing-page-data and are what an event's "packages used" list
 * picks from. The `items` contents list is not edited here yet (stays []).
 * Admin-only via proxy.ts; queries run as the calling admin (RLS packages_admin_all).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ConflictError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';
import { PACKAGE_COLUMNS, packageFields } from '@/lib/packages';

const createPackageSchema = z.object({
  name: packageFields.name,
  description: packageFields.description.optional(),
  base_price_aud: packageFields.base_price_aud,
  is_active: packageFields.is_active.optional(),
});

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const includeInactive = new URL(request.url).searchParams.get('include_inactive') === 'true';
    const supabase = getSupabaseForRequest(request);
    let query = supabase.from('packages').select(PACKAGE_COLUMNS).eq('is_deleted', false).order('name');
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
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
  try {
    const body = await request.json().catch(() => null);
    const parsed = createPackageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid package',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase.from('packages').insert(parsed.data).select(PACKAGE_COLUMNS).single();
    if (error) {
      if (error.code === '23505') throw new ConflictError('A package with that name already exists');
      throw error;
    }
    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'created_package',
      description: `Created package ${data.name}`,
      entityType: 'packages',
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
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
