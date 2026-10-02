/**
 * GET  /api/charity/users   people with access to this charity
 * POST /api/charity/users   { email, name } — the charity's main contact (owner) adds another person
 */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { inviteCharityUser, requireCharityCaller } from '@/lib/charity-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ForbiddenError } from '@/utils/errors';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  name: z.string().trim().min(1, 'Enter their name').max(120),
});

export async function GET(request: Request) {
  try {
    const caller = await requireCharityCaller(request);
    const { data, error } = await getSupabaseAdmin()
      .from('charity_users')
      .select('id, email, name, role, is_active, invited_at, last_sign_in_at')
      .eq('charity_id', caller.charityId)
      .order('role')
      .order('invited_at');
    if (error) throw error;
    return json(request, { data, me: caller.charityUserId });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const caller = await requireCharityCaller(request);
    if (caller.role !== 'owner') throw new ForbiddenError("Only your charity's main contact can add people");
    const body = await parseBody(request, schema, 'Invalid person');
    const result = await inviteCharityUser({
      charityId: caller.charityId,
      email: body.email,
      name: body.name,
      role: 'member',
      invitedBy: `${caller.email} (charity)`,
    });
    return json(request, { data: result }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}
