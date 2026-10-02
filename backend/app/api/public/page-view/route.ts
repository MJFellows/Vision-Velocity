/**
 * POST /api/public/page-view { page, referrer?, device? }
 *
 * Counts public page visits for the monthly totals. Stores only the page path,
 * the referring site's host name and the device type: no visitor id, session,
 * IP address or cookie. Rate limited by proxy.ts (/api/public/*).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

const schema = z.object({
  page: z.string().max(300),
  referrer: z.string().max(500).optional().nullable(),
  device: z.enum(['phone', 'tablet', 'computer', 'unknown']).optional(),
});

const DEVICE_MAP = { phone: 'mobile', tablet: 'tablet', computer: 'desktop', unknown: 'unknown' } as const;

function hostOnly(ref?: string | null): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).hostname || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (parsed.success) {
      const page = parsed.data.page.split('?')[0].split('#')[0];
      // Only public pages are counted; admin and charity areas use usage_events instead.
      if (!page.startsWith('/admin') && (!page.startsWith('/charity') || page.startsWith('/charity/signup'))) {
        await getSupabaseAdmin()
          .from('page_views')
          .insert({ page_url: page, referrer: hostOnly(parsed.data.referrer), device_type: DEVICE_MAP[parsed.data.device ?? 'unknown'] });
      }
    }
    return new NextResponse(null, { status: 204, headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
