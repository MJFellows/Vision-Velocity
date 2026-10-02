/**
 * GET  /api/admin/charities/:id/users   who can sign in for this charity
 * POST /api/admin/charities/:id/users   { email, name?, role? } — give someone access and email them a set-up link
 *                                       (also used to resend the link)
 */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { getSupabaseForRequest } from '@/lib/supabase';
import { inviteCharityUser } from '@/lib/charity-auth';
import { ValidationError } from '@/utils/errors';
import { logAdminAction } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  name: z.string().trim().max(120).optional().nullable(),
  role: z.enum(['owner', 'member']).default('member'),
});

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid charity');
    const { data, error } = await getSupabaseForRequest(request)
      .from('charity_users')
      .select('id, email, name, role, is_active, invited_at, invited_by, last_sign_in_at')
      .eq('charity_id', id)
      .order('role')
      .order('invited_at');
    if (error) throw error;
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid charity');
    const body = await parseBody(request, schema, 'Invalid person');
    const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
    const result = await inviteCharityUser({ charityId: id, email: body.email, name: body.name, role: body.role ?? 'member', invitedBy: adminEmail });
    await logAdminAction({
      adminUserId: request.headers.get('x-user-id'),
      userEmail: adminEmail,
      action: 'invited_charity_user',
      description: `Gave ${body.email} (${body.role ?? 'member'}) sign-in access`,
      entityType: 'charities',
      entityId: id,
      recordIds: [id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
      status: result.emailSent ? 'success' : 'error',
      errorDetail: result.emailError ?? null,
    });
    return json(request, { data: result }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}
