/**
 * Minimal in-memory sliding-window rate limiter, keyed by an arbitrary
 * string (typically `${ip}:${route}`).
 *
 * PRODUCTION CAVEAT: this Map lives in the memory of a single serverless
 * function instance. On Vercel (or any multi-instance/serverless deploy),
 * concurrent requests can land on different instances, each with its own
 * counter — so the effective limit in production is "N requests per
 * instance", not "N requests total". That's fine for local dev and for
 * catching accidental abuse, but it is NOT a hard guarantee against a
 * determined attacker once this is deployed to Vercel. Before relying on
 * this for real abuse prevention in production, replace the Map below with
 * a shared store — Upstash Redis via @upstash/ratelimit is the standard
 * pairing for a Vercel + Supabase stack, and requires no code changes
 * outside this file (same checkRateLimit signature).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  limit = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 20),
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000)
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Best-effort client IP extraction behind Vercel's proxy. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
