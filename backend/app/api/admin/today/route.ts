/**
 * GET /api/admin/today
 *
 * The "Needs attention" list for the dashboard: charities awaiting approval,
 * events requested by charities, events in the next 14 days with something
 * missing, orders close to their date that are still pending or incomplete,
 * past events with no results entered, overdue invoices and new feedback.
 * Runs as the calling admin (RLS). The logic lives in lib/needs-attention.ts.
 */

import { getSupabaseForRequest } from '@/lib/supabase';
import { json, errorResponse } from '@/lib/route-helpers';
import { loadNeedsAttention } from '@/lib/needs-attention';

export async function GET(request: Request) {
  try {
    const data = await loadNeedsAttention(getSupabaseForRequest(request));
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}
