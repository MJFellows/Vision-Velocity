/** Saves a "Send feedback" message and emails it to the feedback address. */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SUPPORT_EMAIL, emailLayout, escapeHtml, sendMail } from '@/lib/mailer';

export const feedbackSchema = z.object({
  page: z.string().max(300).optional().transform((p) => (p ? p.split('?')[0] : p)),
  message: z.string().trim().min(1, 'Please write a message').max(5000),
});

export async function submitFeedback(params: {
  userType: 'admin' | 'charity' | 'bunnings';
  userId: string | null;
  userEmail: string | null;
  charityName?: string | null;
  page?: string;
  message: string;
}): Promise<{ id: string; emailSent: boolean }> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('feedback')
    .insert({
      user_type: params.userType,
      user_id: params.userId,
      user_email: params.userEmail,
      page: params.page ?? null,
      message: params.message,
    })
    .select('id')
    .single();
  if (error) throw error;

  let emailSent = false;
  try {
    const who = params.charityName ? `${params.userEmail ?? 'unknown'} (${params.charityName})` : params.userEmail ?? 'unknown';
    await sendMail({
      to: SUPPORT_EMAIL,
      replyTo: params.userEmail ?? undefined,
      subject: `Site feedback from ${params.userType === 'charity' ? 'a charity' : params.userType === 'bunnings' ? 'a Bunnings Activities Officer' : 'an admin'}`,
      html: emailLayout(
        'New feedback from the website',
        `<p><strong>From:</strong> ${escapeHtml(who)}<br><strong>Page:</strong> ${escapeHtml(params.page ?? '—')}</p>
<p style="white-space:pre-wrap;border-left:3px solid #e5e7eb;padding-left:12px">${escapeHtml(params.message)}</p>`
      ),
      text: `From: ${who}\nPage: ${params.page ?? '-'}\n\n${params.message}`,
    });
    emailSent = true;
    await admin.from('feedback').update({ email_sent: true }).eq('id', data.id);
  } catch (e) {
    console.warn('[feedback] email not sent', e instanceof Error ? e.message : e);
  }
  return { id: data.id as string, emailSent };
}
