-- =====================================================================
-- Vision Velocity - BASELINE SCHEMA SNAPSHOT (public schema)
-- Snapshot taken: 2026-10-25 from Supabase project kajhrbwxlzulqqissvwl
--   (vision-velocity, ap-southeast-2), Postgres 17.
--
-- PURPOSE: a snapshot for rebuilding a FRESH database (staging, recovery,
--          a new project). Apply to an empty project with Supabase Auth.
--
-- DO NOT RUN ON PRODUCTION. Production already has this schema; running
-- this file there would fail or duplicate objects.
--
-- Not included here (see the notes at the end of this file):
--   * Storage policies on storage.objects (none were found; the bucket is
--     public, so images are served by URL).
--   * Data. Reference data (suppliers, Bunnings stores, component units,
--     supplier chains) is loaded separately.
--   * Auth users, auth schema and Supabase-managed objects.
--
-- Migration files 20261001 to 20261003 remain in this folder for history.
-- This baseline already contains everything they created.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;

-- ---------- Enum types ----------
create type public.admin_action_status as enum ('success','error','pending');
create type public.admin_role as enum ('admin','support','viewer');
create type public.audit_action as enum ('create','update','delete');
create type public.charity_subscription_status as enum ('trial','active','inactive');
create type public.component_storage as enum ('shelf','refrigerated','frozen');
create type public.device_type as enum ('mobile','tablet','desktop','unknown');
create type public.email_bounce_status as enum ('delivered','bounced','complained','pending');
create type public.email_campaign_type as enum ('newsletter','order_confirmation','marketing','promotional');
create type public.event_cover_type as enum ('inside','outside_covered','outside_uncovered');
create type public.event_status as enum ('requested','planned','confirmed','completed','cancelled');
create type public.event_supplier_status as enum ('possible','confirmed','declined');
create type public.interaction_direction as enum ('inbound','outbound');
create type public.interaction_outcome as enum ('inquiry','order_placed','issue_resolved','follow_up_needed','no_outcome');
create type public.interaction_type as enum ('phone_call','email','sms','meeting','note');
create type public.lead_inquiry_type as enum ('looking_to_order','partnership','feedback','other');
create type public.lead_source as enum ('website_form','email','phone','other');
create type public.lead_status as enum ('new','contacted','qualified','converted_to_order','rejected');
create type public.order_status as enum ('pending','confirmed','scheduled','delivered','cancelled');
create type public.owner_person as enum ('rita','natalie');
create type public.supplier_contact_role as enum ('category_manager','store_manager','supply_manager','other');
create type public.supplier_relationship_status as enum ('interested','meeting_scheduled','proposal_submitted','negotiating','agreed');

-- ---------- Sequences ----------
create sequence public.invoice_number_seq start with 1001 increment by 1 cache 1;

-- ---------- Reference tables (no dependencies on other public tables) ----------
create table public.supplier_chains (
  name text primary key,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.component_units (
  name text primary key,
  display_order integer not null default 0
);

create table public.bunnings_stores (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  store_address text,
  store_phone text,
  store_manager_name text,
  store_manager_email text,
  store_manager_phone text,
  activities_officer_name text,
  activities_officer_email text,
  activities_officer_phone text,
  discovered_by public.owner_person,
  discovered_date date,
  interaction_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  bunnings_store_id text,
  suburb text,
  state text,
  postcode text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  store_email text,
  store_fax text,
  map_url text,
  services text[] not null default '{}'::text[],
  opening_hours jsonb,
  opening_hours_raw text,
  source text not null default 'manual',
  constraint bunnings_stores_location_unique unique (location),
  constraint bunnings_stores_state_check check (state = any (array['NSW','VIC','QLD','WA','SA','TAS','ACT','NT']::text[])),
  constraint bunnings_stores_postcode_check check (postcode ~ '^[0-9]{4}$'),
  constraint bunnings_stores_source_check check (source = any (array['manual','import']::text[]))
);
create unique index bunnings_stores_bunnings_store_id_uq on public.bunnings_stores (bunnings_store_id) where bunnings_store_id is not null;
create index idx_bunnings_stores_is_active on public.bunnings_stores (is_active) where is_deleted = false;
create index idx_bunnings_stores_state on public.bunnings_stores (state) where is_deleted = false;
create index idx_bunnings_stores_postcode on public.bunnings_stores (postcode text_pattern_ops) where is_deleted = false;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_chain text not null,
  source_store_id text,
  store_name text not null,
  address text,
  suburb text,
  state text not null,
  postcode text not null,
  phone text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  opening_hours jsonb,
  opening_hours_raw text,
  facilities text[] not null default '{}'::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  contact_name text,
  contact_email text,
  contact_mobile text,
  constraint suppliers_supplier_chain_fkey foreign key (supplier_chain) references public.supplier_chains (name),
  constraint suppliers_state_check check (state = any (array['NSW','VIC','QLD','WA','SA','TAS','ACT','NT']::text[])),
  constraint suppliers_postcode_check check (postcode ~ '^[0-9]{4}$'),
  constraint suppliers_contact_email_format check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
create unique index suppliers_chain_source_store_uq on public.suppliers (supplier_chain, source_store_id) where source_store_id is not null;
create index idx_suppliers_chain on public.suppliers (supplier_chain) where is_deleted = false;
create index idx_suppliers_state on public.suppliers (state) where is_deleted = false;
create index idx_suppliers_postcode on public.suppliers (postcode text_pattern_ops) where is_deleted = false;

create table public.supplier_contact (
  id uuid primary key default gen_random_uuid(),
  contact_person_name text not null,
  contact_email text,
  contact_phone text,
  contact_role public.supplier_contact_role,
  natalie_owner boolean not null default true,
  status public.supplier_relationship_status not null default 'interested',
  last_contact_date date,
  next_contact_date date,
  discussion_summary text,
  delivery_logistics_status text,
  supply_pricing_status text,
  commercial_agreement_status text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  supplier_chain text not null default 'Woolworths',
  constraint supplier_contact_supplier_chain_fkey foreign key (supplier_chain) references public.supplier_chains (name)
);
create index idx_supplier_contact_status on public.supplier_contact (status) where is_deleted = false;
create unique index supplier_contact_one_per_chain on public.supplier_contact (supplier_chain) where is_deleted = false;

-- ---------- Admin users and audit ----------
create table public.admin_users (
  id uuid primary key,
  email text not null,
  name text,
  role public.admin_role not null default 'admin',
  mobile_access_enabled boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint admin_users_email_unique unique (email),
  constraint admin_users_id_fkey foreign key (id) references auth.users (id) on delete cascade
);

create table public.admin_action_log (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  action text not null,
  description text,
  record_ids jsonb not null default '[]'::jsonb,
  "timestamp" timestamptz not null default now(),
  status public.admin_action_status not null default 'success',
  admin_user_id uuid,
  entity_type text,
  entity_id uuid,
  changes jsonb,
  request_params jsonb,
  ip_address inet,
  user_agent text,
  error_detail text,
  constraint admin_action_log_admin_user_id_fkey foreign key (admin_user_id) references public.admin_users (id) on delete set null
);
create index idx_admin_action_log_user_email on public.admin_action_log (user_email);
create index idx_admin_action_log_timestamp on public.admin_action_log ("timestamp" desc);
create index idx_admin_action_log_entity on public.admin_action_log (entity_type, entity_id);
create index idx_admin_action_log_admin_user_id on public.admin_action_log (admin_user_id);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action public.audit_action not null,
  performed_by text not null,
  changes_before jsonb,
  changes_after jsonb,
  ip_address inet,
  user_agent text,
  "timestamp" timestamptz not null default now(),
  reason text
);
create index idx_audit_log_table_record on public.audit_log (table_name, record_id);
create index idx_audit_log_performed_by on public.audit_log (performed_by);
create index idx_audit_log_timestamp on public.audit_log ("timestamp" desc);

-- ---------- Charities ----------
create table public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  location text,
  contact_name text,
  tax_id text,
  subscription_status public.charity_subscription_status not null default 'trial',
  annual_membership_fee_paid boolean not null default false,
  bunnings_store_id uuid,
  internal_notes text,
  tags jsonb not null default '[]'::jsonb,
  auth_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  postcode text,
  constraint charities_email_unique unique (email),
  constraint charities_bunnings_store_id_fkey foreign key (bunnings_store_id) references public.bunnings_stores (id) on delete set null,
  constraint charities_auth_user_id_fkey foreign key (auth_user_id) references auth.users (id) on delete set null,
  constraint charities_postcode_format check (postcode is null or postcode ~ '^[0-9]{4}$')
);
create index idx_charities_bunnings_store_id on public.charities (bunnings_store_id) where is_deleted = false;
create index idx_charities_subscription_status on public.charities (subscription_status) where is_deleted = false;
create index idx_charities_auth_user_id on public.charities (auth_user_id) where is_deleted = false;
create index idx_charities_tags on public.charities using gin (tags);
create index idx_charities_postcode on public.charities (postcode) where postcode is not null;

create table public.charity_users (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null,
  auth_user_id uuid not null,
  email text not null,
  name text,
  role text not null default 'member',
  is_active boolean not null default true,
  invited_at timestamptz not null default now(),
  invited_by text,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint charity_users_auth_user_id_key unique (auth_user_id),
  constraint charity_users_charity_id_fkey foreign key (charity_id) references public.charities (id) on delete cascade,
  constraint charity_users_role_check check (role = any (array['owner','member']::text[]))
);
create index charity_users_charity_idx on public.charity_users (charity_id);

create table public.bunnings_ao_magic_links (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  bunnings_store_id uuid not null,
  activities_officer_email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint bunnings_ao_magic_links_token_key unique (token),
  constraint bunnings_ao_magic_links_bunnings_store_id_fkey foreign key (bunnings_store_id) references public.bunnings_stores (id)
);
create index bunnings_ao_magic_links_store_idx on public.bunnings_ao_magic_links (bunnings_store_id);

-- ---------- Packages and components (catalogue) ----------
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  base_price_aud numeric(10,2) not null,
  items jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint packages_base_price_aud_check check (base_price_aud >= 0)
);

create table public.components (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pack_size text,
  quantity numeric(12,3),
  unit text,
  size_litres numeric(10,3),
  storage public.component_storage,
  packaging_material text,
  target_buy_cost_aud numeric(10,2),
  target_sell_price_aud numeric(10,2),
  comments text,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint components_unit_fkey foreign key (unit) references public.component_units (name) on update cascade,
  constraint components_quantity_check check (quantity is null or quantity > 0),
  constraint components_size_litres_check check (size_litres is null or size_litres >= 0),
  constraint components_target_buy_cost_aud_check check (target_buy_cost_aud is null or target_buy_cost_aud >= 0),
  constraint components_target_sell_price_aud_check check (target_sell_price_aud is null or target_sell_price_aud >= 0),
  constraint components_quantity_needs_unit check ((quantity is null) = (unit is null))
);
create unique index components_name_unique on public.components (lower(name)) where is_deleted = false;

create table public.package_components (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null,
  component_id uuid not null,
  quantity numeric(10,2) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_components_unique unique (package_id, component_id),
  constraint package_components_package_id_fkey foreign key (package_id) references public.packages (id) on delete cascade,
  constraint package_components_component_id_fkey foreign key (component_id) references public.components (id),
  constraint package_components_quantity_check check (quantity > 0)
);
create index package_components_component_id_idx on public.package_components (component_id);

-- ---------- Orders (one charity, one package, one delivery) ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null,
  package_id uuid not null,
  event_date date not null,
  delivery_address text not null,
  delivery_contact_name text,
  delivery_phone text,
  special_requests text,
  status public.order_status not null default 'pending',
  total_price_aud numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  is_deleted boolean not null default false,
  constraint orders_total_price_aud_check check (total_price_aud >= 0),
  constraint orders_charity_id_fkey foreign key (charity_id) references public.charities (id) on delete restrict,
  constraint orders_package_id_fkey foreign key (package_id) references public.packages (id) on delete restrict
);
create index idx_orders_charity_id on public.orders (charity_id) where is_deleted = false;
create index idx_orders_package_id on public.orders (package_id) where is_deleted = false;
create index idx_orders_status on public.orders (status) where is_deleted = false;
create index idx_orders_event_date on public.orders (event_date);

-- ---------- Events (a sizzle at a store for a charity) ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  bunnings_store_id uuid not null,
  charity_id uuid not null,
  status public.event_status not null default 'planned',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  event_name text,
  estimated_hotdogs integer,
  estimated_staff integer,
  number_of_shifts integer,
  cover_type public.event_cover_type,
  actual_hotdogs_sold integer,
  number_of_sales integer,
  sales_value_aud numeric(10,2),
  requested_by_charity boolean not null default false,
  constraint events_bunnings_store_id_fkey foreign key (bunnings_store_id) references public.bunnings_stores (id),
  constraint events_charity_id_fkey foreign key (charity_id) references public.charities (id),
  constraint events_estimated_hotdogs_nonneg check (estimated_hotdogs is null or estimated_hotdogs >= 0),
  constraint events_estimated_staff_nonneg check (estimated_staff is null or estimated_staff >= 0),
  constraint events_number_of_shifts_nonneg check (number_of_shifts is null or number_of_shifts >= 0),
  constraint events_actual_hotdogs_sold_nonneg check (actual_hotdogs_sold is null or actual_hotdogs_sold >= 0),
  constraint events_number_of_sales_nonneg check (number_of_sales is null or number_of_sales >= 0),
  constraint events_sales_value_nonneg check (sales_value_aud is null or sales_value_aud >= 0)
);
create index idx_events_event_date on public.events (event_date);
create index idx_events_bunnings_store_id on public.events (bunnings_store_id);
create index idx_events_charity_id on public.events (charity_id);

create table public.event_packages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  package_id uuid not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_packages_event_package_unique unique (event_id, package_id),
  constraint event_packages_event_id_fkey foreign key (event_id) references public.events (id) on delete cascade,
  constraint event_packages_package_id_fkey foreign key (package_id) references public.packages (id),
  constraint event_packages_quantity_check check (quantity > 0)
);
create index event_packages_event_id_idx on public.event_packages (event_id);
create index event_packages_package_id_idx on public.event_packages (package_id);

create table public.event_suppliers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  supplier_id uuid not null,
  status public.event_supplier_status not null default 'possible',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint event_suppliers_event_supplier_unique unique (event_id, supplier_id),
  constraint event_suppliers_event_id_fkey foreign key (event_id) references public.events (id) on delete cascade,
  constraint event_suppliers_supplier_id_fkey foreign key (supplier_id) references public.suppliers (id)
);
create index idx_event_suppliers_supplier_id on public.event_suppliers (supplier_id);

-- ---------- Invoices ----------
create table public.invoice_settings (
  id smallint primary key default 1,
  business_name text not null default 'Vision Velocity Pty Ltd',
  abn text,
  address text,
  email text,
  phone text,
  payment_terms_days integer not null default 14,
  payment_instructions text,
  footer_note text,
  gst_registered boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by_email text,
  constraint invoice_settings_id_check check (id = 1),
  constraint invoice_settings_abn_check check (abn is null or abn ~ '^[0-9]{11}$'),
  constraint invoice_settings_payment_terms_days_check check (payment_terms_days >= 0 and payment_terms_days <= 120)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  order_id uuid not null,
  charity_id uuid not null,
  issue_date date not null,
  due_date date not null,
  amount_aud numeric(10,2) not null,
  description text not null,
  seller jsonb not null,
  buyer jsonb not null,
  status text not null default 'issued',
  paid_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_email text,
  constraint invoices_invoice_number_key unique (invoice_number),
  constraint invoices_amount_aud_check check (amount_aud >= 0),
  constraint invoices_status_check check (status = any (array['issued','paid','void']::text[])),
  constraint invoices_order_id_fkey foreign key (order_id) references public.orders (id),
  constraint invoices_charity_id_fkey foreign key (charity_id) references public.charities (id)
);
create unique index invoices_one_live_per_order on public.invoices (order_id) where status <> 'void';
create index invoices_charity_idx on public.invoices (charity_id);

-- ---------- Customer activity, leads ----------
create table public.customer_interactions (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null,
  interaction_type public.interaction_type not null,
  direction public.interaction_direction not null,
  subject text,
  details text,
  created_by text,
  outcome public.interaction_outcome,
  next_action text,
  next_action_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint customer_interactions_charity_id_fkey foreign key (charity_id) references public.charities (id) on delete cascade
);
create index idx_customer_interactions_charity_id on public.customer_interactions (charity_id) where is_deleted = false;
create index idx_customer_interactions_next_action_date on public.customer_interactions (next_action_date) where next_action_date is not null;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  source public.lead_source not null default 'website_form',
  charity_name text,
  contact_name text,
  email text,
  phone text,
  location text,
  inquiry_type public.lead_inquiry_type,
  message text,
  status public.lead_status not null default 'new',
  assigned_to public.owner_person,
  converted_to_charity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint leads_converted_to_charity_id_fkey foreign key (converted_to_charity_id) references public.charities (id) on delete set null
);
create index idx_leads_status on public.leads (status) where is_deleted = false;
create index idx_leads_assigned_to on public.leads (assigned_to) where is_deleted = false;
create index idx_leads_converted_to_charity_id on public.leads (converted_to_charity_id);
create index idx_leads_created_at on public.leads (created_at desc);

-- ---------- Email campaigns (unused; see data-model known issues) ----------
create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.email_campaign_type not null default 'newsletter',
  subject text not null,
  html_content text,
  sent_at timestamptz,
  sent_by public.owner_person,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);
create index idx_email_campaigns_sent_at on public.email_campaigns (sent_at desc);
create index idx_email_campaigns_type on public.email_campaigns (type);

create table public.email_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  charity_id uuid,
  recipient_email text not null,
  tracking_pixel_id uuid not null default gen_random_uuid(),
  opened boolean not null default false,
  opened_at timestamptz,
  open_count integer not null default 0,
  bounce_status public.email_bounce_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint email_recipients_tracking_pixel_unique unique (tracking_pixel_id),
  constraint email_recipients_campaign_id_fkey foreign key (campaign_id) references public.email_campaigns (id) on delete cascade,
  constraint email_recipients_charity_id_fkey foreign key (charity_id) references public.charities (id) on delete set null
);
create index idx_email_recipients_campaign on public.email_recipients (campaign_id);
create index idx_email_recipients_charity on public.email_recipients (charity_id);

create table public.email_link_clicks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  recipient_id uuid not null,
  link_url text not null,
  link_text text,
  clicked_at timestamptz not null default now(),
  utm_params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint email_link_clicks_campaign_id_fkey foreign key (campaign_id) references public.email_campaigns (id) on delete cascade,
  constraint email_link_clicks_recipient_id_fkey foreign key (recipient_id) references public.email_recipients (id) on delete cascade
);
create index idx_email_link_clicks_campaign on public.email_link_clicks (campaign_id);
create index idx_email_link_clicks_recipient on public.email_link_clicks (recipient_id);

-- ---------- Feedback, usage, page views, sent-record log, automated emails ----------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  user_email text,
  user_type text not null,
  page text,
  message text not null,
  status text not null default 'new',
  email_sent boolean not null default false,
  constraint feedback_user_type_check check (user_type = any (array['admin','charity','bunnings']::text[])),
  constraint feedback_message_check check (char_length(message) >= 1 and char_length(message) <= 5000),
  constraint feedback_status_check check (status = any (array['new','done']::text[]))
);

create table public.usage_events (
  id bigint generated by default as identity primary key,
  occurred_at timestamptz not null default now(),
  user_id uuid,
  user_type text not null,
  event_type text not null,
  page text not null,
  target text,
  device text not null default 'unknown',
  constraint usage_events_user_type_check check (user_type = any (array['admin','charity','bunnings']::text[])),
  constraint usage_events_event_type_check check (event_type = any (array['page_view','click','search_no_results','help_open','form_abandoned','form_submitted']::text[])),
  constraint usage_events_device_check check (device = any (array['phone','tablet','computer','unknown']::text[]))
);
create index usage_events_occurred_at_idx on public.usage_events (occurred_at);
create index usage_events_type_idx on public.usage_events (user_type, event_type, occurred_at);

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  page_url text not null,
  visitor_id text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type public.device_type not null default 'unknown',
  "timestamp" timestamptz not null default now(),
  session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);
create index idx_page_views_timestamp on public.page_views ("timestamp" desc);
create index idx_page_views_session on public.page_views (session_id);

create table public.record_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  record_type text not null,
  record_id uuid not null,
  document text not null,
  recipient_email text not null,
  recipient_name text,
  note text,
  include_prices boolean not null default false,
  sent_by_user_id uuid,
  sent_by_email text,
  sent_by_type text not null,
  status text not null,
  error text,
  constraint record_emails_record_type_check check (record_type = any (array['order','event']::text[])),
  constraint record_emails_document_check check (document = any (array['order_summary','run_sheet','invoice','results_summary','supplier_sheet']::text[])),
  constraint record_emails_sent_by_type_check check (sent_by_type = any (array['admin','charity','bunnings','system']::text[])),
  constraint record_emails_status_check check (status = any (array['sent','failed']::text[]))
);
create index record_emails_record_idx on public.record_emails (record_type, record_id, created_at desc);

create table public.automated_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,
  record_id uuid,
  run_date date,
  recipients text not null,
  status text not null,
  detail text,
  constraint automated_emails_kind_check check (kind = any (array['order_received','order_confirmed','daily_summary']::text[])),
  constraint automated_emails_status_check check (status = any (array['sent','failed','skipped']::text[]))
);
create unique index automated_emails_daily_once on public.automated_emails (kind, run_date) where kind = 'daily_summary' and status = 'sent';
create index automated_emails_record_idx on public.automated_emails (record_id);

-- =====================================================================
-- Functions
-- =====================================================================
create or replace function public._audit_user_agent() returns text language plpgsql set search_path to 'public' as $function$
begin
  return nullif(current_setting('request.header.user-agent', true), '');
exception when others then
  return null;
end;
$function$;

create or replace function public._audit_ip_address() returns inet language plpgsql set search_path to 'public' as $function$
begin
  return nullif(current_setting('request.header.x-forwarded-for', true), '')::inet;
exception when others then
  return null;
end;
$function$;

create or replace function public._audit_performed_by() returns text language plpgsql set search_path to 'public' as $function$
begin
  return coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', ''),
    nullif(auth.jwt() ->> 'email', ''),
    'system'
  );
exception when others then
  return 'system';
end;
$function$;

create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_record_id uuid;
  v_action audit_action;
begin
  if (tg_op = 'INSERT') then
    v_record_id := new.id;
    v_action := 'create';
  elsif (tg_op = 'UPDATE') then
    v_record_id := new.id;
    v_action := 'update';
  elsif (tg_op = 'DELETE') then
    v_record_id := old.id;
    v_action := 'delete';
  end if;

  insert into audit_log (
    table_name, record_id, action, performed_by,
    changes_before, changes_after, ip_address, user_agent, "timestamp"
  ) values (
    tg_table_name,
    v_record_id,
    v_action,
    _audit_performed_by(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end,
    _audit_ip_address(),
    _audit_user_agent(),
    now()
  );

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$function$;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path to 'public' as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1 from admin_users
    where id = auth.uid()
      and is_active = true
      and is_deleted = false
  );
$function$;

create or replace function public.current_charity_id() returns uuid language sql stable security definer set search_path to 'public' as $function$
  select cu.charity_id from charity_users cu
  join charities c on c.id = cu.charity_id and c.is_deleted = false
  where cu.auth_user_id = auth.uid() and cu.is_active = true
  limit 1;
$function$;

create or replace function public.next_invoice_number() returns text language sql security definer set search_path to 'public' as $function$
  select 'VV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
$function$;

-- =====================================================================
-- Views
-- =====================================================================
create view public.bunnings_store_charities as
 SELECT bs.id AS bunnings_store_id,
    bs.location,
    c.id AS charity_id,
    c.name AS charity_name
   FROM (bunnings_stores bs
     JOIN charities c ON ((c.bunnings_store_id = bs.id)))
  WHERE ((c.is_deleted = false) AND (bs.is_deleted = false));

create view public.postcode_centroids as
 SELECT postcode,
    (avg(latitude))::double precision AS latitude,
    (avg(longitude))::double precision AS longitude,
    (count(*))::integer AS store_count
   FROM ( SELECT suppliers.postcode,
            suppliers.latitude,
            suppliers.longitude
           FROM suppliers
          WHERE ((suppliers.is_deleted = false) AND (suppliers.postcode IS NOT NULL) AND (suppliers.latitude IS NOT NULL) AND (suppliers.longitude IS NOT NULL))
        UNION ALL
         SELECT bunnings_stores.postcode,
            bunnings_stores.latitude,
            bunnings_stores.longitude
           FROM bunnings_stores
          WHERE ((bunnings_stores.is_deleted = false) AND (bunnings_stores.postcode IS NOT NULL) AND (bunnings_stores.latitude IS NOT NULL) AND (bunnings_stores.longitude IS NOT NULL))) s
  GROUP BY postcode;

-- =====================================================================
-- Triggers: audit trail and updated_at
-- =====================================================================
create trigger trg_event_packages_audit after insert or delete or update on public.event_packages for each row execute function audit_row_change();
create trigger trg_components_audit after insert or delete or update on public.components for each row execute function audit_row_change();
create trigger trg_package_components_audit after insert or delete or update on public.package_components for each row execute function audit_row_change();
create trigger trg_charity_users_audit after insert or delete or update on public.charity_users for each row execute function audit_row_change();
create trigger trg_invoice_settings_audit after insert or delete or update on public.invoice_settings for each row execute function audit_row_change();
create trigger trg_invoices_audit after insert or delete or update on public.invoices for each row execute function audit_row_change();
create trigger trg_charities_audit after insert or delete or update on public.charities for each row execute function audit_row_change();
create trigger trg_packages_audit after insert or delete or update on public.packages for each row execute function audit_row_change();
create trigger trg_orders_audit after insert or delete or update on public.orders for each row execute function audit_row_change();
create trigger trg_leads_audit after insert or delete or update on public.leads for each row execute function audit_row_change();
create trigger trg_email_campaigns_audit after insert or delete or update on public.email_campaigns for each row execute function audit_row_change();
create trigger trg_admin_users_audit after insert or delete or update on public.admin_users for each row execute function audit_row_change();
create trigger trg_supplier_contact_audit after insert or delete or update on public.supplier_contact for each row execute function audit_row_change();
create trigger trg_suppliers_audit after insert or delete or update on public.suppliers for each row execute function audit_row_change();
create trigger trg_bunnings_stores_audit after insert or delete or update on public.bunnings_stores for each row execute function audit_row_change();
create trigger trg_events_audit after insert or delete or update on public.events for each row execute function audit_row_change();
create trigger trg_event_suppliers_audit after insert or delete or update on public.event_suppliers for each row execute function audit_row_change();

create trigger trg_event_packages_updated_at before update on public.event_packages for each row execute function set_updated_at();
create trigger trg_components_updated_at before update on public.components for each row execute function set_updated_at();
create trigger trg_package_components_updated_at before update on public.package_components for each row execute function set_updated_at();
create trigger trg_charity_users_updated_at before update on public.charity_users for each row execute function set_updated_at();
create trigger trg_invoice_settings_updated_at before update on public.invoice_settings for each row execute function set_updated_at();
create trigger trg_invoices_updated_at before update on public.invoices for each row execute function set_updated_at();
create trigger trg_charities_updated_at before update on public.charities for each row execute function set_updated_at();
create trigger trg_packages_updated_at before update on public.packages for each row execute function set_updated_at();
create trigger trg_orders_updated_at before update on public.orders for each row execute function set_updated_at();
create trigger trg_leads_updated_at before update on public.leads for each row execute function set_updated_at();
create trigger trg_customer_interactions_updated_at before update on public.customer_interactions for each row execute function set_updated_at();
create trigger trg_email_campaigns_updated_at before update on public.email_campaigns for each row execute function set_updated_at();
create trigger trg_email_recipients_updated_at before update on public.email_recipients for each row execute function set_updated_at();
create trigger trg_email_link_clicks_updated_at before update on public.email_link_clicks for each row execute function set_updated_at();
create trigger trg_page_views_updated_at before update on public.page_views for each row execute function set_updated_at();
create trigger trg_admin_users_updated_at before update on public.admin_users for each row execute function set_updated_at();
create trigger trg_supplier_contact_updated_at before update on public.supplier_contact for each row execute function set_updated_at();
create trigger trg_suppliers_updated_at before update on public.suppliers for each row execute function set_updated_at();
create trigger trg_bunnings_stores_updated_at before update on public.bunnings_stores for each row execute function set_updated_at();
create trigger trg_events_updated_at before update on public.events for each row execute function set_updated_at();
create trigger trg_event_suppliers_updated_at before update on public.event_suppliers for each row execute function set_updated_at();

-- =====================================================================
-- Row-level security: enabled on every table
-- (Policies below. The back end uses the service key, which bypasses RLS.)
-- =====================================================================
alter table public.admin_action_log enable row level security;
alter table public.admin_users enable row level security;
alter table public.audit_log enable row level security;
alter table public.automated_emails enable row level security;
alter table public.bunnings_ao_magic_links enable row level security;
alter table public.bunnings_stores enable row level security;
alter table public.charities enable row level security;
alter table public.charity_users enable row level security;
alter table public.component_units enable row level security;
alter table public.components enable row level security;
alter table public.customer_interactions enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_link_clicks enable row level security;
alter table public.email_recipients enable row level security;
alter table public.event_packages enable row level security;
alter table public.event_suppliers enable row level security;
alter table public.events enable row level security;
alter table public.feedback enable row level security;
alter table public.invoice_settings enable row level security;
alter table public.invoices enable row level security;
alter table public.leads enable row level security;
alter table public.orders enable row level security;
alter table public.package_components enable row level security;
alter table public.packages enable row level security;
alter table public.page_views enable row level security;
alter table public.record_emails enable row level security;
alter table public.supplier_chains enable row level security;
alter table public.supplier_contact enable row level security;
alter table public.suppliers enable row level security;
alter table public.usage_events enable row level security;

-- =====================================================================
-- Row-level security policies
-- =====================================================================
create policy packages_public_select on public.packages for select to anon, authenticated using (is_active = true and is_deleted = false);
create policy packages_admin_all on public.packages for all to authenticated using (is_admin()) with check (is_admin());
create policy charities_admin_all on public.charities for all to authenticated using (is_admin()) with check (is_admin());
create policy charities_self_select on public.charities for select to authenticated using (false);
create policy charities_self_update on public.charities for update to authenticated using (false) with check (false);
create policy orders_admin_all on public.orders for all to authenticated using (is_admin()) with check (is_admin());
create policy orders_self_select on public.orders for select to authenticated using (false);
create policy orders_self_insert on public.orders for insert to authenticated with check (false);
create policy leads_public_insert on public.leads for insert to anon, authenticated with check (true);
create policy leads_admin_all on public.leads for all to authenticated using (is_admin()) with check (is_admin());
create policy bunnings_stores_admin_all on public.bunnings_stores for all to authenticated using (is_admin()) with check (is_admin());
create policy bunnings_ao_magic_links_admin_all on public.bunnings_ao_magic_links for all to authenticated using (is_admin()) with check (is_admin());
create policy customer_interactions_admin_all on public.customer_interactions for all to authenticated using (is_admin()) with check (is_admin());
create policy email_campaigns_admin_all on public.email_campaigns for all to authenticated using (is_admin()) with check (is_admin());
create policy email_recipients_admin_select on public.email_recipients for select to authenticated using (is_admin());
create policy email_link_clicks_admin_select on public.email_link_clicks for select to authenticated using (is_admin());
create policy page_views_admin_select on public.page_views for select to authenticated using (is_admin());
create policy supplier_contact_admin_all on public.supplier_contact for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_users_self_select on public.admin_users for select to authenticated using (id = (select auth.uid()));
create policy admin_users_admin_select on public.admin_users for select to authenticated using (is_admin());
create policy admin_users_admin_manage on public.admin_users for insert to authenticated with check (exists (select 1 from admin_users admin_users_1 where admin_users_1.id = (select auth.uid()) and admin_users_1.role = 'admin'::admin_role and admin_users_1.is_active));
create policy admin_users_admin_update on public.admin_users for update to authenticated using (exists (select 1 from admin_users admin_users_1 where admin_users_1.id = (select auth.uid()) and admin_users_1.role = 'admin'::admin_role and admin_users_1.is_active)) with check (exists (select 1 from admin_users admin_users_1 where admin_users_1.id = (select auth.uid()) and admin_users_1.role = 'admin'::admin_role and admin_users_1.is_active));
create policy audit_log_admin_select on public.audit_log for select to authenticated using (is_admin());
create policy admin_action_log_admin_select on public.admin_action_log for select to authenticated using (is_admin());
create policy admin_action_log_admin_insert on public.admin_action_log for insert to authenticated with check (is_admin());
create policy supplier_chains_admin_all on public.supplier_chains for all to public using (is_admin()) with check (is_admin());
create policy suppliers_admin_all on public.suppliers for all to public using (is_admin()) with check (is_admin());
create policy events_admin_all on public.events for all to public using (is_admin()) with check (is_admin());
create policy event_suppliers_admin_all on public.event_suppliers for all to public using (is_admin()) with check (is_admin());
create policy event_packages_admin_all on public.event_packages for all to public using (is_admin()) with check (is_admin());
create policy component_units_admin_all on public.component_units for all to public using (is_admin()) with check (is_admin());
create policy components_admin_all on public.components for all to public using (is_admin()) with check (is_admin());
create policy package_components_admin_all on public.package_components for all to public using (is_admin()) with check (is_admin());
create policy feedback_admin_all on public.feedback for all to public using (is_admin()) with check (is_admin());
create policy usage_events_admin_select on public.usage_events for select to public using (is_admin());
create policy record_emails_admin_select on public.record_emails for select to public using (is_admin());
create policy automated_emails_admin_select on public.automated_emails for select to public using (is_admin());
create policy charity_users_admin_all on public.charity_users for all to public using (is_admin()) with check (is_admin());
create policy invoice_settings_admin_all on public.invoice_settings for all to public using (is_admin()) with check (is_admin());
create policy invoices_admin_all on public.invoices for all to public using (is_admin()) with check (is_admin());

-- =====================================================================
-- Scheduled jobs (pg_cron)
-- =====================================================================
select cron.schedule('purge-old-usage-events', '30 17 * * *', $$delete from public.usage_events where occurred_at < now() - interval '12 months'$$);

-- =====================================================================
-- Storage bucket: component images (public read; 4 MB; JPEG, PNG, WebP)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('component-images', 'component-images', true, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- =====================================================================
-- Notes on this snapshot
-- =====================================================================
-- 1. Auth-managed objects (auth.users and the auth schema) are provided
--    by Supabase. Create the project first, then apply this file.
-- 2. Columns 'items' (packages), 'location' (charities), 'orders.package_id',
--    'event_packages', 'owner_person' columns and the unused email tables are
--    still present. They are listed for removal in prompt 2.6 of the
--    improvement plan (D10). Do not treat them as the intended design.
-- 3. The usage_events_id_seq is an identity sequence. Create it through the
--    identity column above; no separate sequence is needed.
-- 4. Storage policies on storage.objects: none were found on 2026-10-25.
-- 5. Reference data is not included (suppliers, bunnings_stores, supplier_chains,
--    component_units). Load it separately.
