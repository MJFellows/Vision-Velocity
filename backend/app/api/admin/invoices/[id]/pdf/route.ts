/** GET /api/admin/invoices/:id/pdf — the invoice as a PDF. */

import { z } from 'zod';
import { corsFor, errorResponse } from '@/lib/route-helpers';
import { buildInvoicePdf, invoiceFilename, loadInvoice } from '@/lib/invoices';
import { pdfResponseHeaders } from '@/lib/documents';
import { NotFoundError, ValidationError } from '@/utils/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid invoice');
    const inv = await loadInvoice(id);
    if (!inv) throw new NotFoundError('Invoice not found');
    const pdf = await buildInvoicePdf(inv);
    return new Response(Buffer.from(pdf), { headers: pdfResponseHeaders(invoiceFilename(inv), corsFor(request)) });
  } catch (error) {
    return errorResponse(request, error);
  }
}
