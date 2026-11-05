# Vision Velocity — Recommended Next Steps

**Compiled:** 5 November 2026
**Updated:** 5 November 2026 (statuses as reported by Mark and checked in GitHub)
**Sources:** ROADMAP.md (28 Sep, fifth revision), BUILD_STATUS.md (30 Sep), task-4-2-deployment-progress-2026-09-30.md, supplier-refactor-and-store-import-2026-09-30.md, build-plan.md
**Note:** The most recent dated status in the source documents is 30 September 2026. Items marked *status unknown* have no recorded update since then.

**Key:** ✅ done · 🟡 partly done · ⏸ waiting on a decision or input · ⬜ not started

---

## 1. Technical — immediate (Mark)

1. ✅ **Admin sign-in and temporary passwords.** Mark and Natalie have changed theirs (5 Nov 2026). 🟡 **Rita still to change hers.**
2. ✅ **Supplier and Bunnings pages** (`/admin/suppliers`, `/admin/supplier-status`, `/admin/bunnings`) checked with a real admin sign-in.
3. ✅ **Test sign-up emails** (charity confirmation and admin notification) confirmed as received.
4. ✅ **Manual smoke test** run successfully against production (5 Nov 2026).
5. ✅ **Pull request #1 merged** (30 Sep 2026, `c658b22`). ✅ **`staging` branch created** from `main`. ✅ **Repository made public** and **branch ruleset active** on `main` and `staging` (deletion and force-push blocked). Ruleset set up on 5 Nov 2026.
6. ⏸ **Email provider settings** (ROADMAP A3). Deferred at Mark's request. Sending and approval emails were received live on 29 Sep. Production Vercel variables still to be confirmed by Mark.
7. ✅ **Admin accounts.** The three accounts exist (Mark, Rita, Natalie), confirmed by Mark on 5 Nov 2026. Creation method is therefore settled (ROADMAP A5 / D14). 🟡 The admin tests, the Approve action and the audit-log check (A7) still to run.

## 2. Technical — before any real charity uses the app

1. ⏸ Upgrade Vercel (Hobby is non-commercial) and Supabase (Free has no automatic backups) to paid plans. Not done: plan upgrades deferred at Mark's instruction.
2. ✅ Replace the in-memory rate limiter with a shared store: Upstash Redis via @upstash/ratelimit (commit `32c72c3`, 5 Nov 2026). Production limits to be checked after the next deploy.
3. ⏸ Add security headers and enforce roles (on hold at Mark's decision); finish the 24-item security audit.
4. ⬜ Test a backup restore and set up error tracking (for example Sentry).
5. ⬜ Seed real data: packages are still empty; `suppliers` and `bunnings_stores` are imported.
6. ⏸ Decide on the charity login gap and the thank-you page wording (it refers to a dashboard login that does not exist).
7. ⏸ Decide on order status rules and whether staging should get its own database (staging currently shares production).

## 3. Business — the real gate for the pilot

The roadmap treats these as more important than the app. None has a recorded completion.

1. ⬜ **Packages and prices** (C1): settle the flat all-inclusive prices for the pilot. Rita and Natalie.
2. ⬜ **A4 flyer** (C2): one price per package, no product breakdown, no volume claims. Natalie.
3. ⬜ **Bunnings store visits** (C3, C4): about three stores each; collect Activities Officer contacts; build the two seed lists. Rita and Natalie.
4. ⬜ **Woolworths and 7am delivery** (C6): Natalie to ask specifically whether 7am Saturday delivery is feasible and who fulfils it.
5. ⬜ **Pilot operating runbook** (C7): who sources and buys goods, how they reach the delivery address by 7am, who signs for them, and how invoicing on credit works. Rita, Natalie and Mark.
6. ⬜ **Revise the pilot procedures** (C8): remove the assumed delivery guarantee and name one system of record (app or spreadsheet). Mark.
7. ⬜ **Revise the landing page** (C9): remove the placeholder testimonial and unearned claims; provide charity-facing and Bunnings-facing versions.
8. ⬜ **Charity terms and privacy statement** (C10): confirm legal points with a qualified adviser, and confirm incorporation, ABN and equity/roles. Rita.
9. ⬜ **Support mailbox** (C11): set up `support@` or confirm `hello@`, and agree who monitors it.
10. ⬜ **Recruit 10–15 pilot charities** (C12). Rita and Natalie.
11. ⬜ **Train Rita and Natalie** and prepare the issue log, metrics sheet and go/no-go checklist (C13). Mark.
12. ⬜ **Approve the brand direction** and answer the brand document's 10 open questions (C5). Rita and Natalie.

## 4. Decisions needed from Mark, Rita and Natalie

- ✅ Code location and repository (D4): `MJFellows/Vision-Velocity`, now public.
- ⏸ Pilot volume target and duration (D9): agree a specific number.
- ⏸ Status of the survey, business plan and product requirements document (D10).
- ⏸ Email open and click tracking for the pilot (D11): confirm.
- ⏸ Whether the revenue model is charity-pays or supplier-pays (E2, after pilot evidence).

## 5. Pilot timing — flag

The roadmap put the pilot start at about **21 October 2026**. That date has passed, and no record shows whether the pilot started. The go/no-go test (ROADMAP, Stage C) should be confirmed before any recruitment goes out. **Mark to confirm the current pilot start date.**

---

*Recommended next steps only. Items marked as decisions or open questions require confirmation from the people named.*
