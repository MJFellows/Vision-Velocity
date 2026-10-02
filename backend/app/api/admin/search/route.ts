/**
 * GET /api/admin/search?q=
 *
 * One search box across charities, events, orders, Bunnings stores, supplier
 * stores, packages and components. Returns up to 8 matches per kind, each with
 * a label, a short description and the admin page to open. Runs as the
 * calling admin (RLS).
 */

import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { safeSearchTerm } from '@/lib/location-filters';

interface Hit {
  kind: string;
  id: string;
  label: string;
  detail: string | null;
  href: string;
}

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const q = safeSearchTerm(new URL(request.url).searchParams.get('q'));
    if (!q || q.length < 2) return NextResponse.json({ data: [] }, { headers: cors });
    const s = getSupabaseForRequest(request);
    const like = `%${q}%`;
    const isPostcode = /^\d{4}$/.test(q);

    const [charities, stores, suppliers, packages, components, namedEvents] = await Promise.all([
      s.from('charities').select('id, name, contact_name, postcode').eq('is_deleted', false).or(`name.ilike.${like},contact_name.ilike.${like},email.ilike.${like}${isPostcode ? `,postcode.eq.${q}` : ''}`).limit(8),
      s.from('bunnings_stores').select('id, location, suburb, postcode, state').eq('is_deleted', false).or(`location.ilike.${like},suburb.ilike.${like}${isPostcode ? `,postcode.eq.${q}` : ''}`).limit(8),
      s.from('suppliers').select('id, store_name, supplier_chain, suburb, postcode').eq('is_deleted', false).or(`store_name.ilike.${like},suburb.ilike.${like},contact_name.ilike.${like}${isPostcode ? `,postcode.eq.${q}` : ''}`).limit(8),
      s.from('packages').select('id, name, is_active').eq('is_deleted', false).ilike('name', like).limit(8),
      s.from('components').select('id, name, is_active').eq('is_deleted', false).ilike('name', like).limit(8),
      s.from('events').select('id, event_date, event_name, status, charities(name)').eq('is_deleted', false).ilike('event_name', like).order('event_date', { ascending: false }).limit(8),
    ]);
    for (const r of [charities, stores, suppliers, packages, components, namedEvents]) if (r.error) throw r.error;

    const charityIds = (charities.data ?? []).map((c) => c.id as string);
    let charityEvents: { id: string; event_date: string; event_name: string | null; status: string; charities: { name: string } | null }[] = [];
    let charityOrders: { id: string; event_date: string; status: string; charities: { name: string } | null }[] = [];
    if (charityIds.length > 0) {
      const [ev, or] = await Promise.all([
        s.from('events').select('id, event_date, event_name, status, charities(name)').eq('is_deleted', false).in('charity_id', charityIds).order('event_date', { ascending: false }).limit(8),
        s.from('orders').select('id, event_date, status, charities(name)').eq('is_deleted', false).in('charity_id', charityIds).order('event_date', { ascending: false }).limit(8),
      ]);
      if (ev.error) throw ev.error;
      if (or.error) throw or.error;
      charityEvents = (ev.data ?? []) as unknown as typeof charityEvents;
      charityOrders = (or.data ?? []) as unknown as typeof charityOrders;
    }

    const hits: Hit[] = [];
    for (const c of charities.data ?? []) hits.push({ kind: 'Charity', id: c.id, label: c.name, detail: [c.contact_name, c.postcode].filter(Boolean).join(' · ') || null, href: `/admin/charities/${c.id}` });
    const seenEvents = new Set<string>();
    for (const e of [...((namedEvents.data ?? []) as unknown as typeof charityEvents), ...charityEvents]) {
      if (seenEvents.has(e.id)) continue;
      seenEvents.add(e.id);
      hits.push({ kind: 'Event', id: e.id, label: e.event_name || e.charities?.name || 'Event', detail: `${e.event_date} · ${e.status}${e.event_name && e.charities?.name ? ` · ${e.charities.name}` : ''}`, href: `/admin/events/${e.id}` });
    }
    for (const o of charityOrders) hits.push({ kind: 'Order', id: o.id, label: `Order for ${o.charities?.name ?? 'charity'}`, detail: `${o.event_date} · ${o.status}`, href: `/admin/orders/${o.id}` });
    for (const b of stores.data ?? []) hits.push({ kind: 'Bunnings store', id: b.id, label: b.location, detail: [b.suburb, b.state, b.postcode].filter(Boolean).join(' · ') || null, href: `/admin/bunnings/${b.id}` });
    for (const p of suppliers.data ?? []) hits.push({ kind: 'Supplier', id: p.id, label: p.store_name, detail: [p.supplier_chain, p.suburb, p.postcode].filter(Boolean).join(' · '), href: `/admin/suppliers/${p.id}` });
    for (const p of packages.data ?? []) hits.push({ kind: 'Package', id: p.id, label: p.name, detail: p.is_active ? null : 'inactive', href: '/admin/packages' });
    for (const c of components.data ?? []) hits.push({ kind: 'Component', id: c.id, label: c.name, detail: c.is_active ? null : 'inactive', href: '/admin/components' });

    return NextResponse.json({ data: hits }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
