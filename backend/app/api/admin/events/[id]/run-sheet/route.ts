/** GET /api/admin/events/:id/run-sheet?include_prices=true — the event run sheet as a PDF. */

import { z } from 'zod';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { buildRunSheetPdf, loadEventDoc, pdfResponseHeaders, safeFilename } from '@/lib/documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event id');
    const event = await loadEventDoc(id);
    if (!event) throw new NotFoundError('Event not found');
    const includePrices = new URL(request.url).searchParams.get('include_prices') === 'true';
    const pdf = await buildRunSheetPdf(event, { includePrices, audience: 'admin' });
    const filename = `Run-sheet-${event.event_date}-${safeFilename(event.event_name || event.charities?.name || '')}.pdf`;
    return new Response(Buffer.from(pdf), { headers: pdfResponseHeaders(filename, cors) });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
}
