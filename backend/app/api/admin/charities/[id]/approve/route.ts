/**
 * POST /api/admin/charities/[id]/approve
 *
 * Approves a charity that signed up through the public form. The schema has no
 * "pending" status, so `trial` means "awaiting approval" and `active` means
 * approved. Only a `trial` charity can be approved. On success the charity is
 * emailed the `charity_signup_approved` template; a failed email does not undo
 * the approval, and the response says whether it was sent.
 */

import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ConflictError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { inviteCharityUser } from '@/lib/charity-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  const adminEmail = request.headers.get('x-user-email') ?? 'unknown';
  const adminUserId = request.headers.get('x-user-id');
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  const { id } = await params;

  try {
    const supabase = getSupabaseForRequest(request);

    const { data: before, error: beforeError } = await supabase
      .from('charities')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw new NotFoundError('Charity not found');
    if (before.subscription_status !== 'trial') {
      throw new ConflictError(
        `Only charities awaiting approval (status "trial") can be approved; this one is "${before.subscription_status}"`
      );
    }
    if (!before.email) {
      throw new ValidationError('This charity has no email address, so it cannot be approved and notified');
    }

    const { data, error } = await supabase
      .from('charities')
      .update({ subscription_status: 'active' })
      .eq('id', id)
      .eq('subscription_status', 'trial') // guards against a concurrent approval
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ConflictError('This charity was changed by someone else; please reload and try again');

    await logAdminAction({
      adminUserId,
      userEmail: adminEmail,
      action: 'approved_charity',
      description: `Approved charity "${data.name}"`,
      entityType: 'charities',
      entityId: data.id,
      changes: diffChanges(before, data),
      requestParams: { id },
      recordIds: [data.id],
      ipAddress,
      userAgent,
    });

    // Best-effort notification.
    let emailSent = false;
    let emailError: string | undefined;
    try {
      const result = await sendEmail({
        templateId: 'charity_signup_approved',
        recipientEmail: data.email as string,
        recipientName: (data.contact_name as string | null) ?? (data.name as string),
        variables: {
          contactName: (data.contact_name as string | null) ?? (data.name as string),
          charityName: data.name as string,
          supportEmail: process.env.NEXT_PUBLIC_EMAIL_REPLY_TO || 'support@visionvelocity.com.au',
        },
      });
      emailSent = result.success;
      emailError = result.error;
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
    }
    if (!emailSent) console.warn('[approve] approval email not sent:', emailError);

    // Give the charity's contact a sign-in and email the set-up link (best effort).
    let signIn: { invited: boolean; emailSent?: boolean; error?: string } = { invited: false };
    if (data.email) {
      try {
        const result = await inviteCharityUser({
          charityId: data.id as string,
          email: data.email as string,
          name: (data.contact_name as string | null) ?? null,
          role: 'owner',
          invitedBy: adminEmail,
        });
        signIn = { invited: true, emailSent: result.emailSent, error: result.emailError };
      } catch (err) {
        signIn = { invited: false, error: err instanceof Error ? err.message : String(err) };
        console.warn('[approve] sign-in invite failed:', signIn.error);
      }
    }

    return NextResponse.json(
      { data, email: { sent: emailSent, ...(emailError ? { error: emailError } : {}) }, signIn },
      { headers: cors }
    );
  } catch (error) {
    if (!(error instanceof ValidationError) && !(error instanceof ConflictError) && !(error instanceof NotFoundError)) {
      await logAdminAction({
        adminUserId,
        userEmail: adminEmail,
        action: 'approve_charity_failed',
        entityType: 'charities',
        entityId: id,
        ipAddress,
        userAgent,
        status: 'error',
        errorDetail: error instanceof Error ? error.message : String(error),
      });
    }
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
