/**
 * CORS configuration. CLIENT_APP_URL in .env.local may be a single origin
 * or a comma-separated list (e.g. production + staging). Requests from any
 * other origin get no Access-Control-Allow-Origin header and the browser
 * blocks the response client-side.
 */

function allowedOrigins(): string[] {
  const raw = process.env.CLIENT_APP_URL ?? '';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Returns the origin to echo back, or null if the request's origin isn't allowed. */
export function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  return allowedOrigins().includes(requestOrigin) ? requestOrigin : null;
}

export function buildCorsHeaders(requestOrigin: string | null): HeadersInit {
  const origin = resolveAllowedOrigin(requestOrigin);
  const headers: Record<string, string> = {
    Vary: 'Origin',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  return headers;
}
