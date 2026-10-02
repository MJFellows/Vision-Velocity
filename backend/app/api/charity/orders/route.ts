/** GET /api/charity/orders — the charity's own orders (newest first). */

import { json, errorResponse } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CHARITY_ORDER_COLUMNS } from '@/lib/charity-data';

export async function GET(request: Request) {
  try {
    const caller = await requireCharityCaller(request);
    const { data, error } = await getSupabaseAdmin()
      .from('orders')
      .select(CHARITY_ORDER_COLUMNS)
      .eq('charity_id', caller.charityId)
      .eq('is_deleted', false)
      .order('event_date', { ascending: false })
      .limit(200);
    if (error) throw error;
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}
