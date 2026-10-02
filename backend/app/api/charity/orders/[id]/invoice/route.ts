/** GET /api/charity/orders/:id/invoice — the invoice PDF for the charity's own order (404 if none issued). */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { errorResponse, corsFor } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { buildInvoicePdf, invoiceFilename, type Invoice } from '@/lib/invoices';
import { pdfResponseHeaders } from '@/lib/documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const caller = await requireCharityCaller(request);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid order');
    const { data, error } = await getSupabaseAdmin()
      .from('invoices')
      .select('*')
      .eq('order_id', id)
      .eq('charity_id', caller.charityId)
      .neq('status', 'void')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('No invoice has been issued for this order yet');
    const inv = data as Invoice;
    const pdf = await buildInvoicePdf(inv);
    return new Response(Buffer.from(pdf), { headers: pdfResponseHeaders(invoiceFilename(inv), corsFor(request)) });
  } catch (error) {
    return errorResponse(request, error);
  }
}
