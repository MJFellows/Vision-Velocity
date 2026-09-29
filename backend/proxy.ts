/**
 * Proxy (renamed from "middleware" for Next.js 16) — runs before every
 * /api/* request reaches its route handler. Responsible for:
 *
 *   1. CORS: attaches the right Access-Control-* headers, and short-
 *      circuits OPTIONS preflight requests entirely.
 *   2. Rate limiting: applied to /api/public/* and /api/auth/* (the
 *      endpoints reachable without already being an authenticated admin —
 *      exactly the ones an abuser would hit).
 *   3. Admin auth: /api/admin/* requires a valid Supabase JWT AND a
 *      matching, active row in admin_users (i.e. Rita or Natalie, or any
 *      future admin/support/viewer account — see the schema's admin_role
 *      enum). Verified here as a fast-fail gate; every admin route handler
 *      also runs its actual DB queries through the caller's own JWT (see
 *      lib/supabase.ts), so Postgres RLS enforces the same rule a second
 *      time independently. That redundancy is intentional.
 *   4. Request logging: one console line per request (basic observability,
 *      NOT the audit trail — see lib/audit.ts for that), PLUS an
 *      admin_action_log entry for every 401/403 on /api/admin/* — a
 *      rejected admin request is itself a security-relevant event worth
 *      keeping in the compliance trail, not just a console line that
 *      scrolls away. Successful admin actions are logged by the route
 *      handlers themselves (see lib/audit.ts), since only they know the
 *      actual entity/action/diff — this proxy only sees "allowed through"
 *      or "rejected", not what happened next.
 *
 * Downstream route handlers receive the verified caller's id/email via the
 * x-user-id / x-user-email request headers this proxy sets, so they
 * don't need to re-verify the JWT themselves.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildCorsHeaders } from '@/utils/cors';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

export const config = {
  matcher: '/api/:path*',
};

function logRequest(request: NextRequest, note: string) {
  const ip = getClientIp(request);
  console.log(
    `[api] ${new Date().toISOString()} ${request.method} ${request.nextUrl.pathname} ip=${ip} ${note}`
  );
}

/** Best-effort entity_type guess from the path, e.g. /api/admin/charities/123 -> "charities". */
function guessEntityType(pathname: string): string | undefined {
  const match = pathname.match(/^\/api\/admin\/([^/]+)/);
  return match?.[1];
}

/**
 * Writes a rejected-admin-request entry directly via the Supabase REST API
 * using the service-role key, rather than going through lib/audit.ts /
 * lib/supabase.ts (those assume the route handlers' own Node.js module
 * scope). @supabase/supabase-js's fetch-based client works fine here
 * without needing that module's singleton pattern. Never throws — a
 * logging failure must never turn into a 500 for the caller.
 */
async function logRejectedAdminRequest(
  request: NextRequest,
  reason: 'UNAUTHORIZED' | 'FORBIDDEN',
  detail: string
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('[proxy] Missing Supabase service-role env — cannot log rejected request.');
    return;
  }

  try {
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await supabaseAdmin.from('admin_action_log').insert({
      user_email: 'unknown',
      action: reason === 'UNAUTHORIZED' ? 'rejected_unauthenticated_admin_request' : 'rejected_forbidden_admin_request',
      description: `${request.method} ${request.nextUrl.pathname}`,
      entity_type: guessEntityType(request.nextUrl.pathname) ?? null,
      request_params: Object.fromEntries(request.nextUrl.searchParams.entries()),
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent'),
      status: 'error',
      error_detail: detail,
    });
  } catch (err) {
    console.error('[proxy] Failed to log rejected admin request:', err);
  }
}

async function resolveAdminCaller(
  token: string
): Promise<{ id: string; email: string } | 'invalid_token' | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('[proxy] Missing Supabase env vars — cannot verify admin token.');
    return null;
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) return 'invalid_token'; // expired, revoked or malformed token

  // The admin_users lookup uses the service-role client: the anon client above
  // carries no user session, so RLS returned no row and every admin was rejected.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[proxy] Missing SUPABASE_SERVICE_ROLE_KEY — cannot verify admin role.');
    return null;
  }
  const supabaseService = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminRow, error: adminError } = await supabaseService
    .from('admin_users')
    .select('id, email, is_active, is_deleted')
    .eq('id', user.id)
    .maybeSingle();

  if (adminError || !adminRow || !adminRow.is_active || adminRow.is_deleted) {
    return null;
  }

  return { id: adminRow.id as string, email: adminRow.email as string };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  // --- CORS preflight -------------------------------------------------------
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // --- Rate limiting (public + auth endpoints only) --------------------------
  const isPublicOrAuth =
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/bunnings/activities-officer/');
  if (isPublicOrAuth) {
    const ip = getClientIp(request);
    const result = checkRateLimit(`${ip}:${pathname}`);
    if (!result.allowed) {
      logRequest(request, 'RATE_LIMITED');
      return NextResponse.json(
        { error: { message: 'Too many requests — please try again shortly', code: 'RATE_LIMITED' } },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  // --- Admin auth gate --------------------------------------------------------
  if (pathname.startsWith('/api/admin/')) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      logRequest(request, 'UNAUTHORIZED (no token)');
      await logRejectedAdminRequest(request, 'UNAUTHORIZED', 'No bearer token supplied');
      return NextResponse.json(
        { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401, headers: corsHeaders }
      );
    }

    const admin = await resolveAdminCaller(token);
    if (admin === 'invalid_token') {
      logRequest(request, 'UNAUTHORIZED (invalid or expired token)');
      await logRejectedAdminRequest(request, 'UNAUTHORIZED', 'Bearer token invalid or expired');
      return NextResponse.json(
        { error: { message: 'Session expired — please sign in again', code: 'UNAUTHORIZED' } },
        { status: 401, headers: corsHeaders }
      );
    }
    if (!admin) {
      logRequest(request, 'FORBIDDEN (not an active admin)');
      await logRejectedAdminRequest(request, 'FORBIDDEN', 'Token did not resolve to an active admin_users row');
      return NextResponse.json(
        { error: { message: 'You do not have permission to perform this action', code: 'FORBIDDEN' } },
        { status: 403, headers: corsHeaders }
      );
    }

    logRequest(request, `OK admin=${admin.email}`);
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set('x-user-id', admin.id);
    forwardedHeaders.set('x-user-email', admin.email);

    const response = NextResponse.next({ request: { headers: forwardedHeaders } });
    for (const [key, value] of Object.entries(corsHeaders)) {
      if (typeof value === 'string') response.headers.set(key, value);
    }
    return response;
  }

  // --- Everything else (public + auth routes): pass through with CORS --------
  logRequest(request, 'OK');
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    if (typeof value === 'string') response.headers.set(key, value);
  }
  return response;
}
