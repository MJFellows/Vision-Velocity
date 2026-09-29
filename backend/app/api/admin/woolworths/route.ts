/**
 * GET   /api/admin/woolworths
 * POST  /api/admin/woolworths
 * PATCH /api/admin/woolworths
 *
 * Woolworths negotiation tracking (Task 2.4). `woolworths_contact` is a
 * singleton in practice — Vision Velocity is negotiating with one
 * Woolworths contact at a time — but nothing in the schema enforces that
 * at the database level, so this route enforces it in code: GET returns
 * the earliest non-deleted row (or null if none exists yet), POST refuses
 * to create a second one, and PATCH always targets that same row rather
 * than trusting a client-supplied id.
 *
 * Admin-only (enforced by proxy.ts, and independently by Postgres RLS via
 * woolworths_contact_admin_all — see the schema). All reads/writes go
 * through getSupabaseForRequest(), i.e. as the calling admin's own JWT.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, ConflictError, NotFoundError, handleApiError } from '@/utils/errors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { buildCorsHeaders } from '@/utils/cors';

const contactRoleEnum = z.enum(['category_manager', 'store_manager', 'supply_manager', 'other']);
const statusEnum = z.enum(['interested', 'meeting_scheduled', 'proposal_submitted', 'negotiating', 'agreed']);

const createWoolworthsSchema = z.object({
  contact_person_name: z.string().min(2).max(100),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_role: contactRoleEnum.optional().nullable(),
  status: statusEnum.optional(),
  last_contact_date: z.string().optional().nullable(),
  next_contact_date: z.string().optional().nullable(),
  discussion_summary: z.string().optional().nullable(),
  delivery_logistics_status: z.string().optional().nullable(),
  supply_pricing_status: z.string().optional().nullable(),
  commercial_agreement_status: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
});

const updateWoolworthsSchema = createWoolworthsSchema.partial();

async function getSingletonRow(supabase: ReturnType<typeof getSupabaseForRequest>) {
  const { data, error } = await supabase
    .from('woolworths_contact')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const supabase = getSupabaseForRequest(request);
    const data = await getSingletonRow(supabase);
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
    const parsed = createWoolworthsSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid Woolworths contact data',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }

    const supabase = getSupabaseForRequest(request);
    const existing = await getSingletonRow(supabase);
    if (existing) {
      throw new ConflictError('A Woolworths negotiation contact already exists — use PATCH to update it');
    }

    const { data, error } = await supabase
      .from('woolworths_contact')
      .insert(parsed.data)
      .select()
      .single();
    if (error) throw error;

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'created_woolworths_contact',
      description: `Added Woolworths negotiation contact "${data.contact_person_name}"`,
      entityType: 'woolworths_contact',
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
        action: 'create_woolworths_contact_failed',
        entityType: 'woolworths_contact',
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

export async function PATCH(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
  const adminUserId = request.headers.get('x-user-id');
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  let requestBody: unknown = null;

  try {
    requestBody = await request.json().catch(() => null);
    const parsed = updateWoolworthsSchema.safeParse(requestBody);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid Woolworths contact data',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const supabase = getSupabaseForRequest(request);
    const before = await getSingletonRow(supabase);
    if (!before) {
      throw new NotFoundError('No Woolworths negotiation contact exists yet — create one first');
    }

    const { data, error } = await supabase
      .from('woolworths_contact')
      .update(parsed.data)
      .eq('id', before.id)
      .select()
      .single();
    if (error) throw error;

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'updated_woolworths_contact',
      description: 'Updated Woolworths negotiation status',
      entityType: 'woolworths_contact',
      entityId: data.id,
      changes: diffChanges(before, data),
      requestParams: parsed.data,
      recordIds: [data.id],
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      await logAdminAction({
        adminUserId,
        userEmail: adminEmail,
        action: 'update_woolworths_contact_failed',
        entityType: 'woolworths_contact',
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
