/**
 * Bunnings Activities Officer (AO) access.
 *
 * AOs have no password account. A founder (or the AO, from the sign-in page)
 * requests a one-time link, which is emailed to the store's AO address and
 * lasts 7 days. Opening it gives a 7-day session token (signed with
 * JWT_SECRET) that only allows reading that one store's events and updating
 * that store's AO contact details. AOs never see prices, internal notes or
 * supplier details.
 */

import { randomUUID } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { InternalServerError, UnauthorizedError, ValidationError } from '@/utils/errors';
import { emailLayout, escapeHtml, sendMail, SUPPORT_EMAIL } from '@/lib/mailer';
import { frontendUrl } from '@/lib/app-url';

export const AO_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const AO_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface AoSession {
  type: 'bunnings_ao';
  bunningsStoreId: string;
  aoEmail: string;
  aoName: string | null;
}

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new InternalServerError('Missing JWT_SECRET');
  return new TextEncoder().encode(s);
}

export async function signAoSession(session: Omit<AoSession, 'type'>): Promise<string> {
  return new SignJWT({ type: 'bunnings_ao', ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${AO_SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

/** Checks the AO session token on a request. Throws 401 if missing, invalid or expired. */
export async function requireAoSession(request: Request): Promise<AoSession> {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) throw new UnauthorizedError('Please open your sign-in link again');
  try {
    const { payload } = await jwtVerify(header.slice(7), secret());
    const s = payload as Partial<AoSession>;
    if (s.type !== 'bunnings_ao' || !s.bunningsStoreId) throw new Error('wrong type');
    return { type: 'bunnings_ao', bunningsStoreId: s.bunningsStoreId, aoEmail: s.aoEmail ?? '', aoName: s.aoName ?? null };
  } catch {
    throw new UnauthorizedError('Your sign-in has expired — request a new link');
  }
}

export interface AoStore {
  id: string;
  location: string;
  activities_officer_email: string | null;
  activities_officer_name: string | null;
}

/** Creates a one-time link for the store's AO and emails it. Returns the link (for admins who want to copy it). */
export async function createAoLink(store: AoStore, opts: { send: boolean }): Promise<{ url: string; expiresAt: string; emailed: boolean; emailError?: string }> {
  if (!store.activities_officer_email) {
    throw new ValidationError('This store has no Activities Officer email', {
      activities_officer_email: 'Add the Activities Officer\'s email to the store first',
    });
  }
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + AO_LINK_TTL_MS).toISOString();
  const { error } = await getSupabaseAdmin().from('bunnings_ao_magic_links').insert({
    token,
    bunnings_store_id: store.id,
    activities_officer_email: store.activities_officer_email,
    expires_at: expiresAt,
  });
  if (error) throw error;
  const url = `${frontendUrl()}/bunnings/activities-officer/auth?token=${token}`;

  let emailed = false;
  let emailError: string | undefined;
  if (opts.send) {
    try {
      const hello = store.activities_officer_name ? `Hello ${escapeHtml(store.activities_officer_name)},` : 'Hello,';
      await sendMail({
        to: store.activities_officer_email,
        subject: `Your Vision Velocity link for Bunnings ${store.location}`,
        html: emailLayout(
          `Sausage sizzles at Bunnings ${store.location}`,
          `<p>${hello}</p><p>Use the button below to see the charity sausage sizzles that Vision Velocity is arranging at your store, download run sheets and keep your contact details up to date.</p>
<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="background:#1e3a5f;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Open my store's events</a></p>
<p style="font-size:13px;color:#6b7280">The link works once and expires in 7 days; after opening it you stay signed in on that device for 7 days. You can ask for a new link at any time from ${escapeHtml(frontendUrl())}/bunnings/activities-officer/sign-in. Questions: ${escapeHtml(SUPPORT_EMAIL)}.</p>`
        ),
        text: `${store.activities_officer_name ? `Hello ${store.activities_officer_name},` : 'Hello,'}\n\nSee the sausage sizzles Vision Velocity is arranging at Bunnings ${store.location}:\n${url}\n\nThe link works once and expires in 7 days. New link: ${frontendUrl()}/bunnings/activities-officer/sign-in\nQuestions: ${SUPPORT_EMAIL}`,
      });
      emailed = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
  }
  return { url, expiresAt, emailed, emailError };
}

/** Column list an AO may see for events at their store (no prices, notes or supplier details). */
export const AO_EVENT_COLUMNS =
  'id, event_date, event_name, status, cover_type, estimated_hotdogs, estimated_staff, number_of_shifts, charities(name, contact_name, phone, email)';
