/** GET /api/admin/invoices/:id; PATCH { status: 'paid' | 'issued' | 'void', void_reason? } — mark paid, unpaid or void. */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { loadInvoice } from '@/lib/invoices';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { logAdminAction } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const patchSchema = z.object({
  status: z.enum(['paid', 'issued', 'void']),
  void_reason: z.string().trim().max(300).optional().nullable(),
});

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid invoice');
    const inv = await loadInvoice(id);
    if (!inv) throw new NotFoundError('Invoice not found');
    return json(request, { data: inv });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid invoice');
    const body = await parseBody(request, patchSchema);
    const inv = await loadInvoice(id);
    if (!inv) throw new NotFoundError('Invoice not found');
    if (inv.status === 'void') throw new ValidationError('A void invoice cannot be changed. Issue a new invoice from the order instead.');
    if (body.status === 'void' && !body.void_reason) throw new ValidationError('Please give a reason for voiding the invoice', { void_reason: 'Required' });

    const update =
      body.status === 'paid'
        ? { status: 'paid', paid_at: new Date().toISOString() }
        : body.status === 'issued'
          ? { status: 'issued', paid_at: null }
          : { status: 'void', voided_at: new Date().toISOString(), void_reason: body.void_reason };
    const { data, error } = await getSupabaseAdmin().from('invoices').update(update).eq('id', id).select('*').single();
    if (error) throw error;
    await logAdminAction({
      adminUserId: request.headers.get('x-user-id'),
      userEmail: request.headers.get('x-user-email') ?? 'unknown',
      action: body.status === 'paid' ? 'marked_invoice_paid' : body.status === 'void' ? 'voided_invoice' : 'marked_invoice_unpaid',
      description: `Invoice ${inv.invoice_number}${body.void_reason ? `: ${body.void_reason}` : ''}`,
      entityType: 'invoices',
      entityId: id,
      changes: { before: { status: inv.status }, after: update },
      recordIds: [id, inv.order_id],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    });
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}
