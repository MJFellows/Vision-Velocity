/**
 * Invoices for orders.
 *
 * Vision Velocity is not registered for GST (decision 2026-10-02), so documents
 * are titled "Invoice", never "Tax invoice", and state that no GST is charged
 * (ATO: businesses not registered for GST must not use the words "tax invoice").
 * The seller's ABN is required before an invoice can be issued, so payers do
 * not need to withhold tax for a missing ABN.
 *
 * One live (not void) invoice per order. The amount, seller and buyer details
 * are copied onto the invoice when it is issued, so later edits to the order
 * or the settings do not change an invoice already sent. To correct an
 * invoice, void it and issue a new one.
 */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { PdfWriter } from '@/lib/pdf';
import { ValidationError } from '@/utils/errors';
import { brisbaneToday } from '@/lib/charity-data';

export interface InvoiceSettings {
  business_name: string;
  abn: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  payment_terms_days: number;
  payment_instructions: string | null;
  footer_note: string | null;
  gst_registered: boolean;
  updated_at: string;
  updated_by_email: string | null;
}

export const invoiceSettingsSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is required').max(200),
  abn: z
    .string()
    .transform((s) => s.replace(/\s+/g, ''))
    .refine((s) => s === '' || /^[0-9]{11}$/.test(s), 'An ABN has 11 digits')
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional(),
  address: z.string().trim().max(500).nullable().optional(),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  payment_terms_days: z.number().int().min(0, 'Cannot be negative').max(120, 'At most 120 days'),
  payment_instructions: z.string().trim().max(2000).nullable().optional(),
  footer_note: z.string().trim().max(1000).nullable().optional(),
});

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  charity_id: string;
  issue_date: string;
  due_date: string;
  amount_aud: number;
  description: string;
  seller: Record<string, string | number | boolean | null>;
  buyer: Record<string, string | null>;
  status: 'issued' | 'paid' | 'void';
  paid_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  emailed_at: string | null;
  created_at: string;
  created_by_email: string | null;
}

/** Hyphen-free ABN shown in the usual 2-3-3-3 grouping. */
export function formatAbn(abn: string | null | undefined): string {
  if (!abn) return '';
  const d = abn.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : abn;
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const { data, error } = await getSupabaseAdmin().from('invoice_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data as InvoiceSettings;
}

/** Why invoices cannot be issued yet, or null when the settings are complete enough. */
export function invoiceSettingsProblem(s: InvoiceSettings): string | null {
  if (!s.abn) return 'Add Vision Velocity\'s ABN on the Invoice settings page before invoices can be issued.';
  if (!s.payment_instructions) return 'Add payment instructions on the Invoice settings page before invoices can be issued.';
  return null;
}

export async function getLiveInvoiceForOrder(orderId: string): Promise<Invoice | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('invoices')
    .select('*')
    .eq('order_id', orderId)
    .neq('status', 'void')
    .maybeSingle();
  if (error) throw error;
  return (data as Invoice) ?? null;
}

export async function loadInvoice(id: string, charityId?: string): Promise<Invoice | null> {
  let q = getSupabaseAdmin().from('invoices').select('*').eq('id', id);
  if (charityId) q = q.eq('charity_id', charityId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data as Invoice) ?? null;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the order's live invoice, issuing one first if there is none.
 * Throws a ValidationError (with a plain-language message) if the invoice
 * settings are incomplete.
 */
export async function issueInvoiceForOrder(orderId: string, byEmail: string | null): Promise<{ invoice: Invoice; created: boolean }> {
  const existing = await getLiveInvoiceForOrder(orderId);
  if (existing) return { invoice: existing, created: false };

  const settings = await getInvoiceSettings();
  const problem = invoiceSettingsProblem(settings);
  if (problem) throw new ValidationError(problem);

  const admin = getSupabaseAdmin();
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, charity_id, event_date, total_price_aud, status, is_deleted, packages(name), charities(name, contact_name, email, phone, location, postcode, tax_id)')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order || order.is_deleted) throw new ValidationError('Order not found');
  if (order.status === 'cancelled') throw new ValidationError('A cancelled order cannot be invoiced');

  const pkg = order.packages as unknown as { name: string } | null;
  const charity = order.charities as unknown as {
    name: string; contact_name: string | null; email: string | null; phone: string | null; location: string | null; postcode: string | null; tax_id: string | null;
  } | null;

  const { data: number, error: numberError } = await admin.rpc('next_invoice_number');
  if (numberError) throw numberError;

  const issueDate = brisbaneToday();
  const eventDate = new Date(`${order.event_date}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const { data: inserted, error } = await admin
    .from('invoices')
    .insert({
      invoice_number: number as string,
      order_id: order.id,
      charity_id: order.charity_id,
      issue_date: issueDate,
      due_date: addDays(issueDate, settings.payment_terms_days),
      amount_aud: Number(order.total_price_aud),
      description: `${pkg?.name ?? 'Sausage sizzle package'} for the event on ${eventDate}`,
      seller: {
        business_name: settings.business_name,
        abn: settings.abn,
        address: settings.address,
        email: settings.email,
        phone: settings.phone,
        payment_terms_days: settings.payment_terms_days,
        payment_instructions: settings.payment_instructions,
        footer_note: settings.footer_note,
        gst_registered: settings.gst_registered,
      },
      buyer: {
        name: charity?.name ?? null,
        contact_name: charity?.contact_name ?? null,
        email: charity?.email ?? null,
        phone: charity?.phone ?? null,
        address: [charity?.location, charity?.postcode].filter(Boolean).join(' ') || null,
        abn: charity?.tax_id ?? null,
      },
      created_by_email: byEmail,
    })
    .select('*')
    .single();
  if (error) {
    // Another request issued one at the same moment: use that one.
    if (error.code === '23505') {
      const again = await getLiveInvoiceForOrder(orderId);
      if (again) return { invoice: again, created: false };
    }
    throw error;
  }
  return { invoice: inserted as Invoice, created: true };
}

const money = (n: number | string) => Number(n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
const dmy = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export async function buildInvoicePdf(inv: Invoice): Promise<Uint8Array> {
  const s = inv.seller;
  const b = inv.buyer;
  const pdf = await PdfWriter.create(`Invoice ${inv.invoice_number} - ${String(s.business_name ?? 'Vision Velocity')}`);
  pdf.title('Invoice', `${inv.invoice_number} · ${String(s.business_name ?? '')}`);
  if (inv.status === 'void') pdf.notice(`VOID - this invoice was cancelled${inv.void_reason ? `: ${inv.void_reason}` : ''}. Do not pay it.`);
  else if (inv.status === 'paid') pdf.notice(`Paid${inv.paid_at ? ` on ${dmy(inv.paid_at)}` : ''} - thank you.`);

  pdf.heading('From');
  pdf.row('Business', String(s.business_name ?? ''), true);
  pdf.row('ABN', formatAbn(s.abn as string | null), true);
  pdf.row('Address', (s.address as string | null) ?? null);
  pdf.row('Email', (s.email as string | null) ?? null);
  pdf.row('Phone', (s.phone as string | null) ?? null);

  pdf.heading('To');
  pdf.row('Charity', b.name, true);
  pdf.row('Contact', b.contact_name);
  pdf.row('Address', b.address);
  pdf.row('Email', b.email);
  pdf.row('ABN', b.abn ? formatAbn(b.abn) : null);

  pdf.heading('Invoice details');
  pdf.row('Invoice number', inv.invoice_number, true);
  pdf.row('Date of issue', dmy(inv.issue_date), true);
  pdf.row('Payment due', dmy(inv.due_date), true);
  pdf.row('Order reference', inv.order_id.slice(0, 8).toUpperCase(), true);

  pdf.heading('Items');
  pdf.table(['Description', 'Amount'], [[inv.description, money(inv.amount_aud)], ['Total due', money(inv.amount_aud)]], [0.75, 0.25]);
  if (!s.gst_registered) {
    pdf.paragraph(`No GST has been charged. ${String(s.business_name ?? 'The supplier')} is not registered for GST.`, 9.5);
  }

  if (s.payment_instructions) {
    pdf.heading('How to pay');
    pdf.paragraph(String(s.payment_instructions));
    pdf.paragraph(`Please quote invoice number ${inv.invoice_number} with your payment.`, 9.5);
  }
  if (s.footer_note) pdf.paragraph(String(s.footer_note), 9);
  return pdf.finish();
}

export function invoiceFilename(inv: Invoice): string {
  const name = (inv.buyer.name ?? '').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40);
  return `Invoice-${inv.invoice_number}${name ? `-${name}` : ''}.pdf`;
}
