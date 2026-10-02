/**
 * Plain email sending through Resend for messages that are not one of the
 * templated emails in lib/email-templates.ts: feedback notifications, emailed
 * documents (with a PDF attachment), sign-in links and event requests.
 */

export interface MailAttachment {
  filename: string;
  /** File contents. */
  content: Uint8Array;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  cc?: string | string[];
  attachments?: MailAttachment[];
}

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_EMAIL_REPLY_TO || 'support@visionvelocity.com.au';

/** Escapes text for safe inclusion in an HTML email. */
export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wraps body HTML in a simple branded layout. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px">
<tr><td style="background:#1e3a5f;color:#ffffff;padding:16px 24px;font-size:18px;font-weight:bold;border-radius:8px 8px 0 0">Vision Velocity</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb">Vision Velocity · ${escapeHtml(SUPPORT_EMAIL)}</td></tr>
</table></td></tr></table></body></html>`;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/** Sends one email via Resend. Throws on failure; returns the Resend message id. */
export async function sendMail(message: MailMessage): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY environment variable not configured');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NEXT_PUBLIC_EMAIL_FROM || 'noreply@visionvelocity.com.au',
      to: message.to,
      cc: message.cc,
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: message.replyTo || SUPPORT_EMAIL,
      attachments: message.attachments?.map((a) => ({ filename: a.filename, content: toBase64(a.content) })),
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`Resend API error: ${(body as { message?: string }).message ?? response.status}`);
  }
  const data = (await response.json()) as { id?: string };
  return data.id ?? null;
}

/** Addresses that receive internal notifications (feedback, charity requests). */
export function adminNotificationRecipients(): string[] {
  const list = (process.env.ADMIN_NOTIFICATION_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [SUPPORT_EMAIL];
}
