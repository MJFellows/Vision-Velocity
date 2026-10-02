/** GET / PUT /api/admin/invoice-settings — the business details printed on invoices. */

import { getSupabaseAdmin } from '@/lib/supabase';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { getInvoiceSettings, invoiceSettingsProblem, invoiceSettingsSchema } from '@/lib/invoices';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';

export async function GET(request: Request) {
  try {
    const settings = await getInvoiceSettings();
    return json(request, { data: settings, problem: invoiceSettingsProblem(settings) });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await parseBody(request, invoiceSettingsSchema, 'Please check the invoice settings');
    const before = await getInvoiceSettings();
    const adminEmail = request.headers.get('x-user-email');
    const update = {
      business_name: body.business_name,
      abn: body.abn ?? null,
      address: body.address || null,
      email: body.email || null,
      phone: body.phone || null,
      payment_terms_days: body.payment_terms_days,
      payment_instructions: body.payment_instructions || null,
      footer_note: body.footer_note || null,
      updated_by_email: adminEmail,
    };
    const { data, error } = await getSupabaseAdmin().from('invoice_settings').update(update).eq('id', 1).select('*').single();
    if (error) throw error;
    await logAdminAction({
      adminUserId: request.headers.get('x-user-id'),
      userEmail: adminEmail ?? 'unknown',
      action: 'updated_invoice_settings',
      description: 'Updated invoice settings',
      entityType: 'invoice_settings',
      // Payment instructions are not copied into the action log.
      changes: diffChanges({ ...before, payment_instructions: before.payment_instructions ? '(set)' : null }, { ...data, payment_instructions: data.payment_instructions ? '(set)' : null }),
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    });
    return json(request, { data, problem: invoiceSettingsProblem(data) });
  } catch (error) {
    return errorResponse(request, error);
  }
}
