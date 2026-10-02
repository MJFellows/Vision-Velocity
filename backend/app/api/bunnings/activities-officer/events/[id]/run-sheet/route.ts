/** GET /api/bunnings/activities-officer/events/:id/run-sheet — run sheet for an event at the AO's own store (no prices, notes or suppliers). */

import { z } from 'zod';
import { corsFor, errorResponse } from '@/lib/route-helpers';
import { requireAoSession } from '@/lib/bunnings-ao';
import { buildRunSheetPdf, loadEventDoc, pdfResponseHeaders, safeFilename } from '@/lib/documents';
import { getSupabaseAdmin } from '@/lib/supabase';
import { NotFoundError, ValidationError } from '@/utils/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await requireAoSession(request);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event');
    const { data: owner, error } = await getSupabaseAdmin()
      .from('events')
      .select('id')
      .eq('id', id)
      .eq('bunnings_store_id', session.bunningsStoreId)
      .eq('is_deleted', false)
      .neq('status', 'requested')
      .maybeSingle();
    if (error) throw error;
    if (!owner) throw new NotFoundError('Event not found');
    const event = await loadEventDoc(id);
    if (!event) throw new NotFoundError('Event not found');
    const pdf = await buildRunSheetPdf(event, { includePrices: false, audience: 'bunnings' });
    const filename = `Run-sheet-${event.event_date}-${safeFilename(event.event_name || event.charities?.name || '')}.pdf`;
    return new Response(Buffer.from(pdf), { headers: pdfResponseHeaders(filename, corsFor(request)) });
  } catch (error) {
    return errorResponse(request, error);
  }
}
