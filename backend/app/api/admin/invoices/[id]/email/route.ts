/** POST /api/admin/invoices/:id/email { to, to_name?, note?, cc_self? } — emails the invoice PDF and logs it on the order. */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { buildInvoicePdf, invoiceFilename, loadInvoice } from '@/lib/invoices';
import { emailDocument, emailDocumentSchema } from '@/lib/documents';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { logAdminAction } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid invoice');
    const body = await parseBody(request, emailDocumentSchema, 'Invalid email request');
    const inv = await loadInvoice(id);
    if (!inv) throw new NotFoundError('Invoice not found');
    if (inv.status === 'void') throw new ValidationError('This invoice is void and should not be sent.');
    const pdf = await buildInvoicePdf(inv);
    const result = await emailDocument({
      recordType: 'order',
      recordId: inv.order_id,
      document: 'invoice',
      pdf,
      filename: invoiceFilename(inv),
      subject: `Invoice ${inv.invoice_number} from ${String(inv.seller.business_name ?? 'Vision Velocity')}`,
      intro: `Please find attached invoice ${inv.invoice_number}${inv.status === 'paid' ? ' (paid — for your records)' : `, due ${new Date(`${inv.due_date}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`}.`,
      to: body.to,
      toName: body.to_name,
      note: body.note,
      ccSelf: body.cc_self,
      includePrices: true,
      sentBy: { type: 'admin', userId: request.headers.get('x-user-id'), email: request.headers.get('x-user-email') },
    });
    await logAdminAction({
      adminUserId: request.headers.get('x-user-id'),
      userEmail: request.headers.get('x-user-email') ?? 'unknown',
      action: result.sent ? 'emailed_invoice' : 'email_invoice_failed',
      description: `Invoice ${inv.invoice_number} to ${body.to}`,
      entityType: 'invoices',
      entityId: id,
      recordIds: [id, inv.order_id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
      status: result.sent ? 'success' : 'error',
      errorDetail: result.error ?? null,
    });
    if (!result.sent) throw new Error(`Email could not be sent: ${result.error}`);
    if (!inv.emailed_at) await getSupabaseAdmin().from('invoices').update({ emailed_at: new Date().toISOString() }).eq('id', id);
    return json(request, { data: { sent: true } });
  } catch (error) {
    return errorResponse(request, error);
  }
}
