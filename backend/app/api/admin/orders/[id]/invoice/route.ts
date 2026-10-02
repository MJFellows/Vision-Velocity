/**
 * GET  /api/admin/orders/:id/invoice — the order's invoices (live one first) and its automatic emails.
 * POST /api/admin/orders/:id/invoice — issue an invoice now (if there is no live one).
 */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse } from '@/lib/route-helpers';
import { getInvoiceSettings, invoiceSettingsProblem, issueInvoiceForOrder } from '@/lib/invoices';
import { ValidationError } from '@/utils/errors';
import { logAdminAction } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid order');
    const admin = getSupabaseAdmin();
    const [invoices, autos, settings] = await Promise.all([
      admin.from('invoices').select('id, invoice_number, issue_date, due_date, amount_aud, status, paid_at, voided_at, void_reason, emailed_at, created_at').eq('order_id', id).order('created_at', { ascending: false }),
      admin.from('automated_emails').select('id, created_at, kind, recipients, status, detail').eq('record_id', id).order('created_at', { ascending: false }),
      getInvoiceSettings(),
    ]);
    if (invoices.error) throw invoices.error;
    if (autos.error) throw autos.error;
    const live = (invoices.data ?? []).find((i) => i.status !== 'void') ?? null;
    return json(request, { data: { live, all: invoices.data ?? [], automatedEmails: autos.data ?? [], settingsProblem: invoiceSettingsProblem(settings) } });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid order');
    const adminEmail = request.headers.get('x-user-email');
    const { invoice, created } = await issueInvoiceForOrder(id, adminEmail);
    if (created) {
      await logAdminAction({
        adminUserId: request.headers.get('x-user-id'),
        userEmail: adminEmail ?? 'unknown',
        action: 'issued_invoice',
        description: `Issued invoice ${invoice.invoice_number}`,
        entityType: 'invoices',
        entityId: invoice.id,
        recordIds: [invoice.id, id],
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
      });
    }
    return json(request, { data: invoice, created }, created ? 201 : 200);
  } catch (error) {
    return errorResponse(request, error);
  }
}
