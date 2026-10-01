-- Applied to Supabase project kajhrbwxlzulqqissvwl on 2026-10-01 as migration
-- "supplier_contacts_event_details_event_packages" (via the Supabase connector).
-- Kept here for reference; do not re-run.

-- 1. Supplier store contact
alter table public.suppliers
  add column contact_name text,
  add column contact_email text,
  add column contact_mobile text,
  add constraint suppliers_contact_email_format check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- 2. Event details
create type public.event_cover_type as enum ('inside', 'outside_covered', 'outside_uncovered');

alter table public.events
  add column event_name text,
  add column estimated_hotdogs integer,
  add column estimated_staff integer,
  add column number_of_shifts integer,
  add column cover_type public.event_cover_type,
  add column actual_hotdogs_sold integer,
  add column number_of_sales integer,
  add column sales_value_aud numeric(10,2),
  add constraint events_estimated_hotdogs_nonneg check (estimated_hotdogs is null or estimated_hotdogs >= 0),
  add constraint events_estimated_staff_nonneg check (estimated_staff is null or estimated_staff >= 0),
  add constraint events_number_of_shifts_nonneg check (number_of_shifts is null or number_of_shifts >= 0),
  add constraint events_actual_hotdogs_sold_nonneg check (actual_hotdogs_sold is null or actual_hotdogs_sold >= 0),
  add constraint events_number_of_sales_nonneg check (number_of_sales is null or number_of_sales >= 0),
  add constraint events_sales_value_nonneg check (sales_value_aud is null or sales_value_aud >= 0);

-- 3. Packages used at an event
create table public.event_packages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_packages_event_package_unique unique (event_id, package_id)
);
create index event_packages_event_id_idx on public.event_packages(event_id);
create index event_packages_package_id_idx on public.event_packages(package_id);

alter table public.event_packages enable row level security;
create policy event_packages_admin_all on public.event_packages for all using (is_admin()) with check (is_admin());

create trigger trg_event_packages_audit after insert or update or delete on public.event_packages
  for each row execute function public.audit_row_change();
create trigger trg_event_packages_updated_at before update on public.event_packages
  for each row execute function public.set_updated_at();
