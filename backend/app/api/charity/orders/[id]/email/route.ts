/** POST /api/charity/orders/:id/email { to, to_name?, note?, cc_self? } — emails the charity's order summary. */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { buildOrderSummaryPdf, emailDocument, emailDocumentSchema, loadOrderDoc, longDate, safeFilename, shortRef } from '@/lib/documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const caller = await requireCharityCaller(request);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid order');
    const body = await parseBody(request, emailDocumentSchema, 'Invalid email request');
    const order = await loadOrderDoc(id, caller.charityId);
    if (!order) throw new NotFoundError('Order not found');
    const pdf = await buildOrderSummaryPdf(order);
    const result = await emailDocument({
      recordType: 'order',
      recordId: id,
      document: 'order_summary',
      pdf,
      filename: `Order-summary-${shortRef(order.id)}-${safeFilename(caller.charityName)}.pdf`,
      subject: `Order summary: ${caller.charityName}, ${longDate(order.event_date)}`,
      intro: `Please find attached the order summary (reference ${shortRef(order.id)}) for ${caller.charityName} on ${longDate(order.event_date)}. This is an order summary, not a tax invoice.`,
      to: body.to,
      toName: body.to_name,
      note: body.note,
      ccSelf: body.cc_self,
      includePrices: true,
      sentBy: { type: 'charity', userId: caller.authUserId, email: caller.email, name: `${caller.name ?? caller.email} (${caller.charityName})` },
    });
    if (!result.sent) throw new Error(`Email could not be sent: ${result.error}`);
    return json(request, { data: { sent: true } });
  } catch (error) {
    return errorResponse(request, error);
  }
}
