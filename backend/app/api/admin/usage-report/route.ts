/**
 * GET /api/admin/usage-report?days=30
 *
 * Summary of how the site is used over the last N days (default 30, max 365):
 * top buttons and pages by user type, device split, help panels opened,
 * searches that found nothing, forms abandoned vs submitted, and public page
 * visit totals. Built from usage_events and page_views (no personal data).
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

type Row = { user_type: string; event_type: string; page: string; target: string | null; device: string };

function top(map: Map<string, number>, n = 15) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Collapses record ids so /admin/events/<uuid> counts as one page. */
function pageKey(page: string) {
  return page.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]');
}

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get('days') ?? '30') || 30));
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    // Admin-only route (proxy.ts); the service-role client reads the aggregates.
    const admin = getSupabaseAdmin();

    const rows: Row[] = [];
    for (let from = 0; from < 50_000; from += 1000) {
      const { data, error } = await admin
        .from('usage_events')
        .select('user_type, event_type, page, target, device')
        .gte('occurred_at', since)
        .order('id')
        .range(from, from + 999);
      if (error) throw error;
      rows.push(...((data ?? []) as Row[]));
      if (!data || data.length < 1000) break;
    }

    const byType: Record<string, { clicks: Map<string, number>; pages: Map<string, number>; devices: Map<string, number>; total: number }> = {};
    const help = new Map<string, number>();
    const noResults = new Map<string, number>();
    const formsStarted = new Map<string, number>();
    const formsSubmitted = new Map<string, number>();

    for (const r of rows) {
      const t = (byType[r.user_type] ??= { clicks: new Map(), pages: new Map(), devices: new Map(), total: 0 });
      t.total += 1;
      const page = pageKey(r.page);
      if (r.event_type === 'click' && r.target) bump(t.clicks, `${r.target} — ${page}`);
      if (r.event_type === 'page_view') {
        bump(t.pages, page);
        bump(t.devices, r.device);
      }
      if (r.event_type === 'help_open') bump(help, page);
      if (r.event_type === 'search_no_results' && r.target) bump(noResults, r.target);
      if (r.event_type === 'form_abandoned') bump(formsStarted, r.target ?? page);
      if (r.event_type === 'form_submitted') bump(formsSubmitted, r.target ?? page);
    }

    const { data: views, error: viewsError } = await admin
      .from('page_views')
      .select('page_url, device_type')
      .gte('timestamp', since)
      .limit(50_000);
    if (viewsError) throw viewsError;
    const publicPages = new Map<string, number>();
    const publicDevices = new Map<string, number>();
    for (const v of views ?? []) {
      bump(publicPages, v.page_url as string);
      bump(publicDevices, v.device_type as string);
    }

    const userTypes = Object.fromEntries(
      Object.entries(byType).map(([type, t]) => [
        type,
        { totalEvents: t.total, topButtons: top(t.clicks), topPages: top(t.pages), devices: top(t.devices, 5) },
      ])
    );

    return NextResponse.json(
      {
        data: {
          days,
          since,
          userTypes,
          helpOpened: top(help),
          searchesWithNoResults: top(noResults),
          formsAbandoned: top(formsStarted),
          formsSubmitted: top(formsSubmitted),
          publicVisits: { total: views?.length ?? 0, topPages: top(publicPages), devices: top(publicDevices, 5) },
        },
      },
      { headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
