/** POST /api/charity/events/:id/email { to, to_name?, note?, cc_self? } — emails the charity's run sheet copy. */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { buildRunSheetPdf, emailDocument, emailDocumentSchema, loadEventDoc, longDate, safeFilename } from '@/lib/documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const caller = await requireCharityCaller(request);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event');
    const body = await parseBody(request, emailDocumentSchema, 'Invalid email request');
    const event = await loadEventDoc(id, caller.charityId);
    if (!event) throw new NotFoundError('Event not found');
    const pdf = await buildRunSheetPdf(event, { includePrices: false, audience: 'charity' });
    const title = event.event_name || `${caller.charityName} sausage sizzle`;
    const result = await emailDocument({
      recordType: 'event',
      recordId: id,
      document: 'run_sheet',
      pdf,
      filename: `Run-sheet-${event.event_date}-${safeFilename(event.event_name || caller.charityName)}.pdf`,
      subject: `Run sheet: ${title}, ${longDate(event.event_date)}`,
      intro: `Please find attached the run sheet for ${title} at ${event.bunnings_stores?.location ?? 'Bunnings'} on ${longDate(event.event_date)}.`,
      to: body.to,
      toName: body.to_name,
      note: body.note,
      ccSelf: body.cc_self,
      includePrices: false,
      sentBy: { type: 'charity', userId: caller.authUserId, email: caller.email, name: `${caller.name ?? caller.email} (${caller.charityName})` },
    });
    if (!result.sent) throw new Error(`Email could not be sent: ${result.error}`);
    return json(request, { data: { sent: true } });
  } catch (error) {
    return errorResponse(request, error);
  }
}
