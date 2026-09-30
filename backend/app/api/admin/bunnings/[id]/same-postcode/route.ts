/**
 * GET /api/admin/bunnings/:id/same-postcode?include=suppliers|charities[&radius_km=5|10|25|50]
 *
 * Suppliers (store locations) or charities in the same postcode as this Bunnings store.
 * With radius_km, records within that distance are included as well (each row carries
 * distance_km); see lib/same-postcode.ts for how the origin point is chosen. `include` is required.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { charitiesNear, parseRadius, postcodeOrigin, suppliersNear, type Origin } from '@/lib/same-postcode';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid Bunnings store id');
    const url = new URL(request.url);
    const include = url.searchParams.get('include');
    if (include !== 'suppliers' && include !== 'charities') {
      throw new ValidationError('include must be "suppliers" or "charities"');
    }
    let radius: number | null;
    try {
      radius = parseRadius(url.searchParams.get('radius_km'));
    } catch (e) {
      throw new ValidationError(e instanceof Error ? e.message : 'Invalid radius');
    }

    const supabase = getSupabaseForRequest(request);
    const { data: store, error } = await supabase
      .from('bunnings_stores')
      .select('id, location, postcode, latitude, longitude')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!store) throw new NotFoundError('Bunnings store not found');

    const postcode: string | null = store.postcode ?? null;
    let origin: Origin | null = null;
    if (radius != null) {
      origin =
        store.latitude != null && store.longitude != null
          ? { latitude: store.latitude, longitude: store.longitude, basis: 'store' }
          : await postcodeOrigin(supabase, postcode);
    }
    const data =
      include === 'suppliers'
        ? await suppliersNear(supabase, postcode, origin, radius)
        : await charitiesNear(supabase, postcode, origin, radius);

    return NextResponse.json(
      { postcode, radius_km: radius, origin_available: radius == null ? null : origin != null, data },
      { headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
