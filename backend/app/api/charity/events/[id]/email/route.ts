/** POST /api/charity/events/:id/email { to, to_name?, note?, cc_self? } — emails the charity's run sheet copy (or, with document: 'results_summary', its results summary). */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { emailDocument, emailDocumentSchema, loadEventDoc } from '@/lib/documents';
import { buildEventDocument } from '@/lib/event-documents';

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
    const kind = body.document === 'results_summary' ? 'results_summary' : 'run_sheet';
    const doc = await buildEventDocument(event, kind, { includePrices: false, audience: 'charity' });
    const result = await emailDocument({
      recordType: 'event',
      recordId: id,
      document: kind,
      pdf: doc.pdf,
      filename: doc.filename,
      subject: doc.subject,
      intro: doc.intro,
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
