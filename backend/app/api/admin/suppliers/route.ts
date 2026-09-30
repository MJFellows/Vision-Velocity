/**
 * GET /api/admin/suppliers?supplier_chain=&state=&postcode=&search=&page=&pageSize=
 *
 * Paginated list of supplier store locations (Woolworths, Coles, IGA, ...).
 *
 *   supplier_chain  exact chain name, e.g. Woolworths (see /api/admin/supplier-chains)
 *   state           NSW | VIC | QLD | WA | SA | TAS | ACT | NT
 *   postcode        4 digits, or a wildcard pattern: `42*`, `4?20`; a value shorter
 *                   than 4 characters is treated as a prefix (see lib/location-filters.ts)
 *   search          case-insensitive match on store name or suburb
 *
 * Admin-only (proxy.ts + Postgres RLS via suppliers_admin_all). Reads go through
 * getSupabaseForRequest(), i.e. as the calling admin's own JWT.
 */

import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { normaliseState, parsePostcodeFilter, safeSearchTerm } from '@/lib/location-filters';

const LIST_COLUMNS =
  'id, supplier_chain, source_store_id, store_name, address, suburb, state, postcode, phone, latitude, longitude, opening_hours, facilities, is_active';

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const url = new URL(request.url);
    const chain = url.searchParams.get('supplier_chain')?.trim() || null;
    const search = safeSearchTerm(url.searchParams.get('search'));
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize') ?? '50') || 50));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let state: string | null;
    let postcode: ReturnType<typeof parsePostcodeFilter>;
    try {
      state = normaliseState(url.searchParams.get('state'));
      postcode = parsePostcodeFilter(url.searchParams.get('postcode'));
    } catch (e) {
      throw new ValidationError(e instanceof Error ? e.message : 'Invalid filter');
    }

    const supabase = getSupabaseForRequest(request);
    let query = supabase
      .from('suppliers')
      .select(LIST_COLUMNS, { count: 'exact' })
      .eq('is_deleted', false)
      .order('supplier_chain', { ascending: true })
      .order('state', { ascending: true })
      .order('postcode', { ascending: true })
      .order('store_name', { ascending: true })
      .range(from, to);

    if (chain) query = query.eq('supplier_chain', chain);
    if (state) query = query.eq('state', state);
    if (postcode) {
      query = postcode.kind === 'exact' ? query.eq('postcode', postcode.value) : query.like('postcode', postcode.pattern);
    }
    if (search) query = query.or(`store_name.ilike.%${search}%,suburb.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? 0;
    return NextResponse.json(
      { data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } },
      { headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
