/** POST /api/admin/orders/:id/email { to, to_name?, note?, cc_self? } — emails the order summary PDF and logs it. */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { logAdminAction } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';
import { buildOrderSummaryPdf, emailDocument, emailDocumentSchema, loadOrderDoc, longDate, safeFilename, shortRef } from '@/lib/documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid order id');
    const parsed = emailDocumentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ValidationError('Invalid email request', Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])));
    const order = await loadOrderDoc(id);
    if (!order) throw new NotFoundError('Order not found');

    const pdf = await buildOrderSummaryPdf(order);
    const result = await emailDocument({
      recordType: 'order',
      recordId: id,
      document: 'order_summary',
      pdf,
      filename: `Order-summary-${shortRef(order.id)}-${safeFilename(order.charities?.name ?? '')}.pdf`,
      subject: `Order summary: ${order.charities?.name ?? 'charity'}, ${longDate(order.event_date)}`,
      intro: `Please find attached the order summary (reference ${shortRef(order.id)}) for ${order.charities?.name ?? 'the charity'} on ${longDate(order.event_date)}. This is an order summary, not a tax invoice.`,
      to: parsed.data.to,
      toName: parsed.data.to_name,
      note: parsed.data.note,
      ccSelf: parsed.data.cc_self,
      includePrices: true,
      sentBy: { type: 'admin', userId: request.headers.get('x-user-id'), email: request.headers.get('x-user-email') },
    });
    await logAdminAction({
      adminUserId: request.headers.get('x-user-id'),
      userEmail: request.headers.get('x-user-email') ?? 'unknown',
      action: result.sent ? 'emailed_order_summary' : 'email_order_summary_failed',
      description: `Order summary ${shortRef(id)} to ${parsed.data.to}`,
      entityType: 'orders',
      entityId: id,
      recordIds: [id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
      status: result.sent ? 'success' : 'error',
      errorDetail: result.error ?? null,
    });
    if (!result.sent) throw new Error(`Email could not be sent: ${result.error}`);
    return NextResponse.json({ data: { sent: true } }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
}
