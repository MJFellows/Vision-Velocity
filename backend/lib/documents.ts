/**
 * Printable / emailable records: the order summary and the event run sheet.
 * Data is loaded with the service-role client and always filtered by record id
 * (and, for charity callers, by their own charity id), then laid out as a PDF.
 */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';
import { PdfWriter } from '@/lib/pdf';
import { SUPPORT_EMAIL, emailLayout, escapeHtml, sendMail } from '@/lib/mailer';

const COVER_LABELS: Record<string, string> = {
  inside: 'Inside',
  outside_covered: 'Outside, under cover',
  outside_uncovered: 'Outside, not under cover',
};
const STORAGE_LABELS: Record<string, string> = { shelf: 'Shelf', refrigerated: 'Refrigerated', frozen: 'Frozen' };
const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested by charity',
  planned: 'Planned',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  scheduled: 'Scheduled',
  delivered: 'Delivered',
  possible: 'Possible',
  declined: 'Declined',
};

export const label = (s: string | null | undefined) => (s ? STATUS_LABELS[s] ?? s : '');

const money = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === '' ? null : Number(n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });

export function longDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function printedOn(): string {
  return new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function shortRef(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// ---------------------------------------------------------------------------
// Order summary
// ---------------------------------------------------------------------------

export interface OrderDoc {
  id: string;
  charity_id: string;
  event_date: string;
  status: string;
  delivery_address: string;
  delivery_contact_name: string | null;
  delivery_phone: string | null;
  special_requests: string | null;
  total_price_aud: number;
  created_at: string;
  charities: { name: string; contact_name: string | null; email: string | null; phone: string | null } | null;
  packages: {
    name: string;
    description: string | null;
    package_components: { quantity: number; components: { name: string; quantity: number | null; unit: string | null; storage: string | null } | null }[];
  } | null;
}

export async function loadOrderDoc(id: string, charityId?: string): Promise<OrderDoc | null> {
  let q = getSupabaseAdmin()
    .from('orders')
    .select(
      'id, charity_id, event_date, status, delivery_address, delivery_contact_name, delivery_phone, special_requests, total_price_aud, created_at, charities(name, contact_name, email, phone), packages(name, description, package_components(quantity, components(name, quantity, unit, storage)))'
    )
    .eq('id', id)
    .eq('is_deleted', false);
  if (charityId) q = q.eq('charity_id', charityId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data as unknown as OrderDoc) ?? null;
}

export async function buildOrderSummaryPdf(o: OrderDoc): Promise<Uint8Array> {
  const pdf = await PdfWriter.create(`Order summary ${shortRef(o.id)} - printed ${printedOn()}`);
  pdf.title('Order summary', `${o.charities?.name ?? 'Charity'} · ${longDate(o.event_date)}`);
  pdf.notice('Order summary - not a tax invoice');

  pdf.heading('Order');
  pdf.row('Order reference', shortRef(o.id), true);
  pdf.row('Status', label(o.status), true);
  pdf.row('Event date', longDate(o.event_date), true);
  pdf.row('Package', o.packages?.name, true);
  pdf.row('Package description', o.packages?.description);
  pdf.row('Total price', money(o.total_price_aud), true);

  pdf.heading('Delivery');
  pdf.row('Address', o.delivery_address, true);
  pdf.row('Contact', o.delivery_contact_name, true);
  pdf.row('Phone', o.delivery_phone, true);
  pdf.row('Special requests', o.special_requests);

  pdf.heading('Charity');
  pdf.row('Name', o.charities?.name, true);
  pdf.row('Contact', o.charities?.contact_name);
  pdf.row('Email', o.charities?.email);
  pdf.row('Phone', o.charities?.phone);

  const items = o.packages?.package_components ?? [];
  if (items.length > 0) {
    pdf.heading('Package contents');
    pdf.table(
      ['Item', 'Size', 'Quantity', 'Storage'],
      items.map((i) => [
        i.components?.name ?? '',
        i.components?.quantity != null && i.components.unit ? `${i.components.quantity} ${i.components.unit}` : '',
        i.quantity,
        i.components?.storage ? STORAGE_LABELS[i.components.storage] ?? i.components.storage : '',
      ]),
      [0.45, 0.2, 0.15, 0.2]
    );
  }

  pdf.paragraph(`Questions about this order? Email ${SUPPORT_EMAIL}.`, 9.5);
  return pdf.finish();
}

// ---------------------------------------------------------------------------
// Event run sheet
// ---------------------------------------------------------------------------

export interface EventDoc {
  id: string;
  charity_id: string;
  event_date: string;
  status: string;
  event_name: string | null;
  notes: string | null;
  cover_type: string | null;
  estimated_hotdogs: number | null;
  estimated_staff: number | null;
  number_of_shifts: number | null;
  actual_hotdogs_sold: number | null;
  number_of_sales: number | null;
  sales_value_aud: number | null;
  charities: { name: string; contact_name: string | null; phone: string | null; email: string | null } | null;
  bunnings_stores: { location: string; store_address: string | null; store_phone: string | null; suburb: string | null; state: string | null; postcode: string | null } | null;
  event_suppliers: {
    status: string;
    suppliers: { store_name: string; supplier_chain: string; address: string | null; suburb: string | null; postcode: string | null; phone: string | null; contact_name: string | null; contact_mobile: string | null } | null;
  }[];
  event_packages: {
    quantity: number;
    packages: {
      name: string;
      base_price_aud: number;
      package_components: { quantity: number; components: { name: string; storage: string | null } | null }[];
    } | null;
  }[];
}

export async function loadEventDoc(id: string, charityId?: string): Promise<EventDoc | null> {
  let q = getSupabaseAdmin()
    .from('events')
    .select(
      'id, charity_id, event_date, status, event_name, notes, cover_type, estimated_hotdogs, estimated_staff, number_of_shifts, actual_hotdogs_sold, number_of_sales, sales_value_aud, charities(name, contact_name, phone, email), bunnings_stores(location, store_address, store_phone, suburb, state, postcode), event_suppliers(status, suppliers(store_name, supplier_chain, address, suburb, postcode, phone, contact_name, contact_mobile)), event_packages(quantity, packages(name, base_price_aud, package_components(quantity, components(name, storage))))'
    )
    .eq('id', id)
    .eq('is_deleted', false);
  if (charityId) q = q.eq('charity_id', charityId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data as unknown as EventDoc) ?? null;
}

export interface RunSheetOptions {
  includePrices: boolean;
  /** Charity copies leave out internal notes and supplier contact people. */
  audience: 'admin' | 'charity';
}

export async function buildRunSheetPdf(e: EventDoc, opts: RunSheetOptions): Promise<Uint8Array> {
  const title = e.event_name || `${e.charities?.name ?? 'Charity'} sausage sizzle`;
  const pdf = await PdfWriter.create(`Run sheet - ${title} - printed ${printedOn()}`);
  pdf.title(`Run sheet: ${title}`, `${longDate(e.event_date)} · ${e.bunnings_stores?.location ?? ''} Bunnings`);

  pdf.heading('The event');
  pdf.row('Date', longDate(e.event_date), true);
  pdf.row('Status', label(e.status), true);
  pdf.row('Charity', e.charities?.name, true);
  pdf.row('Stall location', e.cover_type ? COVER_LABELS[e.cover_type] : null, true);
  pdf.row('Number of shifts', e.number_of_shifts, true);
  pdf.row('Staff needed', e.estimated_staff, true);
  pdf.row('Estimated hotdogs', e.estimated_hotdogs, true);

  pdf.heading('Bunnings store');
  const s = e.bunnings_stores;
  pdf.row('Store', s?.location, true);
  pdf.row('Address', [s?.store_address, s?.suburb, s?.state, s?.postcode].filter(Boolean).join(', '), true);
  pdf.row('Phone', s?.store_phone, true);

  pdf.heading('Charity contact');
  pdf.row('Name', e.charities?.contact_name, true);
  pdf.row('Phone', e.charities?.phone, true);
  pdf.row('Email', e.charities?.email);

  pdf.heading('Packages');
  pdf.table(
    opts.includePrices ? ['Package', 'Quantity', 'Unit price'] : ['Package', 'Quantity'],
    e.event_packages.map((p) =>
      opts.includePrices ? [p.packages?.name ?? '', p.quantity, money(p.packages?.base_price_aud)] : [p.packages?.name ?? '', p.quantity]
    ),
    opts.includePrices ? [0.6, 0.2, 0.2] : [0.75, 0.25]
  );

  // Pick list: everything to pack, cold items flagged.
  const pick = new Map<string, { qty: number; storage: string | null }>();
  for (const p of e.event_packages) {
    for (const c of p.packages?.package_components ?? []) {
      const key = c.components?.name ?? '';
      const prev = pick.get(key);
      pick.set(key, { qty: (prev?.qty ?? 0) + Number(c.quantity) * Number(p.quantity), storage: c.components?.storage ?? null });
    }
  }
  if (pick.size > 0) {
    pdf.heading('Pick list (pack cold items last)');
    const order = { shelf: 0, refrigerated: 1, frozen: 2 } as Record<string, number>;
    pdf.table(
      ['Item', 'Total quantity', 'Storage'],
      [...pick.entries()]
        .sort((a, b) => (order[a[1].storage ?? 'shelf'] ?? 0) - (order[b[1].storage ?? 'shelf'] ?? 0))
        .map(([name, v]) => [name, v.qty, v.storage ? STORAGE_LABELS[v.storage] ?? v.storage : '']),
      [0.55, 0.2, 0.25]
    );
  }

  const suppliers = e.event_suppliers.filter((x) => x.status !== 'declined');
  if (suppliers.length > 0) {
    pdf.heading('Supplier stores');
    pdf.table(
      opts.audience === 'admin' ? ['Store', 'Address', 'Phone', 'Contact', 'Status'] : ['Store', 'Address', 'Phone', 'Status'],
      suppliers.map((x) => {
        const sp = x.suppliers;
        const base = [
          sp ? `${sp.supplier_chain} ${sp.store_name}` : '',
          [sp?.address, sp?.suburb, sp?.postcode].filter(Boolean).join(', '),
          sp?.phone ?? '',
        ];
        return opts.audience === 'admin'
          ? [...base, [sp?.contact_name, sp?.contact_mobile].filter(Boolean).join(' '), label(x.status)]
          : [...base, label(x.status)];
      }),
      opts.audience === 'admin' ? [0.24, 0.3, 0.14, 0.18, 0.14] : [0.3, 0.4, 0.15, 0.15]
    );
  }

  if (opts.audience === 'admin' && e.notes) {
    pdf.heading('Notes');
    pdf.paragraph(e.notes);
  }

  pdf.keepTogether(130);
  pdf.heading('Results');
  if (e.actual_hotdogs_sold != null || e.number_of_sales != null || e.sales_value_aud != null) {
    pdf.row('Hotdogs sold', e.actual_hotdogs_sold, true);
    pdf.row('Number of sales', e.number_of_sales, true);
    pdf.row('Value of sales', money(e.sales_value_aud), true);
  } else {
    pdf.paragraph('Fill in on the day, then enter the figures on the website:', 9.5);
    pdf.writeInLines(['Hotdogs sold', 'Number of sales', 'Value of sales ($)']);
  }

  pdf.paragraph(`Vision Velocity · ${SUPPORT_EMAIL}`, 9);
  return pdf.finish();
}

// ---------------------------------------------------------------------------
// Emailing a document
// ---------------------------------------------------------------------------

export async function emailDocument(params: {
  recordType: 'order' | 'event';
  recordId: string;
  document: 'order_summary' | 'run_sheet';
  pdf: Uint8Array;
  filename: string;
  subject: string;
  intro: string;
  to: string;
  toName?: string | null;
  note?: string | null;
  ccSelf?: boolean;
  includePrices: boolean;
  sentBy: { type: 'admin' | 'charity'; userId: string | null; email: string | null; name?: string | null };
}): Promise<{ sent: boolean; error?: string }> {
  let sent = false;
  let error: string | undefined;
  try {
    const sender = params.sentBy.name || params.sentBy.email || 'Vision Velocity';
    const noteHtml = params.note ? `<p style="white-space:pre-wrap;border-left:3px solid #e5e7eb;padding-left:12px">${escapeHtml(params.note)}</p>` : '';
    await sendMail({
      to: params.to,
      cc: params.ccSelf && params.sentBy.email && params.sentBy.email !== params.to ? params.sentBy.email : undefined,
      replyTo: params.sentBy.email ?? undefined,
      subject: params.subject,
      html: emailLayout(params.subject, `<p>Hello${params.toName ? ` ${escapeHtml(params.toName)}` : ''},</p><p>${escapeHtml(params.intro)}</p>${noteHtml}<p>Sent by ${escapeHtml(sender)} via the Vision Velocity website. The document is attached as a PDF.</p>`),
      text: `Hello${params.toName ? ` ${params.toName}` : ''},\n\n${params.intro}\n\n${params.note ? `${params.note}\n\n` : ''}Sent by ${sender} via the Vision Velocity website. The document is attached as a PDF.`,
      attachments: [{ filename: params.filename, content: params.pdf }],
    });
    sent = true;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  await (getSupabaseAdmin() as SupabaseClient).from('record_emails').insert({
    record_type: params.recordType,
    record_id: params.recordId,
    document: params.document,
    recipient_email: params.to,
    recipient_name: params.toName ?? null,
    note: params.note ?? null,
    include_prices: params.includePrices,
    sent_by_user_id: params.sentBy.userId,
    sent_by_email: params.sentBy.email,
    sent_by_type: params.sentBy.type,
    status: sent ? 'sent' : 'failed',
    error: error ?? null,
  });
  return { sent, error };
}

export function pdfResponseHeaders(filename: string, cors: Record<string, string>, inline = false): Record<string, string> {
  return {
    ...cors,
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
    'Cache-Control': 'no-store',
  };
}

export function safeFilename(s: string): string {
  return s.replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'document';
}

export const emailDocumentSchema = z.object({
  to: z.string().trim().toLowerCase().email('Enter a valid email address'),
  to_name: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  cc_self: z.boolean().optional(),
  include_prices: z.boolean().optional(),
});
