// GET /api/bunnings/activities-officer/events
// Public route (Bearer AO session token, issued by the auth route above):
// read-only event list for the AO's own store. Uses the service-role
// client for the same reason as the auth route — the caller has a custom
// AO JWT, not a Supabase Auth session, so there is no RLS identity to run
// as. AOs can never see pricing.
//
// Note on the data model: orders are not linked to a Bunnings store
// directly. A store association only exists via the charity that placed
// the order (charities.bunnings_store_id). "Events at my store" is
// therefore: charities where bunnings_store_id = my store, joined to
// their orders.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ValidationError, InternalServerError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

type AOSession = {
  type: 'bunnings_ao';
  bunningsStoreId: string;
  aoEmail: string;
  aoName: string | null;
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new InternalServerError('Missing JWT_SECRET');
  return new TextEncoder().encode(secret);
}

async function verifyAOToken(authHeader: string | null): Promise<AOSession> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ValidationError('Missing or invalid authorization header', {
      authorization: 'Bearer token required',
    });
  }
  const token = authHeader.slice(7);

  let payload: unknown;
  try {
    const verified = await jwtVerify(token, getJwtSecret());
    payload = verified.payload;
  } catch {
    throw new ValidationError('Invalid or expired token', {
      token: 'Please request a new magic link',
    });
  }

  const session = payload as Partial<AOSession>;
  if (session.type !== 'bunnings_ao' || !session.bunningsStoreId) {
    throw new ValidationError('Invalid token type', { token: 'Token is not valid for AO access' });
  }
  return session as AOSession;
}

export async function GET(request: NextRequest) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const aoSession = await verifyAOToken(request.headers.get('authorization'));
    const supabase = getSupabaseAdmin();

    const { data: charities, error: charitiesError } = await supabase
      .from('charities')
      .select('id, name, email, phone, contact_name')
      .eq('bunnings_store_id', aoSession.bunningsStoreId)
      .eq('is_deleted', false);
    if (charitiesError) throw charitiesError;

    const charityIds = (charities ?? []).map((c) => c.id);
    const charityById = new Map((charities ?? []).map((c) => [c.id, c]));

    const now = new Date();
    const emptyResult = {
      store: { id: aoSession.bunningsStoreId, aoName: aoSession.aoName, aoEmail: aoSession.aoEmail },
      upcomingEvents: [] as unknown[],
      pastEvents: [] as unknown[],
      count: { upcoming: 0, past: 0 },
    };

    if (charityIds.length === 0) {
      return NextResponse.json({ data: emptyResult }, { status: 200, headers: cors });
    }

    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().slice(0, 10);

    const { data: upcoming, error: upcomingError } = await supabase
      .from('orders')
      .select('id, event_date, status, delivery_contact_name, delivery_phone, special_requests, charity_id, packages (id, name, base_price_aud, description)')
      .in('charity_id', charityIds)
      .eq('is_deleted', false)
      .gte('event_date', todayStr)
      .lte('event_date', ninetyDaysFromNow.toISOString().slice(0, 10))
      .order('event_date', { ascending: true });
    if (upcomingError) throw upcomingError;

    const { data: past, error: pastError } = await supabase
      .from('orders')
      .select('id, event_date, status, charity_id')
      .in('charity_id', charityIds)
      .eq('is_deleted', false)
      .gte('event_date', threeMonthsAgo.toISOString().slice(0, 10))
      .lt('event_date', todayStr)
      .order('event_date', { ascending: false })
      .limit(10);
    if (pastError) throw pastError;

    const formattedUpcoming = (upcoming ?? []).map((event: any) => {
      const charity = charityById.get(event.charity_id);
      return {
        id: event.id,
        eventDate: event.event_date,
        status: event.status,
        deliveryContactName: event.delivery_contact_name,
        deliveryPhone: event.delivery_phone,
        specialRequests: event.special_requests,
        charity: charity
          ? { id: charity.id, name: charity.name, email: charity.email, phone: charity.phone, contactName: charity.contact_name }
          : null,
        package: event.packages
          ? { id: event.packages.id, name: event.packages.name, description: event.packages.description }
          : null,
      };
    });

    const formattedPast = (past ?? []).map((event: any) => ({
      id: event.id,
      eventDate: event.event_date,
      status: event.status,
      charityName: charityById.get(event.charity_id)?.name ?? 'Unknown',
    }));

    return NextResponse.json(
      {
        data: {
          store: { id: aoSession.bunningsStoreId, aoName: aoSession.aoName, aoEmail: aoSession.aoEmail },
          upcomingEvents: formattedUpcoming,
          pastEvents: formattedPast,
          count: { upcoming: formattedUpcoming.length, past: formattedPast.length },
        },
      },
      { status: 200, headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
