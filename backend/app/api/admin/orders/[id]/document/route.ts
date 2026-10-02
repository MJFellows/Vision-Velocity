/** GET /api/admin/orders/:id/document — the order summary as a PDF (labelled "not a tax invoice"). */

import { z } from 'zod';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { buildOrderSummaryPdf, loadOrderDoc, pdfResponseHeaders, safeFilename, shortRef } from '@/lib/documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid order id');
    const order = await loadOrderDoc(id);
    if (!order) throw new NotFoundError('Order not found');
    const pdf = await buildOrderSummaryPdf(order);
    const filename = `Order-summary-${shortRef(order.id)}-${safeFilename(order.charities?.name ?? '')}.pdf`;
    return new Response(Buffer.from(pdf), { headers: pdfResponseHeaders(filename, cors) });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
}
