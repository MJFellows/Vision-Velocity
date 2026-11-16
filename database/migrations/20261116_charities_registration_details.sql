-- 2026-11-16: charity registration details (organisation, authorised contact,
-- confirmations and optional fundraising details). Additive only: every new
-- column is optional, so no existing row or form becomes invalid.
-- Bank account details are deliberately NOT stored here (collected by a payment provider).
-- Organisation logo is NOT included yet (needs file storage).

alter table public.charities
  add column if not exists trading_name text,
  add column if not exists organisation_type text,
  add column if not exists acnc_registration text,
  add column if not exists registered_address text,
  add column if not exists state text,
  add column if not exists website text,
  add column if not exists contact_position text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists confirmed_authorised_contact boolean not null default false,
  add column if not exists confirmed_accurate_information boolean not null default false,
  add column if not exists accepted_terms boolean not null default false,
  add column if not exists acknowledged_privacy_policy boolean not null default false,
  add column if not exists consented_to_contact boolean not null default false,
  add column if not exists acknowledged_fees boolean not null default false,
  add column if not exists fundraising_authority_details text,
  add column if not exists fundraising_purpose text,
  add column if not exists short_description text,
  add column if not exists fundraising_approver_name text;

alter table public.charities
  add constraint charities_organisation_type_check check (
    organisation_type is null or organisation_type in ('charity', 'not_for_profit', 'community_group', 'sporting_club', 'school', 'other')
  ),
  add constraint charities_state_check check (
    state is null or state in ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')
  );
