/** GET /api/charity/orders/:id/document — the order summary PDF for the charity's own order. */

import { z } from 'zod';
import { errorResponse, corsFor } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { buildOrderSummaryPdf, loadOrderDoc, pdfResponseHeaders, safeFilename, shortRef } from '@/lib/documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const caller = await requireCharityCaller(request);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid order');
    const order = await loadOrderDoc(id, caller.charityId);
    if (!order) throw new NotFoundError('Order not found');
    const pdf = await buildOrderSummaryPdf(order);
    return new Response(Buffer.from(pdf), {
      headers: pdfResponseHeaders(`Order-summary-${shortRef(order.id)}-${safeFilename(caller.charityName)}.pdf`, corsFor(request)),
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}
