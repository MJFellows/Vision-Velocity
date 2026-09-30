/**
 * Shared lookups for the "same postcode" buttons, with an optional nearby-postcode radius.
 *
 * Exact mode (no radius): records whose four-digit postcode equals the origin postcode.
 *
 * Nearby mode (radius_km of 5, 10, 25 or 50): records within that great-circle distance of
 * the origin point, plus every record in the origin's own postcode (so widening the radius
 * never hides an exact match). The origin point is the Bunnings store's own coordinates
 * when available, otherwise the approximate centre of its postcode (view postcode_centroids,
 * the average of the imported store coordinates in that postcode). Charities have no
 * coordinates, so they are placed at the centre of their postcode. A postcode with no
 * stores in it can not be placed; callers then get `origin: null` and only exact matches.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const RADIUS_OPTIONS_KM = [5, 10, 25, 50] as const;
const MAX_ROWS = 200;

const SUPPLIER_COLUMNS = 'id, supplier_chain, store_name, address, suburb, state, postcode, phone, latitude, longitude';
const BUNNINGS_COLUMNS = 'id, location, store_address, suburb, state, postcode, store_phone, latitude, longitude';
const CHARITY_COLUMNS = 'id, name, location, postcode, subscription_status, contact_name, phone';

export interface Origin {
  latitude: number;
  longitude: number;
  basis: 'store' | 'postcode';
}

/** null = exact postcode only. Throws Error (user-safe message) for an unsupported radius. */
export function parseRadius(raw: string | null | undefined): number | null {
  const v = (raw ?? '').trim();
  if (!v || v === '0') return null;
  const n = Number(v);
  if (!(RADIUS_OPTIONS_KM as readonly number[]).includes(n)) {
    throw new Error(`radius_km must be one of ${RADIUS_OPTIONS_KM.join(', ')}`);
  }
  return n;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function boundingBox(o: Origin, km: number) {
  const dLat = km / 111;
  const dLon = km / (111 * Math.max(0.1, Math.cos((o.latitude * Math.PI) / 180)));
  return {
    minLat: o.latitude - dLat,
    maxLat: o.latitude + dLat,
    minLon: o.longitude - dLon,
    maxLon: o.longitude + dLon,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function postcodeOrigin(supabase: SupabaseClient, postcode: string | null): Promise<Origin | null> {
  if (!postcode) return null;
  const { data, error } = await supabase
    .from('postcode_centroids')
    .select('latitude, longitude')
    .eq('postcode', postcode)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.latitude == null || data.longitude == null) return null;
  return { latitude: data.latitude, longitude: data.longitude, basis: 'postcode' };
}

type WithCoords = { latitude: number | null; longitude: number | null; postcode: string | null };

function withDistance<T extends WithCoords>(rows: T[], origin: Origin | null, originPostcode: string | null, km: number | null) {
  const out: (Omit<T, 'latitude' | 'longitude'> & { distance_km: number | null })[] = [];
  for (const { latitude, longitude, ...rest } of rows) {
    const distance =
      origin && latitude != null && longitude != null ? haversineKm(origin.latitude, origin.longitude, latitude, longitude) : null;
    const samePostcode = originPostcode != null && rest.postcode === originPostcode;
    const inRadius = km != null && distance != null && distance <= km;
    if (samePostcode || inRadius) {
      out.push({ ...(rest as Omit<T, 'latitude' | 'longitude'>), distance_km: distance == null ? null : round1(distance) });
    }
  }
  return out.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0)).slice(0, MAX_ROWS);
}

export async function suppliersNear(supabase: SupabaseClient, postcode: string | null, origin: Origin | null, km: number | null) {
  let query = supabase.from('suppliers').select(SUPPLIER_COLUMNS).eq('is_deleted', false).eq('is_active', true).limit(2000);
  if (km != null && origin) {
    const b = boundingBox(origin, km);
    // Nearby rows (by box) plus the exact-postcode rows, which may lack coordinates.
    query = postcode
      ? query.or(`and(latitude.gte.${b.minLat},latitude.lte.${b.maxLat},longitude.gte.${b.minLon},longitude.lte.${b.maxLon}),postcode.eq.${postcode}`)
      : query.gte('latitude', b.minLat).lte('latitude', b.maxLat).gte('longitude', b.minLon).lte('longitude', b.maxLon);
  } else if (postcode) {
    query = query.eq('postcode', postcode);
  } else {
    return [];
  }
  const { data, error } = await query;
  if (error) throw error;
  return withDistance(data ?? [], origin, postcode, km);
}

export async function bunningsNear(supabase: SupabaseClient, postcode: string | null, origin: Origin | null, km: number | null) {
  let query = supabase.from('bunnings_stores').select(BUNNINGS_COLUMNS).eq('is_deleted', false).eq('is_active', true).limit(2000);
  if (km != null && origin) {
    const b = boundingBox(origin, km);
    query = postcode
      ? query.or(`and(latitude.gte.${b.minLat},latitude.lte.${b.maxLat},longitude.gte.${b.minLon},longitude.lte.${b.maxLon}),postcode.eq.${postcode}`)
      : query.gte('latitude', b.minLat).lte('latitude', b.maxLat).gte('longitude', b.minLon).lte('longitude', b.maxLon);
  } else if (postcode) {
    query = query.eq('postcode', postcode);
  } else {
    return [];
  }
  const { data, error } = await query;
  if (error) throw error;
  return withDistance(data ?? [], origin, postcode, km);
}

export async function charitiesNear(supabase: SupabaseClient, postcode: string | null, origin: Origin | null, km: number | null) {
  let query = supabase.from('charities').select(CHARITY_COLUMNS).eq('is_deleted', false).not('postcode', 'is', null).limit(2000);
  if (!(km != null && origin)) {
    if (!postcode) return [];
    query = query.eq('postcode', postcode);
  }
  const { data, error } = await query;
  if (error) throw error;
  const charities = data ?? [];
  if (charities.length === 0) return [];

  // Charities have no coordinates: place each at the centre of its postcode.
  const centroids = new Map<string, { latitude: number; longitude: number }>();
  if (km != null && origin) {
    const postcodes = [...new Set(charities.map((c) => c.postcode as string))];
    const { data: cents, error: centError } = await supabase
      .from('postcode_centroids')
      .select('postcode, latitude, longitude')
      .in('postcode', postcodes);
    if (centError) throw centError;
    for (const c of cents ?? []) centroids.set(c.postcode, { latitude: c.latitude, longitude: c.longitude });
  }
  const placed = charities.map((c) => {
    const centre = centroids.get(c.postcode as string);
    return { ...c, latitude: centre?.latitude ?? null, longitude: centre?.longitude ?? null };
  });
  return withDistance(placed, origin, postcode, km);
}
