-- Applied to Supabase project kajhrbwxlzulqqissvwl on 2026-10-02 through the Supabase
-- connector as migrations usage_events_and_feedback, charity_users_table,
-- current_charity_id_uses_charity_users, events_requested_by_charity and
-- usage_events_retention_job, plus the statements marked (SQL) run directly.
-- Kept here for reference; do not re-run.

-- Usage recording (pages and buttons only; never form contents)
create table public.usage_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  user_id uuid,
  user_type text not null check (user_type in ('admin', 'charity')),
  event_type text not null check (event_type in ('page_view', 'click', 'search_no_results', 'help_open', 'form_abandoned', 'form_submitted')),
  page text not null,
  target text,
  device text not null default 'unknown' check (device in ('phone', 'tablet', 'computer', 'unknown'))
);
create index usage_events_occurred_at_idx on public.usage_events (occurred_at);
create index usage_events_type_idx on public.usage_events (user_type, event_type, occurred_at);
alter table public.usage_events enable row level security;
create policy usage_events_admin_select on public.usage_events for select using (is_admin());

-- "Send feedback" messages
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  user_email text,
  user_type text not null check (user_type in ('admin', 'charity')),
  page text,
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'done')),
  email_sent boolean not null default false
);
alter table public.feedback enable row level security;
create policy feedback_admin_all on public.feedback for all using (is_admin()) with check (is_admin());

-- Documents emailed from the site
create table public.record_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  record_type text not null check (record_type in ('order', 'event')),
  record_id uuid not null,
  document text not null check (document in ('order_summary', 'run_sheet')),
  recipient_email text not null,
  recipient_name text,
  note text,
  include_prices boolean not null default false,
  sent_by_user_id uuid,
  sent_by_email text,
  sent_by_type text not null check (sent_by_type in ('admin', 'charity')),
  status text not null check (status in ('sent', 'failed')),
  error text
);
create index record_emails_record_idx on public.record_emails (record_type, record_id, created_at desc);
alter table public.record_emails enable row level security;
create policy record_emails_admin_select on public.record_emails for select using (is_admin());

-- People who can sign in for a charity
create table public.charity_users (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null references public.charities(id) on delete cascade,
  auth_user_id uuid not null unique,
  email text not null,
  name text,
  role text not null default 'member' check (role in ('owner', 'member')),
  is_active boolean not null default true,
  invited_at timestamptz not null default now(),
  invited_by text,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index charity_users_charity_idx on public.charity_users (charity_id);
alter table public.charity_users enable row level security;
create policy charity_users_admin_all on public.charity_users for all using (is_admin()) with check (is_admin());
create trigger trg_charity_users_audit after insert or update or delete on public.charity_users
  for each row execute function public.audit_row_change();
create trigger trg_charity_users_updated_at before update on public.charity_users
  for each row execute function public.set_updated_at();

insert into public.charity_users (charity_id, auth_user_id, email, name, role)
select id, auth_user_id, coalesce(email, ''), contact_name, 'owner' from public.charities
where auth_user_id is not null and is_deleted = false
on conflict (auth_user_id) do nothing;

create or replace function public.current_charity_id()
returns uuid language sql stable security definer set search_path to 'public' as $$
  select cu.charity_id from charity_users cu
  join charities c on c.id = cu.charity_id and c.is_deleted = false
  where cu.auth_user_id = auth.uid() and cu.is_active = true
  limit 1;
$$;

-- (SQL) Old direct-access policies for charities disabled (dropping them needs a manual
-- approval in the connector, so they were set to false instead). All charity access is
-- through the backend, scoped to the signed-in charity.
alter policy charities_self_select on public.charities using (false);
alter policy charities_self_update on public.charities using (false) with check (false);
alter policy orders_self_select on public.orders using (false);
alter policy orders_self_insert on public.orders with check (false);

-- Events requested by a charity
alter table public.events add column requested_by_charity boolean not null default false;
-- (SQL) run outside a transaction:
alter type public.event_status add value if not exists 'requested' before 'planned';

-- Delete usage records older than 12 months, daily at 03:30 Brisbane time
create extension if not exists pg_cron;
select cron.schedule('purge-old-usage-events', '30 17 * * *', $$delete from public.usage_events where occurred_at < now() - interval '12 months'$$);
