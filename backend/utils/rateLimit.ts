/**
 * Sliding-window rate limiter, keyed by an arbitrary string (typically
 * `${ip}:${route}`).
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set (production
 * and preview on Vercel), counters live in a shared Upstash Redis database via
 * @upstash/ratelimit, so limits hold across all serverless instances.
 *
 * When those variables are absent (local development), the limiter falls back
 * to an in-memory Map. That fallback is per instance only and is NOT a hard
 * guarantee against abuse.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const redisConfigured =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) && Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = redisConfigured ? Redis.fromEnv() : null;

// One Ratelimit instance per (limit, window) pair, so dynamic arguments still work.
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const id = `${limit}:${windowMs}`;
  let limiter = limiters.get(id);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: 'vv:ratelimit',
    });
    limiters.set(id, limiter);
  }
  return limiter;
}

// --- In-memory fallback (local development only) ---------------------------

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function checkMemory(key: string, limit: number, windowMs: number): RateLimitResult {
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

// --- Public API -------------------------------------------------------------

export async function checkRateLimit(
  key: string,
  limit = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 20),
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000)
): Promise<RateLimitResult> {
  if (!redis) {
    return checkMemory(key, limit, windowMs);
  }

  const { success, remaining, reset } = await getLimiter(limit, windowMs).limit(key);
  return { allowed: success, remaining, resetAt: reset };
}

/** Best-effort client IP extraction behind Vercel's proxy. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
