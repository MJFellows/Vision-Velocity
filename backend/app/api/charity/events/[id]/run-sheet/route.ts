/** GET /api/charity/events/:id/run-sheet — the charity's copy of the run sheet (no internal notes or supplier contact people). */

import { z } from 'zod';
import { errorResponse, corsFor } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { buildRunSheetPdf, loadEventDoc, pdfResponseHeaders, safeFilename } from '@/lib/documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const caller = await requireCharityCaller(request);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event');
    const event = await loadEventDoc(id, caller.charityId);
    if (!event) throw new NotFoundError('Event not found');
    const pdf = await buildRunSheetPdf(event, { includePrices: false, audience: 'charity' });
    const filename = `Run-sheet-${event.event_date}-${safeFilename(event.event_name || event.charities?.name || '')}.pdf`;
    return new Response(Buffer.from(pdf), { headers: pdfResponseHeaders(filename, corsFor(request)) });
  } catch (error) {
    return errorResponse(request, error);
  }
}
