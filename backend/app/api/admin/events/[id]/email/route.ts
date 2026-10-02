/** POST /api/admin/events/:id/email { to, to_name?, note?, cc_self?, include_prices?, document? } — emails the run sheet (or results summary / supplier sheet) PDF and logs it. */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { logAdminAction } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';
import { emailDocument, emailDocumentSchema, loadEventDoc } from '@/lib/documents';
import { buildEventDocument } from '@/lib/event-documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event id');
    const parsed = emailDocumentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ValidationError('Invalid email request', Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])));
    const event = await loadEventDoc(id);
    if (!event) throw new NotFoundError('Event not found');

    const includePrices = parsed.data.include_prices ?? false;
    const kind = parsed.data.document ?? 'run_sheet';
    const doc = await buildEventDocument(event, kind, { includePrices, audience: 'admin' });
    const result = await emailDocument({
      recordType: 'event',
      recordId: id,
      document: kind,
      pdf: doc.pdf,
      filename: doc.filename,
      subject: doc.subject,
      intro: doc.intro,
      to: parsed.data.to,
      toName: parsed.data.to_name,
      note: parsed.data.note,
      ccSelf: parsed.data.cc_self,
      includePrices,
      sentBy: { type: 'admin', userId: request.headers.get('x-user-id'), email: request.headers.get('x-user-email') },
    });
    await logAdminAction({
      adminUserId: request.headers.get('x-user-id'),
      userEmail: request.headers.get('x-user-email') ?? 'unknown',
      action: result.sent ? `emailed_${kind}` : `email_${kind}_failed`,
      description: `${kind.replace('_', ' ')} ${event.event_date} to ${parsed.data.to}`,
      entityType: 'events',
      entityId: id,
      recordIds: [id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
      status: result.sent ? 'success' : 'error',
      errorDetail: result.error ?? null,
    });
    if (!result.sent) throw new Error(`Email could not be sent: ${result.error}`);
    return NextResponse.json({ data: { sent: true } }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
}
