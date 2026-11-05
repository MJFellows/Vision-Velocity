import * as Sentry from '@sentry/nextjs';

// Browser error monitoring only: no performance tracing, no session replay.
// Disabled automatically when NEXT_PUBLIC_SENTRY_DSN is not set (local development).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
