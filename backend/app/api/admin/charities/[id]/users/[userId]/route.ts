/** PATCH /api/admin/charities/:id/users/:userId { is_active?, role? } — switch a person's access on or off, or change their role. */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { logAdminAction } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

const schema = z.object({ is_active: z.boolean(), role: z.enum(['owner', 'member']) }).partial();

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, userId } = await params;
    if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(userId).success) throw new ValidationError('Invalid person');
    const body = await parseBody(request, schema, 'Invalid change');
    if (Object.keys(body).length === 0) throw new ValidationError('No changes');
    const { data, error } = await getSupabaseForRequest(request)
      .from('charity_users')
      .update(body)
      .eq('id', userId)
      .eq('charity_id', id)
      .select('id, email, name, role, is_active, invited_at, invited_by, last_sign_in_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Person not found');
    await logAdminAction({
      adminUserId: request.headers.get('x-user-id'),
      userEmail: request.headers.get('x-user-email') ?? 'unknown',
      action: 'updated_charity_user',
      description: `${data.email}: ${JSON.stringify(body)}`,
      entityType: 'charities',
      entityId: id,
      recordIds: [id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    });
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}
