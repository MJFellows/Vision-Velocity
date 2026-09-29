// GET /api/tracking/click?id={tracking_pixel_id}&redirect={encoded https URL}
// Email click tracking: records the click, then redirects (302) to an allow-listed host.

import { NextResponse } from 'next/server';
import { isUuid, isValidRedirectUrl, recordClick } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  const redirect = params.get('redirect'); // searchParams already URL-decodes once

  if (!redirect || !isValidRedirectUrl(redirect)) {
    return NextResponse.json(
      { error: { message: 'Invalid or missing redirect URL', code: 'INVALID_REDIRECT' } },
      { status: 400 }
    );
  }

  if (isUuid(id)) await recordClick(id, redirect);
  return NextResponse.redirect(redirect, 302);
}
