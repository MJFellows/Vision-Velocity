-- 2026-10-03: invoices (not GST registered), invoice settings, automatic emails log,
-- Bunnings Activities Officer area (usage/feedback user type), system-sent record emails.
-- Applied through the Supabase connector as two migrations:
--   invoices_settings_automated_emails, bunnings_user_type_and_record_email_documents

create table if not exists public.invoice_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'Vision Velocity Pty Ltd',
  abn text check (abn is null or abn ~ '^[0-9]{11}$'),
  address text,
  email text,
  phone text,
  payment_terms_days integer not null default 14 check (payment_terms_days between 0 and 120),
  payment_instructions text,
  footer_note text,
  gst_registered boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by_email text
);
insert into public.invoice_settings (id) values (1) on conflict (id) do nothing;
alter table public.invoice_settings enable row level security;
create policy invoice_settings_admin_all on public.invoice_settings for all using (public.is_admin()) with check (public.is_admin());
create trigger trg_invoice_settings_audit after insert or update or delete on public.invoice_settings for each row execute function public.audit_row_change();
create trigger trg_invoice_settings_updated_at before update on public.invoice_settings for each row execute function public.set_updated_at();

create sequence if not exists public.invoice_number_seq start 1001;
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  order_id uuid not null references public.orders(id),
  charity_id uuid not null references public.charities(id),
  issue_date date not null,
  due_date date not null,
  amount_aud numeric(10,2) not null check (amount_aud >= 0),
  description text not null,
  seller jsonb not null,
  buyer jsonb not null,
  status text not null default 'issued' check (status in ('issued','paid','void')),
  paid_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_email text
);
create unique index if not exists invoices_one_live_per_order on public.invoices(order_id) where status <> 'void';
create index if not exists invoices_charity_idx on public.invoices(charity_id);
alter table public.invoices enable row level security;
create policy invoices_admin_all on public.invoices for all using (public.is_admin()) with check (public.is_admin());
create trigger trg_invoices_audit after insert or update or delete on public.invoices for each row execute function public.audit_row_change();
create trigger trg_invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();

create or replace function public.next_invoice_number() returns text
language sql security definer set search_path = public as $$
  select 'VV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
$$;
revoke all on function public.next_invoice_number() from public, anon, authenticated;

create table if not exists public.automated_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('order_received','order_confirmed','daily_summary')),
  record_id uuid,
  run_date date,
  recipients text not null,
  status text not null check (status in ('sent','failed','skipped')),
  detail text
);
create unique index if not exists automated_emails_daily_once on public.automated_emails(kind, run_date) where kind = 'daily_summary' and status = 'sent';
create index if not exists automated_emails_record_idx on public.automated_emails(record_id);
alter table public.automated_emails enable row level security;
create policy automated_emails_admin_select on public.automated_emails for select using (public.is_admin());

alter table public.usage_events drop constraint usage_events_user_type_check;
alter table public.usage_events add constraint usage_events_user_type_check check (user_type in ('admin','charity','bunnings'));
alter table public.feedback drop constraint feedback_user_type_check;
alter table public.feedback add constraint feedback_user_type_check check (user_type in ('admin','charity','bunnings'));
alter table public.record_emails drop constraint record_emails_document_check;
alter table public.record_emails add constraint record_emails_document_check check (document in ('order_summary','run_sheet','invoice','results_summary','supplier_sheet'));
alter table public.record_emails drop constraint record_emails_sent_by_type_check;
alter table public.record_emails add constraint record_emails_sent_by_type_check check (sent_by_type in ('admin','charity','bunnings','system'));
