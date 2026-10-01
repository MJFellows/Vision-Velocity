# Vision Velocity - Backup and Restoration

Last updated: 2026-09-30.

## Current position

The Supabase project is on the **Free** plan, which has **no automatic backups**. Pro (US$25 a month) provides daily backups retained for 7 days. Until the upgrade, protection is a manual logical backup. **Automated backups have not been enabled and the restoration process has not been tested**; do the test in section 4 before real charity data is entered.

## 1. Manual backup (Free plan)

Run from a machine with the Supabase CLI installed (`supabase db dump` needs Docker Desktop running). Get the database connection string from Supabase > Project Settings > Database (use the pooler connection string). Never commit it.

```
supabase db dump --db-url "<connection string>" -f backup_schema_YYYYMMDD.sql
supabase db dump --db-url "<connection string>" --data-only -f backup_data_YYYYMMDD.sql
```

The dump does not include Supabase Auth users (the `auth` schema). After a restore into a new project the three admin logins (Mark, Rita, Natalie) must be recreated in Supabase Auth and matched to their `admin_users` rows.

Store backups in a private, access-controlled location (not the Git repository). Frequency: weekly, and before every schema change or bulk data operation. Keep at least four.

## 2. Automated backups (after upgrade)

1. Upgrade the organisation to Pro (confirm the quote first).
2. Supabase > Database > Backups: confirm daily backups are listed.
3. Optional add-on: Point-in-Time Recovery.

## 3. Restoration procedure

1. Stop writes: pause the frontend deployment or set a maintenance notice.
2. Take a fresh backup of the current state, even if damaged.
3. Restore into a **new, empty Supabase project first** (never straight over production):
   `psql "<new project connection string>" -f backup_schema_YYYYMMDD.sql` then the data file.
4. Verify row counts against expectations, RLS policies present, triggers present, and the seven migrations reflected.
5. If verified, either repoint the Vercel environment variables (`NEXT_PUBLIC_SUPABASE_URL`, both keys, service-role key) at the restored project and redeploy, or, on Pro, use the dashboard restore for the original project.
6. Update Supabase Auth URL settings and run the smoke test.
7. Record the incident in `CHANGELOG.md`.

## 4. Restore test (to do)

Create a temporary Supabase project, restore the latest dump into it, check tables/policies/triggers, then delete the project. Record the date and result here.

| Date | Result | By |
|---|---|---|
| Not yet performed | | |

## 5. Application recovery

Code recovery is via Git (GitHub) and Vercel's retained deployments (Promote a previous deployment to Production). Secrets are held in Vercel and the project's private notes; keep a copy of the environment variable names (see `.env.example`), and store secret values in a password manager.

## Sources

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/reference/cli/supabase-db-dump
