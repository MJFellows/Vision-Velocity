/** GET /api/admin/invoices?status=issued|paid|void|overdue — invoices, newest first. */

import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse } from '@/lib/route-helpers';
import { brisbaneToday } from '@/lib/charity-data';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    let q = getSupabaseAdmin()
      .from('invoices')
      .select('id, invoice_number, order_id, charity_id, issue_date, due_date, amount_aud, status, paid_at, emailed_at, buyer')
      .order('created_at', { ascending: false })
      .limit(500);
    if (status === 'overdue') q = q.eq('status', 'issued').lt('due_date', brisbaneToday());
    else if (status === 'issued' || status === 'paid' || status === 'void') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return json(request, { data, today: brisbaneToday() });
  } catch (error) {
    return errorResponse(request, error);
  }
}
