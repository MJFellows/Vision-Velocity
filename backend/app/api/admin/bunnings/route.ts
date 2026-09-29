import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, ConflictError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';

const createStoreSchema = z.object({
  location: z.string().min(1),
  store_address: z.string().optional().nullable(),
  store_phone: z.string().optional().nullable(),
  store_manager_name: z.string().optional().nullable(),
  store_manager_email: z.string().email().optional().nullable(),
  store_manager_phone: z.string().optional().nullable(),
  activities_officer_name: z.string().optional().nullable(),
  activities_officer_email: z.string().email().optional().nullable(),
  activities_officer_phone: z.string().optional().nullable(),
  discovered_by: z.enum(['rita', 'natalie']).optional().nullable(),
  discovered_date: z.string().optional().nullable(),
  interaction_notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('active') !== 'false';

    const supabase = getSupabaseForRequest(request);
    let query = supabase
      .from('bunnings_stores')
      .select('*')
      .eq('is_deleted', false)
      .order('location', { ascending: true });

    if (activeOnly) query = query.eq('is_active', true);

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
  let requestBody: unknown = null;

  try {
    requestBody = await request.json().catch(() => null);
    const parsed = createStoreSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid Bunnings store data',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }

    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase
      .from('bunnings_stores')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ConflictError('A store at this location already exists');
      throw error;
    }

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'created_bunnings_store',
      description: `Added Bunnings store "${data.location}"`,
      entityType: 'bunnings_stores',
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
        action: 'create_bunnings_store_failed',
        entityType: 'bunnings_stores',
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
