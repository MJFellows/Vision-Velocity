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

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
