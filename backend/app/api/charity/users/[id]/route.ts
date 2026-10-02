/** PATCH /api/charity/users/:id { is_active } — the main contact switches another person's access on or off. */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ForbiddenError, NotFoundError, ValidationError } from '@/utils/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const caller = await requireCharityCaller(request);
    if (caller.role !== 'owner') throw new ForbiddenError("Only your charity's main contact can change access");
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid person');
    if (id === caller.charityUserId) throw new ValidationError('You cannot switch off your own access');
    const { is_active } = await parseBody(request, z.object({ is_active: z.boolean() }));
    const { data, error } = await getSupabaseAdmin()
      .from('charity_users')
      .update({ is_active })
      .eq('id', id)
      .eq('charity_id', caller.charityId)
      .select('id, email, name, role, is_active, invited_at, last_sign_in_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Person not found');
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}
