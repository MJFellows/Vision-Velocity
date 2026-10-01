/**
 * TypeScript interfaces matching the deployed Supabase schema (project kajhrbwxlzulqqissvwl,
 * public schema) exactly, as at 2026-09-24. Generated from a live `list_tables` inspection,
 * not hand-guessed — keep this file in sync with the schema if migrations change column names.
 *
 * Every domain table carries: id (uuid PK), created_at, updated_at, is_deleted (soft delete).
 */

// ---------------------------------------------------------------------------
// Shared enum types (Postgres USER-DEFINED enums)
// ---------------------------------------------------------------------------

export type OwnerPerson = 'rita' | 'natalie';
export type CharitySubscriptionStatus = 'trial' | 'active' | 'inactive';
export type OrderStatus = 'pending' | 'confirmed' | 'scheduled' | 'delivered' | 'cancelled';
export type SupplierContactRole = 'category_manager' | 'store_manager' | 'supply_manager' | 'other';
export type SupplierRelationshipStatus =
  | 'interested'
  | 'meeting_scheduled'
  | 'proposal_submitted'
  | 'negotiating'
  | 'agreed';
export type LeadSource = 'website_form' | 'email' | 'phone' | 'other';
export type LeadInquiryType = 'looking_to_order' | 'partnership' | 'feedback' | 'other';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted_to_order' | 'rejected';
export type InteractionType = 'phone_call' | 'email' | 'sms' | 'meeting' | 'note';
export type InteractionDirection = 'inbound' | 'outbound';
export type InteractionOutcome =
  | 'inquiry'
  | 'order_placed'
  | 'issue_resolved'
  | 'follow_up_needed'
  | 'no_outcome';
export type AuditAction = 'create' | 'update' | 'delete';
export type AdminActionStatus = 'success' | 'error' | 'pending';
export type EmailCampaignType = 'newsletter' | 'order_confirmation' | 'marketing' | 'promotional';
export type EmailBounceStatus = 'delivered' | 'bounced' | 'complained' | 'pending';
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';
export type AdminRole = 'admin' | 'support' | 'viewer';

// ---------------------------------------------------------------------------
// Domain tables
// ---------------------------------------------------------------------------

export interface BunningsStore {
  id: string;
  location: string;
  store_address: string | null;
  store_phone: string | null;
  store_manager_name: string | null;
  store_manager_email: string | null;
  store_manager_phone: string | null;
  activities_officer_name: string | null;
  activities_officer_email: string | null;
  activities_officer_phone: string | null;
  discovered_by: OwnerPerson | null;
  discovered_date: string | null; // date
  interaction_notes: string | null;
  is_active: boolean;
  // National directory fields (populated for source = 'import')
  bunnings_store_id: string | null;
  suburb: string | null;
  state: AuState | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  store_email: string | null;
  store_fax: string | null;
  map_url: string | null;
  services: string[];
  opening_hours: OpeningHours | null;
  opening_hours_raw: string | null;
  source: 'manual' | 'import'; // manual = visited/entered by the team, import = national directory file
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface Charity {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  postcode: string | null; // 4 digits; used for same-postcode lookups
  contact_name: string | null;
  tax_id: string | null;
  subscription_status: CharitySubscriptionStatus;
  annual_membership_fee_paid: boolean;
  bunnings_store_id: string | null;
  internal_notes: string | null;
  tags: string[]; // jsonb, e.g. ["high_value", "at_risk", "new", "loyal"]
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface PackageItem {
  [key: string]: unknown;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  base_price_aud: number;
  items: PackageItem[]; // jsonb
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  /** Present on admin package reads (GET /api/admin/packages). */
  package_components?: PackageComponentLink[];
}

export type ComponentStorage = 'shelf' | 'refrigerated' | 'frozen';

export const COMPONENT_STORAGE_LABELS: Record<ComponentStorage, string> = {
  shelf: 'Shelf',
  refrigerated: 'Refrigerated',
  frozen: 'Frozen',
};

/** An item or ingredient that goes into packages (sausages, bread, sauce, napkins ...). */
export interface Component {
  id: string;
  name: string;
  pack_size: string | null;
  quantity: number | null;
  unit: string | null;
  size_litres: number | null;
  storage: ComponentStorage | null;
  packaging_material: string | null;
  target_buy_cost_aud: number | null;
  target_sell_price_aud: number | null;
  comments: string | null;
  image_path: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface PackageComponentLink {
  id: string;
  component_id: string;
  quantity: number;
  components: Pick<Component, 'id' | 'name' | 'quantity' | 'unit' | 'target_buy_cost_aud' | 'target_sell_price_aud' | 'is_active'> | null;
}

export interface Order {
  id: string;
  charity_id: string;
  package_id: string;
  event_date: string; // date
  delivery_address: string;
  delivery_contact_name: string | null;
  delivery_phone: string | null;
  special_requests: string | null;
  status: OrderStatus;
  total_price_aud: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  is_deleted: boolean;
}

export interface SupplierContact {
  id: string;
  supplier_chain: string; // e.g. Woolworths, Coles, IGA (see supplier_chains table)
  contact_person_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_role: SupplierContactRole | null;
  natalie_owner: boolean;
  status: SupplierRelationshipStatus;
  last_contact_date: string | null;
  next_contact_date: string | null;
  discussion_summary: string | null;
  delivery_logistics_status: string | null;
  supply_pricing_status: string | null;
  commercial_agreement_status: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export type AuState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Normalised opening hours: 24-hour HH:MM times, or { closed: true }. Days may be missing if unknown. */
export type OpeningHours = Partial<Record<WeekdayKey, { open: string; close: string } | { closed: true }>>;

export interface SupplierChain {
  name: string;
  display_order: number;
}

/** A single supplier store location (Woolworths, Coles, IGA, ...). */
export interface Supplier {
  id: string;
  supplier_chain: string;
  source_store_id: string | null;
  store_name: string;
  address: string | null;
  suburb: string | null;
  state: AuState;
  postcode: string; // always 4 digits
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: OpeningHours | null;
  opening_hours_raw: string | null; // original source text, kept for provenance
  facilities: string[];
  contact_name: string | null;
  contact_email: string | null;
  contact_mobile: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface Lead {
  id: string;
  source: LeadSource;
  charity_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  inquiry_type: LeadInquiryType | null;
  message: string | null;
  status: LeadStatus;
  assigned_to: OwnerPerson | null;
  converted_to_charity_id: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface CustomerInteraction {
  id: string;
  charity_id: string;
  interaction_type: InteractionType;
  direction: InteractionDirection;
  subject: string | null;
  details: string | null;
  created_by: string | null;
  outcome: InteractionOutcome | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// ---------------------------------------------------------------------------
// Audit trail (see /lib/audit.ts in the backend for the write/read helpers)
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  performed_by: string;
  changes_before: Record<string, unknown> | null;
  changes_after: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  reason: string | null;
}

export interface AdminActionLogEntry {
  id: string;
  user_email: string;
  action: string;
  description: string | null;
  record_ids: string[]; // jsonb
  timestamp: string;
  status: AdminActionStatus;
  admin_user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  changes: { before: Record<string, unknown>; after: Record<string, unknown> } | null;
  request_params: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  error_detail: string | null;
}

// ---------------------------------------------------------------------------
// Email tracking
// ---------------------------------------------------------------------------

export interface EmailCampaign {
  id: string;
  name: string;
  type: EmailCampaignType;
  subject: string;
  html_content: string | null;
  sent_at: string | null;
  sent_by: OwnerPerson | null;
  recipient_count: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface EmailRecipient {
  id: string;
  campaign_id: string;
  charity_id: string | null;
  recipient_email: string;
  tracking_pixel_id: string;
  opened: boolean;
  opened_at: string | null;
  open_count: number;
  bounce_status: EmailBounceStatus;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface EmailLinkClick {
  id: string;
  campaign_id: string;
  recipient_id: string;
  link_url: string;
  link_text: string | null;
  clicked_at: string;
  utm_params: Record<string, string>;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// ---------------------------------------------------------------------------
// Analytics & admin
// ---------------------------------------------------------------------------

export interface PageView {
  id: string;
  page_url: string;
  visitor_id: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: DeviceType;
  timestamp: string;
  session_id: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  mobile_access_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// ---------------------------------------------------------------------------
// API envelope types (matching /utils/errors.ts in the backend)
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  session?: { access_token?: string; refresh_token?: string; expires_at?: number };
}

// ---------------------------------------------------------------------------
// Events (a date + Bunnings store + charity, with supplier stores linked per event)
// ---------------------------------------------------------------------------

export type EventStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled';
export type EventSupplierStatus = 'possible' | 'confirmed' | 'declined';
export type EventCoverType = 'inside' | 'outside_covered' | 'outside_uncovered';

export const EVENT_COVER_LABELS: Record<EventCoverType, string> = {
  inside: 'Inside',
  outside_covered: 'Outside, under cover',
  outside_uncovered: 'Outside, not under cover',
};

export interface EventPackageLink {
  id: string; // event_packages row id
  package_id: string;
  quantity: number;
  packages: Pick<Package, 'id' | 'name' | 'base_price_aud'> | null;
}

export interface EventSupplierLink {
  id: string; // event_suppliers row id
  supplier_id: string;
  status: EventSupplierStatus;
  notes: string | null;
  suppliers: Pick<Supplier, 'id' | 'supplier_chain' | 'store_name' | 'suburb' | 'state' | 'postcode'> | null;
}

export interface FundraisingEvent {
  id: string;
  event_date: string; // YYYY-MM-DD
  bunnings_store_id: string;
  charity_id: string;
  status: EventStatus;
  notes: string | null;
  event_name: string | null;
  estimated_hotdogs: number | null;
  estimated_staff: number | null;
  number_of_shifts: number | null;
  cover_type: EventCoverType | null;
  actual_hotdogs_sold: number | null;
  number_of_sales: number | null;
  sales_value_aud: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  event_packages: EventPackageLink[];
  bunnings_stores: Pick<BunningsStore, 'id' | 'location' | 'suburb' | 'state' | 'postcode'> | null;
  charities: Pick<Charity, 'id' | 'name' | 'postcode'> | null;
  event_suppliers: EventSupplierLink[];
}

// Same-postcode lookup rows (see backend lib/same-postcode.ts)
// distance_km is set only when a radius was requested (and the record could be placed).
export type SamePostcodeSupplier = Pick<Supplier, 'id' | 'supplier_chain' | 'store_name' | 'address' | 'suburb' | 'state' | 'postcode' | 'phone'> & { distance_km?: number | null };
export type SamePostcodeBunnings = Pick<BunningsStore, 'id' | 'location' | 'store_address' | 'suburb' | 'state' | 'postcode' | 'store_phone'> & { distance_km?: number | null };
export type SamePostcodeCharity = Pick<Charity, 'id' | 'name' | 'location' | 'postcode' | 'subscription_status' | 'contact_name' | 'phone'> & { distance_km?: number | null };
