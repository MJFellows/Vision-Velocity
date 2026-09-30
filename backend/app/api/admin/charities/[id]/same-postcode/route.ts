/**
 * GET /api/admin/charities/:id/same-postcode[?radius_km=5|10|25|50]
 *
 * Suppliers (store locations) and Bunnings stores in the same postcode as this charity.
 * With radius_km, records within that distance of the centre of the charity's postcode are
 * included as well (each row carries distance_km). If the charity has no postcode,
 * `postcode` is null and both lists are empty.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { bunningsNear, parseRadius, postcodeOrigin, suppliersNear } from '@/lib/same-postcode';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid charity id');
    let radius: number | null;
    try {
      radius = parseRadius(new URL(request.url).searchParams.get('radius_km'));
    } catch (e) {
      throw new ValidationError(e instanceof Error ? e.message : 'Invalid radius');
    }

    const supabase = getSupabaseForRequest(request);
    const { data: charity, error } = await supabase
      .from('charities')
      .select('id, name, postcode')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;
    if (!charity) throw new NotFoundError('Charity not found');

    const postcode: string | null = charity.postcode ?? null;
    const origin = radius != null ? await postcodeOrigin(supabase, postcode) : null;
    const [suppliers, bunnings] = await Promise.all([
      suppliersNear(supabase, postcode, origin, radius),
      bunningsNear(supabase, postcode, origin, radius),
    ]);

    return NextResponse.json(
      {
        postcode,
        radius_km: radius,
        origin_available: radius == null ? null : origin != null,
        data: { suppliers, bunnings_stores: bunnings },
      },
      { headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
