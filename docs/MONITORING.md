# Vision Velocity - Monitoring and Logging

Last updated: 2026-09-30.

## What is in place

| Need | Tool | Status |
|---|---|---|
| Application and request logs | Vercel Logs (per project) | Available once deployed; no set-up needed |
| Error tracking | Vercel runtime logs (filter to errors) | Available; Sentry **not** installed |
| Performance | Vercel Analytics / Speed Insights | Optional; must be enabled per project |
| Database logs and advisers | Supabase Dashboard > Logs and Advisors | Available |
| Audit compliance | Database audit triggers writing to the audit tables (task 1.4), append-only admin action log | In place, verified on live inserts and deletes |
| Uptime | GitHub **Smoke test** workflow run on demand | Manual; no scheduled uptime monitor yet |

## Checking logs and errors

1. Vercel dashboard > project > **Logs**. Set the time range, filter by level `Error`/`Warning`, and by path (for example `/api/public/charities/signup`). Hobby retains logs for a short period only, so investigate promptly.
2. Failed builds: project > Deployments > select the deployment > Build Logs.
3. Database: Supabase > Logs > choose API, Postgres or Auth. Check Advisors > Security and Performance after each schema change.
4. Email delivery: Resend dashboard > Emails (status Sent/Delivered/Bounced).
5. Approval and admin actions: query the admin action log table in Supabase (append-only).

## Performance

Enable Web Analytics and Speed Insights for the frontend project (Vercel > Analytics). Watch function duration and error rate under Observability. Cold starts in `syd1` are expected after idle periods.

## Request logging for audit

Vercel keeps request logs for the retention period of the plan only. If a longer record is required for compliance, use the database audit tables, or on a paid plan configure a log drain to an external store. Set `ENABLE_EMAIL_LOGGING=true` only if email events must be logged (it may include recipient addresses).

## Recommended next steps

- Add Sentry (free tier) to both apps for grouped error alerts and email notification.
- Add a scheduled uptime check against `https://api.visionvelocity.com.au/api/public/landing-page-data`.

## Sources

- https://vercel.com/docs/logs
- https://vercel.com/docs/analytics
- https://supabase.com/docs/guides/telemetry/logs
