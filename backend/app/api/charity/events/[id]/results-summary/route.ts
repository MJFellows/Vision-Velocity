/** GET — the charity's own event results summary as a PDF. */

import { z } from 'zod';
import { corsFor, errorResponse } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { loadEventDoc, pdfResponseHeaders } from '@/lib/documents';
import { buildEventDocument } from '@/lib/event-documents';
import { NotFoundError, ValidationError } from '@/utils/errors';

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
    const doc = await buildEventDocument(event, 'results_summary', { includePrices: false, audience: 'charity' });
    return new Response(Buffer.from(doc.pdf), { headers: pdfResponseHeaders(doc.filename, corsFor(request)) });
  } catch (error) {
    return errorResponse(request, error);
  }
}
