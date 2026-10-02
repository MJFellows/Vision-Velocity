/** Small helpers shared by route handlers: JSON responses with CORS, and error handling. */

import { NextResponse } from 'next/server';
import { handleApiError, ValidationError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import type { ZodType } from 'zod';

export function corsFor(request: Request): Record<string, string> {
  return buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
}

export function json(request: Request, body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: corsFor(request) });
}

export function errorResponse(request: Request, error: unknown): NextResponse {
  const res = handleApiError(error);
  for (const [k, v] of Object.entries(corsFor(request))) res.headers.set(k, v);
  return res;
}

/** Parses the JSON body with a zod schema, throwing a ValidationError with field details on failure. */
export async function parseBody<T>(request: Request, schema: ZodType<T>, message = 'Invalid request'): Promise<T> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ValidationError(message, Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.') || 'request', i.message])));
  }
  return parsed.data;
}
