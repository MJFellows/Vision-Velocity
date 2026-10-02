/**
 * Automatic order emails to the charity (decision 2026-10-02):
 *  - "Order received" when an order is created, with the order summary PDF.
 *  - "Order confirmed" when an order's status first becomes Confirmed, with
 *    the invoice PDF (issued at that moment) and the order summary.
 * Both are best-effort: a failed email never undoes the order change. Every
 * attempt is logged in automated_emails, and sent documents also appear in
 * the record's "Already emailed" list (record_emails, sent by "system").
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { buildOrderSummaryPdf, emailDocument, loadOrderDoc, longDate, safeFilename, shortRef } from '@/lib/documents';
import { buildInvoicePdf, invoiceFilename, issueInvoiceForOrder } from '@/lib/invoices';
import { ValidationError } from '@/utils/errors';

export interface AutoEmailResult {
  status: 'sent' | 'failed' | 'skipped';
  detail: string;
  invoiceNumber?: string;
}

async function logAuto(kind: 'order_received' | 'order_confirmed', orderId: string, recipients: string, r: AutoEmailResult) {
  await getSupabaseAdmin()
    .from('automated_emails')
    .insert({ kind, record_id: orderId, recipients, status: r.status, detail: r.detail.slice(0, 1000) })
    .then(({ error }) => {
      if (error) console.warn('[order-emails] log failed', error.message);
    });
}

export async function sendOrderReceivedEmail(orderId: string): Promise<AutoEmailResult> {
  const order = await loadOrderDoc(orderId);
  if (!order) return { status: 'skipped', detail: 'Order not found' };
  const to = order.charities?.email;
  if (!to) {
    const r: AutoEmailResult = { status: 'skipped', detail: 'The charity has no email address' };
    await logAuto('order_received', orderId, '', r);
    return r;
  }
  const pdf = await buildOrderSummaryPdf(order);
  const sent = await emailDocument({
    recordType: 'order',
    recordId: orderId,
    document: 'order_summary',
    pdf,
    filename: `Order-summary-${shortRef(order.id)}-${safeFilename(order.charities?.name ?? '')}.pdf`,
    subject: `Order received: ${order.packages?.name ?? 'your order'} for ${longDate(order.event_date)}`,
    intro: `Thank you — we have recorded an order for ${order.charities?.name ?? 'your charity'} for the event on ${longDate(order.event_date)} (reference ${shortRef(order.id)}). The order summary is attached; please check the delivery details and let us know of any changes. We will email you again when the order is confirmed.`,
    to,
    toName: order.charities?.contact_name,
    includePrices: true,
    sentBy: { type: 'system', userId: null, email: null, name: 'Vision Velocity' },
    signOff: 'You can also see your orders after signing in to the charity area of the Vision Velocity website.',
  });
  const r: AutoEmailResult = sent.sent ? { status: 'sent', detail: `Order summary to ${to}` } : { status: 'failed', detail: sent.error ?? 'Email failed' };
  await logAuto('order_received', orderId, to, r);
  return r;
}

export async function sendOrderConfirmedEmail(orderId: string, byEmail: string | null): Promise<AutoEmailResult> {
  // Only once per order: re-confirming later (for example after a status mix-up) does not email again.
  const { count } = await getSupabaseAdmin()
    .from('automated_emails')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'order_confirmed')
    .eq('record_id', orderId)
    .eq('status', 'sent');
  if ((count ?? 0) > 0) return { status: 'skipped', detail: 'The confirmation was already emailed for this order' };
  const order = await loadOrderDoc(orderId);
  if (!order) return { status: 'skipped', detail: 'Order not found' };
  const to = order.charities?.email;
  if (!to) {
    const r: AutoEmailResult = { status: 'skipped', detail: 'The charity has no email address' };
    await logAuto('order_confirmed', orderId, '', r);
    return r;
  }

  const summary = await buildOrderSummaryPdf(order);
  const summaryName = `Order-summary-${shortRef(order.id)}-${safeFilename(order.charities?.name ?? '')}.pdf`;

  let invoiceNote = '';
  let invoiceNumber: string | undefined;
  let mainPdf = summary;
  let mainName = summaryName;
  let extra: { filename: string; content: Uint8Array }[] = [];
  let document: 'invoice' | 'order_summary' = 'order_summary';
  try {
    const { invoice } = await issueInvoiceForOrder(orderId, byEmail);
    invoiceNumber = invoice.invoice_number;
    mainPdf = await buildInvoicePdf(invoice);
    mainName = invoiceFilename(invoice);
    extra = [{ filename: summaryName, content: summary }];
    document = 'invoice';
    invoiceNote = ` Invoice ${invoice.invoice_number} is attached, with payment details, together with the order summary.`;
  } catch (e) {
    // Settings incomplete: still confirm the order, with the summary only.
    if (!(e instanceof ValidationError)) throw e;
    invoiceNote = ' The order summary is attached; your invoice will follow separately.';
  }

  const sent = await emailDocument({
    recordType: 'order',
    recordId: orderId,
    document,
    pdf: mainPdf,
    filename: mainName,
    extraAttachments: extra,
    subject: `Order confirmed: ${order.packages?.name ?? 'your order'} for ${longDate(order.event_date)}`,
    intro: `Your order for the event on ${longDate(order.event_date)} (reference ${shortRef(order.id)}) is confirmed.${invoiceNote}`,
    to,
    toName: order.charities?.contact_name,
    includePrices: true,
    sentBy: { type: 'system', userId: null, email: null, name: 'Vision Velocity' },
    signOff: 'You can also see your orders and invoices after signing in to the charity area of the Vision Velocity website.',
  });
  if (sent.sent && invoiceNumber) {
    await getSupabaseAdmin().from('invoices').update({ emailed_at: new Date().toISOString() }).eq('invoice_number', invoiceNumber);
  }
  const r: AutoEmailResult = sent.sent
    ? { status: 'sent', detail: `${invoiceNumber ? `Invoice ${invoiceNumber} and order summary` : 'Order summary (no invoice: settings incomplete)'} to ${to}`, invoiceNumber }
    : { status: 'failed', detail: sent.error ?? 'Email failed', invoiceNumber };
  await logAuto('order_confirmed', orderId, to, r);
  return r;
}
