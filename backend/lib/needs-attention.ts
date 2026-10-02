/**
 * The "Needs attention" list, shared by the dashboard (GET /api/admin/today,
 * run as the calling admin) and the founders' daily summary email (run with
 * the service-role client).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

function localDate(offsetDays = 0): string {
  // Brisbane has no daylight saving: UTC+10 all year.
  const d = new Date(Date.now() + 10 * 3_600_000 + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export interface EventRow {
  id: string;
  event_date: string;
  event_name: string | null;
  status: string;
  estimated_staff: number | null;
  number_of_shifts: number | null;
  actual_hotdogs_sold: number | null;
  sales_value_aud: number | null;
  charities: { name: string } | null;
  bunnings_stores: { location: string } | null;
  event_suppliers: { status: string }[];
  event_packages: { id: string }[];
}

export interface NeedsAttention {
  today: string;
  charitiesAwaitingApproval: { id: string; name: string; created_at: string }[];
  eventRequests: { id: string; event_date: string; name: string | null; charity: string | null; store: string | null; status: string }[];
  upcomingEventsWithGaps: { id: string; event_date: string; name: string | null; charity: string | null; store: string | null; status: string; missing: string[] }[];
  ordersNeedingAttention: { id: string; event_date: string; charity: string | null; status: string; missing: string[] }[];
  eventsMissingResults: { id: string; event_date: string; name: string | null; charity: string | null; store: string | null; status: string }[];
  overdueInvoices: { id: string; invoice_number: string; due_date: string; amount_aud: number; order_id: string; charity: string | null }[];
  newFeedback: number;
}

export async function loadNeedsAttention(supabase: SupabaseClient): Promise<NeedsAttention> {
    const today = localDate();
    const in14 = localDate(14);
    const minus60 = localDate(-60);

    const [charities, upcoming, past, orders, feedback] = await Promise.all([
      supabase.from('charities').select('id, name, created_at').eq('subscription_status', 'trial').eq('is_deleted', false).order('created_at'),
      supabase
        .from('events')
        .select('id, event_date, event_name, status, estimated_staff, number_of_shifts, actual_hotdogs_sold, sales_value_aud, charities(name), bunnings_stores(location), event_suppliers(status), event_packages(id)')
        .eq('is_deleted', false)
        .gte('event_date', today)
        .lte('event_date', in14)
        .neq('status', 'cancelled')
        .order('event_date'),
      supabase
        .from('events')
        .select('id, event_date, event_name, status, estimated_staff, number_of_shifts, actual_hotdogs_sold, sales_value_aud, charities(name), bunnings_stores(location), event_suppliers(status), event_packages(id)')
        .eq('is_deleted', false)
        .lt('event_date', today)
        .gte('event_date', minus60)
        .in('status', ['planned', 'confirmed', 'completed'])
        .order('event_date', { ascending: false }),
      supabase
        .from('orders')
        .select('id, event_date, status, delivery_address, delivery_contact_name, delivery_phone, charities(name)')
        .eq('is_deleted', false)
        .gte('event_date', today)
        .lte('event_date', in14)
        .in('status', ['pending', 'confirmed', 'scheduled'])
        .order('event_date'),
      supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ]);
    for (const r of [charities, upcoming, past, orders]) if (r.error) throw r.error;

    const requests: NeedsAttention['eventRequests'] = [];
    const upcomingIssues: NeedsAttention['upcomingEventsWithGaps'] = [];
    for (const e of (upcoming.data ?? []) as unknown as EventRow[]) {
      const label = { id: e.id, event_date: e.event_date, name: e.event_name, charity: e.charities?.name ?? null, store: e.bunnings_stores?.location ?? null, status: e.status };
      if (e.status === 'requested') {
        requests.push(label);
        continue;
      }
      const missing: string[] = [];
      if (e.status === 'planned') missing.push('not yet confirmed');
      if (!e.event_suppliers.some((s) => s.status === 'confirmed')) missing.push('no supplier confirmed');
      if (e.event_packages.length === 0) missing.push('no packages recorded');
      if (e.estimated_staff == null || e.number_of_shifts == null) missing.push('staff or shifts not entered');
      if (missing.length > 0) upcomingIssues.push({ ...label, missing });
    }
    // Requests further out than 14 days still need confirming.
    const { data: laterRequests, error: lrError } = await supabase
      .from('events')
      .select('id, event_date, event_name, status, charities(name), bunnings_stores(location)')
      .eq('is_deleted', false)
      .eq('status', 'requested')
      .gt('event_date', in14)
      .order('event_date');
    if (lrError) throw lrError;
    for (const e of (laterRequests ?? []) as unknown as EventRow[]) {
      requests.push({ id: e.id, event_date: e.event_date, name: e.event_name, charity: e.charities?.name ?? null, store: e.bunnings_stores?.location ?? null, status: e.status });
    }

    const resultsMissing = ((past.data ?? []) as unknown as EventRow[])
      .filter((e) => e.actual_hotdogs_sold == null && e.sales_value_aud == null)
      .map((e) => ({ id: e.id, event_date: e.event_date, name: e.event_name, charity: e.charities?.name ?? null, store: e.bunnings_stores?.location ?? null, status: e.status }));

    const orderIssues = ((orders.data ?? []) as unknown as {
      id: string; event_date: string; status: string; delivery_address: string | null; delivery_contact_name: string | null; delivery_phone: string | null; charities: { name: string } | null;
    }[])
      .map((o) => {
        const missing: string[] = [];
        if (o.status === 'pending') missing.push('still pending');
        if (!o.delivery_contact_name) missing.push('no delivery contact');
        if (!o.delivery_phone) missing.push('no delivery phone');
        return { id: o.id, event_date: o.event_date, charity: o.charities?.name ?? null, status: o.status, missing };
      })
      .filter((o) => o.missing.length > 0);

    const { data: overdue, error: overdueError } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, amount_aud, order_id, buyer')
      .eq('status', 'issued')
      .lt('due_date', today)
      .order('due_date');
    if (overdueError) throw overdueError;
    const overdueInvoices = ((overdue ?? []) as { id: string; invoice_number: string; due_date: string; amount_aud: number; order_id: string; buyer: { name?: string | null } | null }[]).map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      due_date: i.due_date,
      amount_aud: Number(i.amount_aud),
      order_id: i.order_id,
      charity: i.buyer?.name ?? null,
    }));

    return {
          today,
          charitiesAwaitingApproval: charities.data ?? [],
          eventRequests: requests,
          upcomingEventsWithGaps: upcomingIssues,
          ordersNeedingAttention: orderIssues,
          eventsMissingResults: resultsMissing,
          overdueInvoices,
          newFeedback: feedback.count ?? 0,
        };
}

/** Total number of items needing attention. */
export function attentionCount(n: NeedsAttention): number {
  return (
    n.charitiesAwaitingApproval.length +
    n.eventRequests.length +
    n.upcomingEventsWithGaps.length +
    n.ordersNeedingAttention.length +
    n.eventsMissingResults.length +
    n.overdueInvoices.length +
    n.newFeedback
  );
}
