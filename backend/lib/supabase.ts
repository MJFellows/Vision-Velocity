/**
 * Supabase client & connection pool with error handling.
 *
 * Two distinct clients are exported, and the choice between them matters —
 * mixing them up is the single easiest way to accidentally bypass Row Level
 * Security:
 *
 * - getSupabaseForRequest(request): an anon-key client that forwards the
 *   caller's own JWT (from the Authorization header) to PostgREST. Queries
 *   made with this client run AS that user, so the database's own RLS
 *   policies (is_admin(), current_charity_id(), etc. — see the schema) are
 *   what actually decide what the caller can see or change. Use this for
 *   almost everything; it's the safer default because a bug here fails
 *   closed (RLS denies), not open.
 *
 * - getSupabaseAdmin(): a service-role client that bypasses RLS entirely.
 *   It is a singleton (Supabase's own guidance: reuse one client per
 *   process rather than constructing a new one per request — that's the
 *   "connection pool" for a serverless/edge context, where the underlying
 *   transport is pooled HTTP rather than a literal DB connection pool).
 *   Use it ONLY for the narrow set of operations that must succeed
 *   regardless of the caller's own row visibility — e.g. writing to
 *   admin_action_log after an admin action, or looking up a user's
 *   admin_users row during auth. Never use it to "make RLS problems go
 *   away" in a route handler; if RLS is blocking a legitimate request, the
 *   fix is a policy change in the schema, not switching to this client.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Fails fast and loudly at request time rather than silently returning
    // an unauthenticated/misconfigured client. Caught by handleApiError()
    // in utils/errors.ts and surfaced as a 500 with a clear server-side log.
    throw new Error(
      `Missing required environment variable: ${name}. Check .env.local against .env.example.`
    );
  }
  return value;
}

const SUPABASE_URL = () => requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = () => requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = () => requireEnv('SUPABASE_SERVICE_ROLE_KEY');

let _admin: SupabaseClient | null = null;

/**
 * Singleton service-role client. Bypasses RLS — see the module doc comment
 * above for when this is (and is not) the right client to use.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(SUPABASE_URL(), SUPABASE_SERVICE_ROLE_KEY(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

/**
 * Per-request anon-key client that forwards the caller's own JWT, so every
 * query it makes is subject to the database's RLS policies as that user.
 * Pass the incoming Request/NextRequest so its Authorization header can be
 * forwarded; if there is no Authorization header, queries run as the
 * anonymous (anon) role, same as an unauthenticated public visitor.
 */
export function getSupabaseForRequest(request: Request): SupabaseClient {
  const authHeader = request.headers.get('authorization') ?? '';
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

/**
 * Extracts the bearer token from a request's Authorization header, or null
 * if absent/malformed. Useful for passing directly to
 * supabase.auth.getUser(token) when middleware needs to resolve the caller
 * before any route handler runs.
 */
export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
