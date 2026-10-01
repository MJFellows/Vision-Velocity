/**
 * GET /api/admin/supplier-chains
 *
 * Active supplier chains (Woolworths, Coles, IGA, ...) from the supplier_chains
 * lookup table, in display order. Used to populate the chain filter and the
 * supplier-status chain selector. Add a row to supplier_chains to support a new chain.
 */

import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase
      .from('supplier_chains')
      .select('name, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
