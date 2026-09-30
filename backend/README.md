# Vision Velocity — Backend (Next.js 16 App Router)

Supabase-backed API layer: authentication, admin CRUD for charities/orders/
Bunnings stores, and a public landing-page-data endpoint — with two-tier
audit logging throughout. Built against the `vision-velocity` Supabase
project (see `../database` and the Claude project docs
`claude/supabase-project-setup.md` / `claude/nextjs-backend-setup.md` for
connection details and history).

## Setup

```bash
npm install
cp .env.example .env.local
# then fill in .env.local:
#   - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are already
#     filled in from the live project — leave as-is unless the project changes.
#   - SUPABASE_SERVICE_ROLE_KEY: copy from Supabase Dashboard → Project
#     Settings → API → service_role. Keep this out of git. Required not just
#     by lib/audit.ts but by proxy.ts too (it logs rejected admin
#     requests directly — see "Audit logging" below).
npm run dev
```

Runs at http://localhost:3000. API routes are under `/api/*`.

If `npm install` fails with `EACCES`/`Operation not permitted` errors and
this folder is inside OneDrive: delete `node_modules` first (git-ignored,
safe to delete) and consider pausing OneDrive sync during the install —
that's OneDrive's file locking during sync colliding with npm's
rename-based install strategy, not a problem with the code.

## Structure

```
app/
  api/
    auth/login|signup|logout    — Supabase Auth session issuing/revoking
    admin/charities               — admin-only CRUD (list/create, get/update)
    admin/orders                  — admin-only CRUD
    admin/bunnings                — admin-only CRUD (incl. [id]/magic-link — see 2026-09-24 note)
    admin/supplier-contact          — admin-only singleton CRUD (Task 2.4)
    admin/interactions             — admin-only CRM journal (Task 2.2/2.3)
    public/landing-page-data      — unauthenticated, rate-limited, public-read only
    public/bunnings-stores        — unauthenticated, public store picker for signup (Task 3.1)
    public/charities/signup       — unauthenticated, rate-limited charity signup (Task 3.1)
    bunnings/activities-officer   — unauthenticated (magic-link session), AO read-only portal (Task 3.2)
lib/
  supabase.ts   — the two Supabase client factories (RLS-scoped vs service-role)
  audit.ts      — application-level audit logging (see "Audit logging" below)
utils/
  errors.ts     — AppError + subclasses, handleApiError()
  cors.ts       — CORS header builder, driven by CLIENT_APP_URL
  rateLimit.ts  — in-memory rate limiter (see its header comment re: production)
proxy.ts        — CORS, rate limiting, admin JWT gate, request logging,
                  and rejected-admin-request audit logging (renamed from
                  middleware.ts for Next.js 16 — same file, same behaviour,
                  now always runs on the nodejs runtime, not Edge)
```

## Audit logging (two tiers)

**Database level — `audit_log`** (see the schema migration, not this repo):
a Postgres trigger (`audit_row_change()`) fires on every INSERT/UPDATE/DELETE
to `charities`, `orders`, `packages`, `leads`, `admin_users`,
`bunnings_stores`, and `supplier_contact`, capturing the full before/after
row as JSON automatically — no application code involved, so it can't be
bypassed by a bug here. Indexed on `timestamp` (that table has no
`created_at` column — audit events use `timestamp` throughout).

**Application level — `admin_action_log`** (`lib/audit.ts`, this repo): one
entry per admin API call, with:
- `admin_user_id` (FK) and `user_email` — who
- `action` — a human-readable label, e.g. `"updated_charity"`
- `entity_type` / `entity_id` — what it targeted, for `getAuditTrail()` /
  `getAdminActionLog()` lookups
- `changes` — a field-level `{before, after}` diff (via `diffChanges()`),
  scoped to just what that call actually changed, not the whole row
- `request_params`, `ip_address`, `user_agent` — captured on every call,
  success or failure
- `status` + `error_detail` — failed actions are logged too (see each
  route's catch block), not just successful ones

Every admin route handler calls `logAdminAction()` after a successful write,
**and** on a DB/constraint-level failure (not on a 400 validation error —
that's not a meaningful "admin action" attempt yet, just a malformed
request). `proxy.ts` separately logs every rejected `/api/admin/*`
request (401/403) directly via a service-role client, since a rejected
admin request is itself a security-relevant event worth keeping, and by
definition the caller never reached a route handler to log it themselves.

**Append-only, enforced at the database, not just by convention**: neither
`audit_log` nor `admin_action_log` has an UPDATE or DELETE RLS policy for
any role — including admins. Postgres denies both by default when no policy
grants them. `admin_action_log` has SELECT (admin-only) and INSERT
(admin-only, though the app writes via the service-role client so it can
log even a rejected/unauthenticated request); `audit_log` has SELECT only,
since only the trigger's `SECURITY DEFINER` function ever writes to it.

**Query helpers** (`lib/audit.ts`): `getAuditTrail(supabase, entityType,
entityId)` reads the row-level history from `audit_log`;
`getAdminActionLog(supabase, entityType, entityId)` reads the
application-level history from `admin_action_log`. Both are wired into each
admin `[id]` GET route behind an `?includeAudit=true` query param, so a
charity/order/Bunnings-store detail view can show its full change history
without a separate endpoint.

**Verified**: a full create → update → query cycle was run directly against
the live database (create a test charity, update two fields, confirm
`audit_log` captured both the full-row create and the full-row update via
the trigger, confirm an `admin_action_log` entry joins to it by
`entity_type`/`entity_id` with the correct field-level diff, confirm no
UPDATE/DELETE policy exists on either table via `pg_policies`), then the
test data was deleted. Not yet run through the actual HTTP API end-to-end,
since no Supabase Auth admin user exists yet to authenticate as (see below).

## Security model (read this before adding a route)

Every admin route is protected TWICE, independently:

1. **proxy.ts** (the Next.js 16 successor to `middleware.ts` — same file,
   renamed) checks the caller's JWT resolves to an active row in
   `admin_users`, and 401s/403s before the route handler even runs — logging
   the rejection to `admin_action_log` either way.
2. **Postgres RLS**, because every route handler queries Supabase using
   `getSupabaseForRequest(request)` — a client that forwards the caller's
   own JWT, so the database enforces the same admin-only rule (and the
   charity-self-access rules) a second time, independently of the app code.

`lib/supabase.ts` also exports `getSupabaseAdmin()`, a service-role client
that bypasses RLS entirely. It is used ONLY in `lib/audit.ts` (writing to
`admin_action_log` must succeed regardless of the caller's own row
visibility) and in `proxy.ts`'s admin-signOut and rejected-request-
logging paths. **Do not** reach for it in a route handler just because RLS
is blocking something — that means a policy needs to change in the schema,
not that this app should route around it.

## Known limitations to revisit before production

- **Rate limiting is in-memory** (`utils/rateLimit.ts`). It works correctly
  for local dev and a single-instance deployment, but on Vercel's
  serverless/multi-instance model each instance has its own counter — see
  that file's header comment for the fix (Upstash Redis).
- **No automated tests yet** — that's build-plan Task 4.1, scoped
  separately from this backend scaffold.
- **Charity-portal signup** (`POST /api/auth/signup`) creates the Auth user
  only; the corresponding `charities` row (with `auth_user_id` set) is
  created by the charity-signup flow, a separate frontend+API task
  (build-plan Task 3.1) not included here.
- **No admin users exist yet** in Supabase Auth — Rita and Natalie's
  accounts need to be created (an Auth user plus a matching `admin_users`
  row) before login/admin routes can be exercised end-to-end over HTTP.
- **Email tracking, campaign sending** are separate build-plan tasks (1.3,
  3.3) not covered here.

## Next.js 16 upgrade (2026-09-24)

Upgraded from Next.js 14.2.35 to 16.3.6 to clear five `npm audit` findings
against the 14.x line — most notably a **critical** unauthenticated RCE in
the Image Optimization API on Windows-hosted servers — none of which
Next.js backported to 14.x (only fixed from 15/16 onward). Post-upgrade
`npm audit` reports 0 vulnerabilities.

What changed:
- `next`/`react`/`react-dom` bumped to `^16.0.0`/`^19.2.0`/`^19.2.0`
  (Next.js 16's App Router requires React 19).
- `middleware.ts` renamed to `proxy.ts`, exported function renamed
  `middleware` → `proxy` (Next.js 16 deprecated the `middleware` filename;
  `proxy` always runs on the `nodejs` runtime now, not Edge — no functional
  change here since this file only ever used the fetch-based Supabase
  client, which works identically on both).
- The three `app/api/admin/{charities,orders,bunnings}/[id]/route.ts`
  handlers updated for Next.js 15+'s async dynamic APIs: `params` is now
  `Promise<{ id: string }>` and is awaited once near the top of each `GET`/
  `PATCH` handler (awaited *before* the `try` block in `PATCH`, so the
  resolved `id` stays in scope for the catch block's failure-logging call
  too).
- `next lint` was removed in Next.js 16 — the `lint` script was dropped
  from `package.json` (no ESLint config existed in this repo yet either
  way; add a flat `eslint.config.js` if/when linting is wanted).
- `tsconfig.json`'s `jsx` option is now `react-jsx` (Next.js 16 requires
  this; it updates the file automatically on build if it's missing).

Verified in an isolated sandbox (not the OneDrive-synced folder, to avoid
the known `npm install` file-locking issue): clean `npm install` (0
vulnerabilities), clean `tsc --noEmit`, and a clean `next build` producing
all 11 expected routes, including `proxy.ts` correctly recognised as
"Proxy (Middleware)" in the build output.

## Task 2.2 additions (2026-09-24)

Two small additions made to support the mobile-first admin dashboard
(Task 2.2, built in the frontend):

- **`GET /api/admin/orders`** now accepts an optional `?charity_id=` query
  parameter, filtering orders to a single charity. Used by the charity
  detail page's "Events" tab. Additive only — existing callers without the
  parameter are unaffected.
- **`app/api/admin/interactions/route.ts`** — new endpoint, technically
  Task 2.3 scope, pulled forward because Task 2.2's charity detail "Notes"
  tab needed it to be functional rather than a static placeholder.
  - `GET ?charity_id=&page=&pageSize=` — paginated `customer_interactions`
    rows for a charity (`charity_id` required).
  - `POST` — validates via a Zod schema (`charity_id` uuid required;
    `interaction_type` enum `phone_call|email|sms|meeting|note`;
    `direction` enum `inbound|outbound`; `subject`/`details`/`outcome`/
    `next_action`/`next_action_date` optional), inserts with
    `created_by` set from the caller's email, and logs an
    `admin_action_log` entry (`logged_customer_interaction`).

Note: **Bunnings store-level call logging does not use this table.**
`customer_interactions.charity_id` is `NOT NULL` in the deployed schema, so
it cannot represent a store-level interaction. The admin dashboard instead
appends timestamped free-text notes to the existing
`bunnings_stores.interaction_notes` column via the existing `PATCH
/api/admin/bunnings/[id]` route — no schema change needed.

Verified together with the frontend changes in an isolated sandbox: clean
`npm install` (0 vulnerabilities), clean `tsc --noEmit`, and a clean `next
build` producing all 12 expected routes (11 + the new interactions route).

**Correction (2026-09-24, later the same day):** the note above about
`/api/admin/supplier-contact` not existing is now out of date — see the section
below.

## Tasks 2.4, 3.1, 3.2 additions (2026-09-24)

Built, corrected against the live Supabase schema, and integrated in one
session (the original drafts for 2.4 and 3.1 existed only as an
unintegrated copy on disk; Task 3.2's first attempt didn't compile). Full
detail is in the Claude project docs — `claude/task-2-4-retail-partner-tracking.md`,
`claude/task-3-1-landing-and-signup.md`, `claude/task-3-2-bunnings-ao-portal.md`
— this note is a pointer, not a duplicate.

- `admin/supplier-contact` — GET/POST/PATCH singleton pattern (no DB uniqueness
  constraint on `supplier_contact`; enforced at the API layer).
- `admin/bunnings/[id]/magic-link` — admin-gated, generates a 7-day AO
  portal magic link.
- `public/bunnings-stores`, `public/charities/signup` — service-role client
  exceptions, both documented inline (no anon INSERT/SELECT policy exists
  for these; see the schema).
- `bunnings/activities-officer/{auth,events}` — public, AO-session-gated
  (custom `jose`-signed JWT, not a Supabase Auth session — another
  documented service-role exception).
- New table: `bunnings_ao_magic_links` (migration applied 2026-09-24, RLS
  enabled, admin-only policy).
- New env vars: `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` (see `.env.example`).

Verified in an isolated sandbox: clean `npm install` (0 vulnerabilities),
clean `tsc --noEmit`, clean `next build` — 17 routes total.
