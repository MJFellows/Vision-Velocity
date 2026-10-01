# Vision Velocity — Frontend

Production-ready Next.js 14 (App Router) frontend for Vision Velocity, built against the
`04-development/backend` API (see that project's README for the backend itself).

## Stack

- Next.js 16 App Router, TypeScript strict mode
- Tailwind CSS v3 (brand tokens from `claude/brand-design-document-draft.md` — DRAFT, unapproved;
  see `tailwind.config.js` for the flagged colour values)
- React Context API for auth state (`lib/auth.tsx`)
- React Hook Form + Zod for form validation
- `fetch`-based API client (`lib/api.ts`) — talks to the backend's `/api` routes, never directly
  to Supabase from the browser, so the backend's audit logging and RLS-scoped queries are always
  the path used

## Setup

```bash
npm install
cp .env.example .env.local   # fill in SUPABASE keys if needed; API_BASE_URL points at the backend
npm run dev                  # runs on http://localhost:3001 (backend runs on :3000)
```

## Folder structure

```
/app
  /admin        — authenticated (Rita & Natalie): dashboard, charities, orders, bunnings, suppliers, supplier-status, login
  /charity      — charity users: signup, my-events, profile
  /public       — landing, about
/components
  /ui           — Button, Card, Input, Select
  /forms        — FormWrapper (React Hook Form + Zod + submit-error handling)
  /auth         — ProtectedRoute
  /layouts      — Header, Footer, AdminNav, AdminLayout, PublicLayout
/lib
  api.ts        — fetch wrapper, attaches JWT bearer token, throws ApiRequestError
  auth.tsx      — AuthContext, AuthProvider, useAuth hook
  types.ts      — TypeScript interfaces matching the live Supabase schema (project kajhrbwxlzulqqissvwl)
/styles
  globals.css   — Tailwind directives + base styles
```

## Authentication flow

1. `POST /api/auth/login` (backend) with email/password → returns `{ token, user }`.
2. Token is persisted to `localStorage` (`vv_auth_token`) and attached as `Authorization: Bearer <token>`
   on every subsequent request via `lib/api.ts`.
3. `ProtectedRoute` (used by `AdminLayout`) redirects to `/admin/login` if no valid session is found,
   and can additionally restrict by `admin_users.role` via its `allowedRoles` prop.
4. `logout()` calls `POST /api/auth/logout` (revokes the token server-side) and always clears local
   storage, even if that call fails, so the UI never gets stuck in a "logged in" state against a dead
   session.

Note: the frontend never decodes or trusts the JWT client-side — validity is always confirmed by the
backend on each request. This is consistent with the backend's own security model (RLS is the
authority; middleware is a fast-fail convenience layer), documented in
`04-development/backend/README.md`.

## Status

Scaffolding complete per Task 2.1: all routes listed in the brief exist as typed placeholder pages
(admin dashboard shell, list-view placeholders for charities/orders/bunnings/suppliers, a working
login page wired to the backend, and public/charity placeholder pages), all six "core components"
(AuthContext/useAuth, Button/Card/Input/Select, FormWrapper, ProtectedRoute, AdminLayout, PublicLayout)
are built, and the project builds cleanly (`next build` — 13 routes, zero type errors).

Not yet done:
- No real data fetching wired into the admin list pages or dashboard figures (deliberately left as
  placeholders per the task brief — "placeholder components for all routes").
- No charity sign-up form implementation (page exists, form itself not built).
- No table/pagination UI component yet (will be needed once the admin list pages are wired up).
- No automated tests.
- Brand colours/fonts are from the **unapproved draft** brand document — flagged inline in
  `tailwind.config.js` and should be revisited once the brand doc is finalised.

## A note on local `npm install`

This folder lives inside OneDrive Desktop sync. As documented in the backend README, `npm install`
can fail here with `EACCES`/"Operation not permitted" errors caused by OneDrive's file locking
conflicting with npm's install strategy. If you hit this: pause OneDrive sync, delete `node_modules`,
and retry — or develop from a non-synced local clone instead.

## Next.js 16 upgrade (2026-09-24)

Upgraded from Next.js 14.2.35 to 16.3.6 alongside the backend, to clear the
same five `npm audit` findings (including a critical RCE) that Next.js
never backported to the 14.x line. Post-upgrade `npm audit` reports 0
vulnerabilities.

This app has no dynamic route segments and doesn't call `cookies()`,
`headers()`, or `draftMode()`, so none of Next.js 15/16's async-request-API
breaking changes applied here — the upgrade was a version bump only
(`next`/`react`/`react-dom` to `^16.0.0`/`^19.2.0`/`^19.2.0`, plus matching
`@types/react`/`@types/react-dom`). `next lint` was removed in Next.js 16,
so the `lint` script was dropped from `package.json`.

Verified in an isolated sandbox: clean `npm install` (0 vulnerabilities),
clean `tsc --noEmit`, and a clean `next build` producing all 13 expected
routes.

## Task 2.2 — mobile-first admin dashboard (2026-09-24)

Built out the six admin screens from the Task 2.2 brief, wired to the real
backend API (no more placeholders), plus the mobile-first responsive shell:

- **Navigation**: `AdminNav` (desktop sidebar) is now hidden below the `md`
  breakpoint; a new `MobileNav` bottom tab bar (Home/Charities/Orders/
  Bunnings/Supplier, inline SVG icons, ≥44px touch targets) shows only on
  mobile. `AdminLayout` adds bottom padding so page content isn't hidden
  behind the fixed mobile nav.
- **Dashboard Home** (`/admin/dashboard`) — real stats on load: total
  charities, trial-status count, events this week, active Bunnings store
  count, and Revenue YTD (summed client-side from this year's non-cancelled
  orders; flagged as partial if more than 100 orders exist, since the stats
  call only pages the first 100).
- **Charities** (`/admin/charities`, `/admin/charities/new`,
  `/admin/charities/[id]`) — searchable/filterable list, add/edit form
  (`CharityForm`), and a detail view with an Events tab (this charity's
  orders) and a Notes tab (logs interactions via the new
  `/api/admin/interactions` endpoint, displays `recent_interactions` already
  embedded in the charity GET response).
- **Orders** (`/admin/orders`, `/admin/orders/new`, `/admin/orders/[id]`) —
  status-filtered list, add form (`EventForm`), detail view with inline
  status change.
- **Bunnings** (`/admin/bunnings`, `/admin/bunnings/new`,
  `/admin/bunnings/[id]`) — list, add/edit form (`BunningsStoreForm`), and a
  "Log a call" widget that appends a timestamped note to
  `interaction_notes` (see the backend README's Task 2.2 section for why
  this doesn't use `customer_interactions`).
- **Supplier** (`/admin/supplier-status`) — was a static "not yet available"
  shell as of this section; that is now out of date. Since 2026-09-24 this
  is a working three-state page (loading / create form / status card +
  edit) backed by the real `/api/admin/supplier-contact` endpoint — see the
  "Tasks 2.4, 3.1, 3.2 additions" section below.

**A documented schema discrepancy**: the Task 2.2 brief describes the "Add
Event" form as capturing "Bunnings location" and "expected attendees", but
the deployed `orders` table has no `bunnings_store_id` or
`expected_attendees` columns. `EventForm` was built against the real
schema instead (charity, package, event date, delivery address/contact/
phone, special requests, price) — see the comment at the top of
`components/forms/EventForm.tsx`.

New shared UI: `StatCard`, `Badge` (with a `toneForStatus()` helper
mapping schema enum values to colours), `Tabs`, and `lib/adminApi.ts` (a
fully-typed wrapper over the generic API client for every admin
endpoint used above).

Verified in an isolated sandbox alongside the backend changes: clean `npm
install` (0 vulnerabilities), clean `tsc --noEmit`, and a clean `next
build` producing all 17 expected routes.

## Tasks 2.4, 3.1, 3.2 additions (2026-09-24)

Full detail is in the Claude project docs — `claude/task-2-4-retail-partner-tracking.md`,
`claude/task-3-1-landing-and-signup.md`, `claude/task-3-2-bunnings-ao-portal.md`
— this note is a pointer, not a duplicate.

- **Supplier** (`/admin/supplier-status`) is now real — see the correction
  above.
- **Public landing page** (`/public/landing`) — `Hero`, `HowItWorks`,
  `Benefits`, `Testimonial`, `PricingTiers`, `FAQ`, `CTAFooter` sections.
- **Charity signup** (`/charity/signup`, `/charity/signup/success`) —
  4-step form (`SignupForm`), posts to `/api/public/charities/signup`,
  store picker fed by `/api/public/bunnings-stores`. Note: this flow does
  NOT create a Supabase Auth account for the charity, so `/charity/profile`
  and `/charity/my-events` remain unreachable placeholders — see the note
  in the backend's `app/api/auth/signup/route.ts`.
- **Bunnings Activities Officer portal** (`/bunnings/activities-officer/auth`,
  `/bunnings/activities-officer/events`) — magic-link auth (session held in
  `localStorage`), read-only event list, no pricing shown. A "Generate
  magic link" action was also added to `/admin/bunnings/[id]` so Rita/
  Natalie can actually produce a link (sending it is still manual pending
  Task 3.3's email integration).

Verified in an isolated sandbox alongside the backend changes: clean `npm
install` (0 vulnerabilities), clean `tsc --noEmit`, and a clean `next
build` producing all 21 expected routes.
