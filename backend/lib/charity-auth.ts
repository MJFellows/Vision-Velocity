/**
 * Charity sign-in support.
 *
 * - requireCharityCaller(): checks the Bearer token with Supabase and finds the
 *   caller's active charity_users row. Every /api/charity/* route calls it and
 *   then reads or writes ONLY that charity's records, using the service-role
 *   client with an explicit charity_id filter. Charities have no direct
 *   database access (their old row-level policies are disabled).
 * - inviteCharityUser(): creates (or reuses) the person's sign-in account,
 *   links it to the charity and emails a "Set up your sign-in" link.
 * - sendCharitySignInLink(): emails a one-time sign-in link or a password
 *   reset link to an existing charity user.
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, getBearerToken } from '@/lib/supabase';
import { ConflictError, ForbiddenError, UnauthorizedError, ValidationError } from '@/utils/errors';
import { emailLayout, escapeHtml, sendMail, SUPPORT_EMAIL } from '@/lib/mailer';
import { frontendUrl } from '@/lib/app-url';

export interface CharityCaller {
  authUserId: string;
  charityUserId: string;
  charityId: string;
  charityName: string;
  role: 'owner' | 'member';
  email: string;
  name: string | null;
}

export async function requireCharityCaller(request: Request): Promise<CharityCaller> {
  const token = getBearerToken(request);
  if (!token) throw new UnauthorizedError('Please sign in');
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await anon.auth.getUser(token);
  if (userError || !userData.user) throw new UnauthorizedError('Session expired — please sign in again');

  const { data: row, error } = await getSupabaseAdmin()
    .from('charity_users')
    .select('id, charity_id, role, email, name, is_active, charities(name, is_deleted, subscription_status)')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();
  if (error) throw error;
  const charity = (row as unknown as { charities: { name: string; is_deleted: boolean; subscription_status: string } | null } | null)?.charities;
  if (!row || !row.is_active || !charity || charity.is_deleted || charity.subscription_status === 'inactive') {
    throw new ForbiddenError('This sign-in is not linked to an active charity');
  }
  return {
    authUserId: userData.user.id,
    charityUserId: row.id as string,
    charityId: row.charity_id as string,
    charityName: charity.name,
    role: row.role as 'owner' | 'member',
    email: (row.email as string) || userData.user.email || '',
    name: (row.name as string | null) ?? null,
  };
}

/** Finds the sign-in account for an email, creating it if needed. */
async function ensureAuthUser(email: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.data.user) return created.data.user.id;
  // Already registered: a recovery link lookup returns the existing user.
  const link = await admin.auth.admin.generateLink({ type: 'recovery', email });
  if (link.error || !link.data.user) throw created.error ?? link.error ?? new Error('Could not find or create the sign-in account');
  return link.data.user.id;
}

async function linkFor(type: 'recovery' | 'magiclink', email: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({ type, email });
  if (error || !data.properties?.hashed_token) throw error ?? new Error('Could not create the link');
  const page = type === 'magiclink' ? 'sign-in' : 'set-password';
  return `${frontendUrl()}/charity/${page}?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=${type}`;
}

export async function inviteCharityUser(params: {
  charityId: string;
  email: string;
  name?: string | null;
  role: 'owner' | 'member';
  invitedBy: string;
}): Promise<{ charityUserId: string; emailSent: boolean; emailError?: string }> {
  const admin = getSupabaseAdmin();
  const email = params.email.trim().toLowerCase();

  const { data: charity, error: cErr } = await admin.from('charities').select('id, name, is_deleted').eq('id', params.charityId).maybeSingle();
  if (cErr) throw cErr;
  if (!charity || charity.is_deleted) throw new ValidationError('Charity not found');

  const authUserId = await ensureAuthUser(email);

  const { data: adminRow } = await admin.from('admin_users').select('id').eq('id', authUserId).maybeSingle();
  if (adminRow) throw new ConflictError('That email belongs to a Vision Velocity admin account; use a different address for the charity');

  const { data: existing, error: eErr } = await admin.from('charity_users').select('id, charity_id').eq('auth_user_id', authUserId).maybeSingle();
  if (eErr) throw eErr;
  if (existing && existing.charity_id !== params.charityId) throw new ConflictError('That email already has access to another charity');

  let charityUserId: string;
  if (existing) {
    const { error } = await admin
      .from('charity_users')
      .update({ is_active: true, name: params.name ?? undefined, role: params.role, invited_at: new Date().toISOString(), invited_by: params.invitedBy })
      .eq('id', existing.id);
    if (error) throw error;
    charityUserId = existing.id as string;
  } else {
    const { data, error } = await admin
      .from('charity_users')
      .insert({ charity_id: params.charityId, auth_user_id: authUserId, email, name: params.name ?? null, role: params.role, invited_by: params.invitedBy })
      .select('id')
      .single();
    if (error) throw error;
    charityUserId = data.id as string;
  }

  // Keep the legacy single link on the charity in step for the owner.
  if (params.role === 'owner') await admin.from('charities').update({ auth_user_id: authUserId }).eq('id', params.charityId);

  let emailSent = false;
  let emailError: string | undefined;
  try {
    const link = await linkFor('recovery', email);
    await sendMail({
      to: email,
      subject: `Set up your Vision Velocity sign-in for ${charity.name}`,
      html: emailLayout(
        'Set up your sign-in',
        `<p>Hello${params.name ? ` ${escapeHtml(params.name)}` : ''},</p>
<p>You now have access to the Vision Velocity website for <strong>${escapeHtml(charity.name)}</strong>. There you can see your events and orders, request new events, keep your details up to date and print or email your records.</p>
<p style="margin:24px 0"><a href="${link}" style="background:#e85d2a;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Set up your sign-in</a></p>
<p>The button lets you choose a password. It works once and expires after one hour; if it has expired, go to ${escapeHtml(frontendUrl())}/charity/login and choose "Email me a sign-in link".</p>
<p>Questions? Reply to this email or write to ${escapeHtml(SUPPORT_EMAIL)}.</p>`
      ),
      text: `You now have access to the Vision Velocity website for ${charity.name}.\n\nSet up your sign-in (choose a password): ${link}\n\nThe link works once and expires after one hour. If it has expired, go to ${frontendUrl()}/charity/login and choose "Email me a sign-in link".\n\nQuestions? ${SUPPORT_EMAIL}`,
    });
    emailSent = true;
  } catch (e) {
    emailError = e instanceof Error ? e.message : String(e);
  }
  return { charityUserId, emailSent, emailError };
}

/** Emails a sign-in link (or password reset link) if the address belongs to an active charity user. Silent otherwise. */
export async function sendCharitySignInLink(rawEmail: string, purpose: 'sign_in' | 'reset'): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const admin = getSupabaseAdmin();
  const { data: rows } = await admin.from('charity_users').select('id, is_active, charities(name, is_deleted)').ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(1);
  const row = rows?.[0] as unknown as { is_active: boolean; charities: { name: string; is_deleted: boolean } | null } | undefined;
  if (!row || !row.is_active || !row.charities || row.charities.is_deleted) return;

  const link = await linkFor(purpose === 'sign_in' ? 'magiclink' : 'recovery', email);
  const isSignIn = purpose === 'sign_in';
  await sendMail({
    to: email,
    subject: isSignIn ? 'Your Vision Velocity sign-in link' : 'Reset your Vision Velocity password',
    html: emailLayout(
      isSignIn ? 'Your sign-in link' : 'Reset your password',
      `<p>${isSignIn ? 'Use the button below to sign in' : 'Use the button below to choose a new password'} for ${escapeHtml(row.charities.name)}.</p>
<p style="margin:24px 0"><a href="${link}" style="background:#e85d2a;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${isSignIn ? 'Sign in' : 'Choose a new password'}</a></p>
<p>The link works once and expires after one hour. If you did not ask for this, you can ignore this email.</p>`
    ),
    text: `${isSignIn ? 'Sign in' : 'Choose a new password'}: ${link}\n\nThe link works once and expires after one hour. If you did not ask for this, ignore this email.`,
  });
}
