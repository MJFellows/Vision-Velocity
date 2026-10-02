/**
 * Founders' daily summary (decision 2026-10-02): one morning email to every
 * active admin listing what is in the dashboard's "Needs attention" box. Sent
 * only when there is something in it, and at most once per Brisbane day.
 *
 * The once-a-day rule is enforced in the database: a row is written to
 * automated_emails with status "sent" BEFORE the email goes out, and a unique
 * index allows only one such row per day. If sending fails the row is
 * changed to "failed", which frees the day for a retry.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { attentionCount, loadNeedsAttention, type NeedsAttention } from '@/lib/needs-attention';
import { emailLayout, escapeHtml, sendMail } from '@/lib/mailer';
import { frontendUrl } from '@/lib/app-url';
import { brisbaneToday } from '@/lib/charity-data';

const short = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const money = (n: number) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });

interface Section {
  title: string;
  lines: { text: string; href: string }[];
}

export function summarySections(n: NeedsAttention): Section[] {
  const base = frontendUrl();
  const ev = (id: string) => `${base}/admin/events/${id}`;
  const sections: Section[] = [
    {
      title: 'Charities awaiting approval',
      lines: n.charitiesAwaitingApproval.map((c) => ({ text: c.name, href: `${base}/admin/charities/${c.id}` })),
    },
    {
      title: 'Event requests from charities',
      lines: n.eventRequests.map((e) => ({ text: `${short(e.event_date)} - ${e.charity ?? 'Charity'}${e.store ? ` at ${e.store}` : ''}`, href: ev(e.id) })),
    },
    {
      title: 'Events in the next 14 days with something missing',
      lines: n.upcomingEventsWithGaps.map((e) => ({ text: `${short(e.event_date)} - ${e.name || e.charity || 'Event'}: ${e.missing.join(', ')}`, href: ev(e.id) })),
    },
    {
      title: 'Orders needing attention',
      lines: n.ordersNeedingAttention.map((o) => ({ text: `${short(o.event_date)} - ${o.charity ?? 'Charity'}: ${o.missing.join(', ')}`, href: `${base}/admin/orders/${o.id}` })),
    },
    {
      title: 'Past events without results',
      lines: n.eventsMissingResults.map((e) => ({ text: `${short(e.event_date)} - ${e.name || e.charity || 'Event'}`, href: ev(e.id) })),
    },
    {
      title: 'Overdue invoices',
      lines: n.overdueInvoices.map((i) => ({ text: `${i.invoice_number} - ${i.charity ?? 'Charity'}, ${money(i.amount_aud)}, due ${short(i.due_date)}`, href: `${base}/admin/orders/${i.order_id}` })),
    },
  ];
  if (n.newFeedback > 0) {
    sections.push({ title: 'New feedback', lines: [{ text: `${n.newFeedback} new message${n.newFeedback === 1 ? '' : 's'}`, href: `${base}/admin/usage-report` }] });
  }
  return sections.filter((s) => s.lines.length > 0);
}

export async function runDailySummary(opts: { force?: boolean } = {}): Promise<{ status: 'sent' | 'skipped' | 'failed'; detail: string }> {
  const admin = getSupabaseAdmin();
  const runDate = brisbaneToday();

  const { count: alreadySent } = await admin
    .from('automated_emails')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'daily_summary')
    .eq('run_date', runDate)
    .eq('status', 'sent');
  if ((alreadySent ?? 0) > 0 && !opts.force) return { status: 'skipped', detail: `Already sent for ${runDate}` };

  const needs = await loadNeedsAttention(admin);
  const total = attentionCount(needs);
  if (total === 0) return { status: 'skipped', detail: 'Nothing needs attention' };

  const { data: admins, error: adminsError } = await admin.from('admin_users').select('email').eq('is_active', true);
  if (adminsError) throw adminsError;
  const recipients = (admins ?? []).map((a) => a.email as string).filter(Boolean);
  if (recipients.length === 0) return { status: 'skipped', detail: 'No active admins' };

  // Claim today's slot first (unique index), so two runs cannot both send.
  const { data: claim, error: claimError } = await admin
    .from('automated_emails')
    .insert({ kind: 'daily_summary', run_date: runDate, recipients: recipients.join(', '), status: 'sent', detail: `${total} item(s)` })
    .select('id')
    .single();
  if (claimError) {
    if (claimError.code === '23505' && !opts.force) return { status: 'skipped', detail: `Already sent for ${runDate}` };
    if (claimError.code !== '23505') throw claimError;
  }

  const sections = summarySections(needs);
  const html = sections
    .map(
      (s) =>
        `<h2 style="font-size:16px;margin:20px 0 6px">${escapeHtml(s.title)} (${s.lines.length})</h2><ul style="margin:0;padding-left:20px">${s.lines
          .map((l) => `<li style="margin:4px 0"><a href="${escapeHtml(l.href)}" style="color:#1e3a5f">${escapeHtml(l.text)}</a></li>`)
          .join('')}</ul>`
    )
    .join('');
  const text = sections.map((s) => `${s.title} (${s.lines.length})\n${s.lines.map((l) => `- ${l.text}\n  ${l.href}`).join('\n')}`).join('\n\n');
  const dateText = new Date(`${runDate}T00:00:00Z`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  try {
    await sendMail({
      to: recipients,
      subject: `Vision Velocity: ${total} thing${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} attention (${dateText})`,
      html: emailLayout(
        `Needs attention - ${dateText}`,
        `<p>Good morning. This is what is in the Needs attention box on the dashboard today.</p>${html}<p style="margin-top:24px"><a href="${escapeHtml(frontendUrl())}/admin/dashboard" style="color:#1e3a5f">Open the dashboard</a></p><p style="font-size:12px;color:#6b7280">Sent to every active founder each morning when something needs attention. Nothing to do means no email.</p>`
      ),
      text: `Needs attention - ${dateText}\n\n${text}\n\nDashboard: ${frontendUrl()}/admin/dashboard`,
    });
    return { status: 'sent', detail: `${total} item(s) to ${recipients.length} founder(s)` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (claim?.id) await admin.from('automated_emails').update({ status: 'failed', detail: msg.slice(0, 1000) }).eq('id', claim.id);
    return { status: 'failed', detail: msg };
  }
}
