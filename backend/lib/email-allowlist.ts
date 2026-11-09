/**
 * Staging safety for email.
 *
 * When the EMAIL_ALLOWLIST variable is set (staging only), an email is sent only to the addresses on the
 * list. Any other recipient is logged and skipped. When the variable is not set (production), nothing is
 * restricted.
 */

export function emailAllowlist(): string[] | null {
  const raw = process.env.EMAIL_ALLOWLIST;
  if (!raw || !raw.trim()) return null;
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** Returns the recipients allowed to receive email. Recipients not on the list are logged and dropped. */
export function allowedRecipients(to: string | string[] | undefined): string[] {
  const requested = (Array.isArray(to) ? to : to ? [to] : []).map((s) => s.trim()).filter(Boolean);
  const allow = emailAllowlist();
  if (!allow) return requested;
  const kept: string[] = [];
  for (const address of requested) {
    if (allow.includes(address.toLowerCase())) {
      kept.push(address);
    } else {
      console.warn(`[email-allowlist] skipped: ${address} is not on EMAIL_ALLOWLIST (staging)`);
    }
  }
  return kept;
}
