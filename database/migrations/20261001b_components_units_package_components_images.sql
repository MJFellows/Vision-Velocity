-- Applied to Supabase project kajhrbwxlzulqqissvwl on 2026-10-01 as migration
-- "components_units_package_components_images" (via the Supabase connector).
-- Kept here for reference; do not re-run.

create table public.component_units (
  name text primary key,
  display_order integer not null default 0
);
insert into public.component_units (name, display_order) values
  ('grams', 10), ('kilograms', 20), ('millilitres', 30), ('litres', 40),
  ('each', 50), ('pieces', 60), ('sheets', 70), ('cans', 80), ('jars', 90),
  ('bottles', 100), ('packs', 110), ('rolls', 120), ('boxes', 130);
alter table public.component_units enable row level security;
create policy component_units_admin_all on public.component_units for all using (is_admin()) with check (is_admin());

create type public.component_storage as enum ('shelf', 'refrigerated', 'frozen');

create table public.components (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pack_size text,
  quantity numeric(12,3) check (quantity is null or quantity > 0),
  unit text references public.component_units(name) on update cascade,
  size_litres numeric(10,3) check (size_litres is null or size_litres >= 0),
  storage public.component_storage,
  packaging_material text,
  target_buy_cost_aud numeric(10,2) check (target_buy_cost_aud is null or target_buy_cost_aud >= 0),
  target_sell_price_aud numeric(10,2) check (target_sell_price_aud is null or target_sell_price_aud >= 0),
  comments text,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint components_quantity_needs_unit check ((quantity is null) = (unit is null))
);
create unique index components_name_unique on public.components (lower(name)) where is_deleted = false;
alter table public.components enable row level security;
create policy components_admin_all on public.components for all using (is_admin()) with check (is_admin());
create trigger trg_components_audit after insert or update or delete on public.components
  for each row execute function public.audit_row_change();
create trigger trg_components_updated_at before update on public.components
  for each row execute function public.set_updated_at();

create table public.package_components (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  component_id uuid not null references public.components(id),
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_components_unique unique (package_id, component_id)
);
create index package_components_component_id_idx on public.package_components(component_id);
alter table public.package_components enable row level security;
create policy package_components_admin_all on public.package_components for all using (is_admin()) with check (is_admin());
create trigger trg_package_components_audit after insert or update or delete on public.package_components
  for each row execute function public.audit_row_change();
create trigger trg_package_components_updated_at before update on public.package_components
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('component-images', 'component-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
