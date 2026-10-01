# Vision Velocity - Deployment Procedures

Last updated: 2026-09-30. Repository: https://github.com/MJFellows/Vision-Velocity (private, branch `main`).

## 1. Architecture

| Item | Setting |
|---|---|
| Vercel projects | Two: `vision-velocity-backend` (root directory `backend`) and `vision-velocity-frontend` (root directory `frontend`), both imported from the repository above |
| Function region | `syd1` (Sydney), set in each app's `vercel.json`; Hobby allows one region |
| Production hostnames | Frontend `https://visionvelocity.com.au`; backend `https://api.visionvelocity.com.au` |
| Database | Supabase project `vision-velocity` (`kajhrbwxlzulqqissvwl`, ap-southeast-2). **Staging currently shares this database** (Mark's decision, 2026-09-30) |
| Plans | Vercel Hobby and Supabase Free (decision of 2026-09-29; see section 8) |

## 2. Branch and release flow

1. Work on a feature branch and open a pull request into `staging`.
2. GitHub Actions (`.github/workflows/ci.yml`) runs lint, type check and build for both apps, plus a committed-secret scan. All checks must pass.
3. Merge into `staging`. Vercel deploys a Preview build of the `staging` branch automatically (stable branch URL shown in the Vercel dashboard).
4. Rita and Natalie test on the staging URL. Run the **Smoke test** workflow (Actions tab) against the staging URLs.
5. **Manual promotion:** open a pull request from `staging` into `main` and merge it. Vercel deploys `main` to production. Merging is the approval step, so restrict who may merge (section 7).
6. Run the **Smoke test** workflow against production.

Rollback: Vercel dashboard > Deployments > choose the previous good deployment > Promote to Production (or revert the merge commit on `main`).

## 3. Vercel project setup (one-off, per app)

1. Vercel > Add New > Project > import `MJFellows/Vision-Velocity` (install the Vercel GitHub app for the repository if prompted).
2. Set **Root Directory** to `backend` (then repeat with `frontend`). Framework preset: Next.js. Production branch: `main`.
3. Add environment variables (section 4) before the first build.
4. Confirm the deployment summary shows region `syd1`.
5. Automatic deployments on push are on by default once the repository is connected.

## 4. Environment variables

Templates with no secrets: `.env.example` (index), `backend/.env.example`, `frontend/.env.example`. Enter values in Vercel > Settings > Environment Variables and mark secrets as Sensitive.

| Variable | Project | Production | Preview (staging) |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | both | current values | same (shared DB) |
| `SUPABASE_SERVICE_ROLE_KEY` | backend only | secret | secret |
| `JWT_SECRET` | backend | new random value | a **different** random value |
| `RESEND_API_KEY`, `EMAIL_PROVIDER=resend` | backend | secret | secret (see caution below) |
| `NEXT_PUBLIC_EMAIL_FROM`, `NEXT_PUBLIC_EMAIL_REPLY_TO`, `ADMIN_NOTIFICATION_EMAILS` | backend | current values | current values |
| `CLIENT_APP_URL` | backend | `https://visionvelocity.com.au` | staging frontend URL (exact origin, no trailing slash; comma-separate to allow several) |
| `NEXT_PUBLIC_APP_URL` | backend | `https://visionvelocity.com.au` | staging frontend URL |
| `TRACKING_BASE_URL` | backend | `https://api.visionvelocity.com.au` | staging backend URL |
| `NEXT_PUBLIC_API_BASE_URL` | frontend | `https://api.visionvelocity.com.au` | staging backend URL |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `ENABLE_EMAIL_LOGGING` | backend | 60000 / 20 / false | same |

Staging caution: because staging shares the production database, a staging signup sends real emails and creates real rows. Use obviously named test charities and delete them afterwards. Create a separate Supabase staging project before real charities are onboarded.

## 5. Database deployment

The production database is already the live project: all seven migrations are applied (`phase1_foundation_schema` through `bunnings_ao_magic_links`, verified 2026-09-30), so `supabase db push` is **not** needed for the first launch. The repository does not yet hold a `supabase/migrations` folder; migrations were applied through the Supabase connector.

For future schema changes: write the SQL as a migration file, review it, apply it to the database (`supabase db push` from a linked checkout, or the Supabase connector), then confirm with `list_migrations`. Take a manual backup first (`BACKUP_RESTORE.md`).

Seed data: all domain tables are empty. Bunnings stores and packages are **not** seeded; source data and a seed script are still to be provided.

## 6. Domain configuration (GoDaddy DNS)

1. In the frontend project: Settings > Domains > add `visionvelocity.com.au`. In the backend project add `api.visionvelocity.com.au`.
2. Vercel displays the exact DNS records to create. Create them in GoDaddy, replacing only the existing apex web (A) record and adding a CNAME for `api`.
3. **Do not touch** the MX, SPF, DKIM and DMARC records for business email, nor the `mail.` records used by Resend.
4. Wait for Vercel to show the domains as valid; SSL certificates are issued automatically.
5. In Supabase > Authentication > URL Configuration set the Site URL to `https://visionvelocity.com.au` and add it, plus the staging URL, to Redirect URLs.
6. Test: `https://visionvelocity.com.au` loads and the smoke test passes.

## 7. GitHub settings to apply

- Branch protection on `main` and `staging`: require pull request, require the `CI` checks (both `verify` jobs and `secret-scan`), block force pushes.
- Optional: create a GitHub Environment named `production` with required reviewers if a second approver is wanted.

## 8. Known risks and pending items

- **Vercel Hobby is for personal, non-commercial use** according to Vercel's pricing page. Move to Pro before any real charity uses the app.
- **Supabase Free** pauses after a week of inactivity and has no automatic backups. Move to Pro before real charity data is entered; until then follow the manual backup routine in `BACKUP_RESTORE.md`.
- **Rate limiting is in-memory** (`backend/utils/rateLimit.ts`), so limits apply per serverless instance, not globally. Replace with a shared store (for example Upstash Redis) before relying on it.
- Security headers and role enforcement are on hold (task 4.1 findings).
- No automated test suite exists in the repository, so CI cannot run tests yet; the live public test script lives outside the repo.
- Two frontend lint rules (`react-hooks/set-state-in-effect`, `react/no-unescaped-entities`) are reported as warnings (9 currently) and should be cleaned up.
- Prettier is not configured; the format check is advisory.
- Temporary admin passwords must be changed before launch.

## Sources

- https://vercel.com/pricing
- https://vercel.com/docs/regions
- https://vercel.com/docs/git
- https://vercel.com/docs/domains
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/backups
