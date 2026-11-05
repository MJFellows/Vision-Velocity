# Vision Velocity — Recommended Next Steps

**Compiled:** 5 November 2026
**Updated:** 5 November 2026 — Mark and Natalie's temporary passwords changed (reported by Mark).
**Sources:** ROADMAP.md (28 Sep, fifth revision), BUILD_STATUS.md (30 Sep), task-4-2-deployment-progress-2026-09-30.md, supplier-refactor-and-store-import-2026-09-30.md, build-plan.md
**Note:** The most recent dated status is 30 September 2026. Items marked *status unknown* have no recorded update since then.

---

## 1. Technical — immediate (Mark)

1. ~~Sign in to production as an admin and change the temporary passwords~~ — **Done 5 November 2026 for Mark and Natalie (reported by Mark).** **Open:** Rita's password change (confirm with Rita).
2. **Exercise the supplier and Bunnings pages** (`/admin/suppliers`, `/admin/supplier-status`, `/admin/bunnings`) with a real admin login. These have not been run since deployment.
3. **Confirm the test sign-up emails arrived** (charity confirmation and admin notification).
4. **Run the manual Smoke test workflow** in GitHub Actions, and check a tracking link on production.
5. **Merge pull request #1**, create the `staging` branch and add branch protection.
6. **Set the email provider settings** (ROADMAP A3): `RESEND_API_KEY`, the verified sender and reply-to addresses, and `ADMIN_NOTIFICATION_EMAILS` (currently forwards to Mark only).
7. **Decide the admin account creation method** (ROADMAP A5 / D14), then create the three admin accounts and run the admin tests, the Approve action and the audit-log check (A7).

## 2. Technical — before any real charity uses the app

1. Upgrade Vercel (Hobby is non-commercial) and Supabase (Free has no automatic backups) to paid plans.
2. Replace the in-memory rate limiter, which is per-instance on Vercel, with a shared store such as Upstash Redis.
3. Add security headers and enforce roles (currently on hold); finish the 24-item security audit.
4. Test a backup restore and set up error tracking (for example Sentry).
5. Seed real data: packages are still empty; `suppliers` and `bunnings_stores` are imported.
6. Decide on the charity login gap and the thank-you page wording (it refers to a dashboard login that does not exist).
7. Decide on order status rules and whether staging should get its own database (staging currently shares production).

## 3. Business — the real gate for the pilot

The roadmap treats these as more important than the app. None has a recorded completion.

1. **Packages and prices** (C1): settle the flat all-inclusive prices for the pilot. Rita and Natalie.
2. **A4 flyer** (C2): one price per package, no product breakdown, no volume claims. Natalie.
3. **Bunnings store visits** (C3, C4): about three stores each; collect Activities Officer contacts; build the two seed lists. Rita and Natalie.
4. **Woolworths and 7am delivery** (C6): Natalie to ask specifically whether 7am Saturday delivery is feasible and who fulfils it.
5. **Pilot operating runbook** (C7): who sources and buys goods, how they reach the delivery address by 7am, who signs for them, and how invoicing on credit works. Rita, Natalie and Mark.
6. **Revise the pilot procedures** (C8): remove the assumed delivery guarantee and name one system of record (app or spreadsheet). Mark.
7. **Revise the landing page** (C9): remove the placeholder testimonial and unearned claims; provide charity-facing and Bunnings-facing versions.
8. **Charity terms and privacy statement** (C10): confirm legal points with a qualified adviser, and confirm incorporation, ABN and equity/roles. Rita.
9. **Support mailbox** (C11): set up `support@` or confirm `hello@`, and agree who monitors it.
10. **Recruit 10–15 pilot charities** (C12). Rita and Natalie.
11. **Train Rita and Natalie** and prepare the issue log, metrics sheet and go/no-go checklist (C13). Mark.
12. **Approve the brand direction** and answer the brand document's 10 open questions (C5). Rita and Natalie.

## 4. Decisions needed from Mark, Rita and Natalie

- Code location and repository confirmation (D4) — now answered: `MJFellows/Vision-Velocity`.
- Pilot volume target and duration (D9) — agree a specific number.
- Status of the survey, business plan and product requirements document (D10).
- Email open and click tracking for the pilot (D11) — confirm.
- Whether the revenue model is charity-pays or supplier-pays (E2 — after pilot evidence).

## 5. Pilot timing — flag

The roadmap put the pilot start at about **21 October 2026**. That date has passed, and no record shows whether the pilot started. The go/no-go test (ROADMAP, Stage C) should be confirmed before any recruitment goes out. **Mark to confirm the current pilot start date.**

---

*Recommended next steps only. Items marked as decisions or open questions require confirmation from the people named.*
