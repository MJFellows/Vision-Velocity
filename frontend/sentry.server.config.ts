import * as Sentry from '@sentry/nextjs';

// Server error monitoring only. Disabled when SENTRY_DSN is not set.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0,
});
