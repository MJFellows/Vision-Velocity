/**
 * Custom error classes + a single handleApiError() so every route returns
 * the same JSON error shape and the same status code for the same class of
 * problem, instead of each route inventing its own.
 *
 * Response shape on error:
 *   { "error": { "message": string, "code": string } }
 */

import { NextResponse } from 'next/server';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  /** Optional field-level validation details, surfaced on 400s. */
  readonly details?: Record<string, string>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, string>
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request', details?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests — please try again shortly') {
    super(message, 429, 'RATE_LIMITED');
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Something went wrong') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * Converts any thrown value into a consistent NextResponse. Route handlers
 * should wrap their body in try/catch and call `return handleApiError(err)`
 * in the catch block — see any file under app/api for the pattern.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      // Server-side detail in the log; generic-enough message to the client.
      console.error(`[${error.code}]`, error.message, error.stack);
    }
    return NextResponse.json(
      { error: { message: error.message, code: error.code, details: error.details } },
      { status: error.statusCode }
    );
  }

  // Unrecognised/unexpected error — never leak internals to the client.
  console.error('[UNHANDLED_ERROR]', error);
  return NextResponse.json(
    { error: { message: 'Something went wrong', code: 'INTERNAL_SERVER_ERROR' } },
    { status: 500 }
  );
}
