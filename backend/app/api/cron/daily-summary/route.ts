/**
 * GET /api/cron/daily-summary — called once a day by Vercel Cron (see vercel.json).
 *
 * If the CRON_SECRET environment variable is set, Vercel sends it as a Bearer
 * token and any other caller is refused. Without it the route still cannot be
 * misused: it emails only the founders, only when something needs attention,
 * and at most once per day (enforced in the database).
 */

import { NextResponse } from 'next/server';
import { runDailySummary } from '@/lib/daily-summary';
import { emailAllowlist } from '@/lib/email-allowlist';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Never runs on staging: only the production deployment sends the founders' summary.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ data: { skipped: true, reason: 'Not the production deployment' } });
  }
  if (emailAllowlist()) {
    return NextResponse.json({ data: { skipped: true, reason: 'Staging (EMAIL_ALLOWLIST is set)' } });
  }
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not allowed' } }, { status: 401 });
  }
  try {
    const result = await runDailySummary();
    console.info('[daily-summary]', result);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[daily-summary] failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Daily summary failed' } }, { status: 500 });
  }
}
