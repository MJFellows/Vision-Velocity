/**
 * GET  /api/admin/charities?status=&search=&page=&pageSize=
 * POST /api/admin/charities
 *
 * Admin-only (enforced by proxy.ts, and independently by Postgres RLS
 * via charities_admin_all — see the schema). All reads/writes go through
 * getSupabaseForRequest(), i.e. as the calling admin's own JWT, so RLS is
 * always the real authority here; middleware is a fast-fail convenience,
 * not the security boundary by itself.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, ConflictError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';

const createCharitySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  bunnings_store_id: z.string().uuid().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '25')));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = getSupabaseForRequest(request);
    let query = supabase
      .from('charities')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('subscription_status', status);
    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json(
      { data, pagination: { page, pageSize, total: count ?? 0 } },
      { headers: cors }
    );
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
    const parsed = createCharitySchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid charity data',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }

    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase
      .from('charities')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      // Postgres unique_violation on charities.email — map to a real 409
      // rather than falling through to a generic 500 (this table has no
      // application-level pre-check like the public signup route does).
      if (error.code === '23505') {
        throw new ConflictError('A charity with this email already exists');
      }
      throw error;
    }

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'created_charity',
      description: `Created charity "${data.name}"`,
      entityType: 'charities',
      entityId: data.id,
      changes: { before: null, after: parsed.data },
      requestParams: parsed.data,
      recordIds: [data.id],
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data }, { status: 201, headers: cors });
  } catch (error) {
    // Only log an admin_action_log entry for a real attempted write that
    // failed (a DB/constraint error) — not for a request that never passed
    // validation, which isn't a meaningful "admin action" attempt yet.
    if (!(error instanceof ValidationError) && !(error instanceof ConflictError)) {
      await logAdminAction({
        adminUserId,
        userEmail: adminEmail,
        action: 'create_charity_failed',
        entityType: 'charities',
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
