// lib/tracking.ts
// Shared helpers for the email open/click tracking routes (Task 3.3).

import { getSupabaseAdmin } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null): value is string {
  return !!value && UUID_RE.test(value);
}

/** 1x1 transparent GIF. */
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export function pixelResponse(): Response {
  return new Response(new Uint8Array(GIF), {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(GIF.length),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

/**
 * Hostnames that emails may redirect to. Compared by hostname (never by
 * substring) to avoid open-redirect abuse. NEXT_PUBLIC_APP_URL (the frontend)
 * is added automatically.
 */
export function allowedRedirectHosts(): string[] {
  const hosts = [
    'visionvelocity.com.au',
    'www.visionvelocity.com.au',
    'bunnings.com.au',
    'www.bunnings.com.au',
    'woolworths.com.au',
    'www.woolworths.com.au',
  ];
  for (const envUrl of [process.env.NEXT_PUBLIC_APP_URL, process.env.CLIENT_APP_URL]) {
    if (!envUrl) continue;
    try {
      hosts.push(new URL(envUrl).hostname);
    } catch {
      /* ignore malformed env value */
    }
  }
  return hosts;
}

export function isValidRedirectUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return allowedRedirectHosts().includes(url.hostname);
  } catch {
    return false;
  }
}

/** Records an email open against the recipient identified by tracking_pixel_id. Never throws. */
export async function recordOpen(trackingId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: recipient } = await supabase
      .from('email_recipients')
      .select('id, opened_at, open_count')
      .eq('tracking_pixel_id', trackingId)
      .maybeSingle();
    if (!recipient) return;

    await supabase
      .from('email_recipients')
      .update({
        opened: true,
        opened_at: recipient.opened_at ?? new Date().toISOString(),
        open_count: (recipient.open_count ?? 0) + 1,
      })
      .eq('id', recipient.id);
  } catch (error) {
    console.warn('[tracking] failed to record open:', error);
  }
}

/** Records a link click for the recipient identified by tracking_pixel_id. Never throws. */
export async function recordClick(trackingId: string, linkUrl: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: recipient } = await supabase
      .from('email_recipients')
      .select('id, campaign_id')
      .eq('tracking_pixel_id', trackingId)
      .maybeSingle();
    if (!recipient) return;

    await supabase.from('email_link_clicks').insert({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      link_url: linkUrl,
      clicked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[tracking] failed to record click:', error);
  }
}
