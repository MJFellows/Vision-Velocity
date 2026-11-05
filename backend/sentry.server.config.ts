import * as Sentry from '@sentry/nextjs';

// Error monitoring only: no performance tracing, no personal data sent.
// Disabled automatically when SENTRY_DSN is not set (local development).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0,
});
