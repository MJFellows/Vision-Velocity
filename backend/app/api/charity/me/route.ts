/** GET /api/charity/me — the signed-in person, their role and their charity's details. Also records the sign-in time. */

import { json, errorResponse } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CHARITY_SAFE_COLUMNS } from '@/lib/charity-data';

export async function GET(request: Request) {
  try {
    const caller = await requireCharityCaller(request);
    const admin = getSupabaseAdmin();
    const { data: charity, error } = await admin.from('charities').select(CHARITY_SAFE_COLUMNS).eq('id', caller.charityId).single();
    if (error) throw error;
    await admin.from('charity_users').update({ last_sign_in_at: new Date().toISOString() }).eq('id', caller.charityUserId);
    return json(request, {
      data: {
        user: { id: caller.authUserId, email: caller.email, name: caller.name, role: caller.role },
        charity,
      },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}
