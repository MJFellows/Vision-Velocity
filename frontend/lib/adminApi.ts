/**
 * Typed convenience helpers over the generic api client (lib/api.ts) for
 * the admin backend routes this dashboard talks to. Kept as thin wrappers
 * — no client-side business logic, no direct Supabase calls — so the
 * backend's RLS + audit logging (see lib/audit.ts in 04-development/backend)
 * stays the single source of truth for every write.
 */

import { api } from './api';
import type {
  AdminActionLogEntry,
  AuditLogEntry,
  BunningsStore,
  Charity,
  CustomerInteraction,
  EventStatus,
  EventSupplierLink,
  EventSupplierStatus,
  FundraisingEvent,
  InteractionDirection,
  InteractionOutcome,
  InteractionType,
  Order,
  OrderStatus,
  Package,
  PaginatedResponse,
  SamePostcodeBunnings,
  SamePostcodeCharity,
  SamePostcodeSupplier,
  Supplier,
  SupplierChain,
  SupplierContact,
} from './types';

// ---------------------------------------------------------------------------
// Charities
// ---------------------------------------------------------------------------

export interface ListCharitiesParams {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function listCharities(params: ListCharitiesParams = {}) {
  return api.get<PaginatedResponse<Charity>>('/api/admin/charities', params as Record<string, string | number>);
}

export interface CharityDetail extends Charity {
  recent_interactions: CustomerInteraction[];
  audit_trail?: AuditLogEntry[];
  admin_action_log?: AdminActionLogEntry[];
}

export function getCharity(id: string, includeAudit = false) {
  return api.get<{ data: CharityDetail }>(`/api/admin/charities/${id}`, includeAudit ? { includeAudit: 'true' } : undefined);
}

export type CreateCharityInput = Pick<Charity, 'name'> &
  Partial<Pick<Charity, 'email' | 'phone' | 'location' | 'postcode' | 'contact_name' | 'tax_id' | 'bunnings_store_id' | 'internal_notes' | 'tags'>>;

export function createCharity(input: CreateCharityInput) {
  return api.post<{ data: Charity }>('/api/admin/charities', input);
}

export type UpdateCharityInput = Partial<CreateCharityInput> & { subscription_status?: string; annual_membership_fee_paid?: boolean };

export function updateCharity(id: string, input: UpdateCharityInput) {
  return api.patch<{ data: Charity }>(`/api/admin/charities/${id}`, input);
}

export interface ApproveCharityResult {
  data: Charity;
  email: { sent: boolean; error?: string };
}

/** Approves a charity awaiting approval (status "trial" -> "active") and emails it. */
export function approveCharity(id: string) {
  return api.post<ApproveCharityResult>(`/api/admin/charities/${id}/approve`, {});
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface ListOrdersParams {
  status?: OrderStatus;
  from?: string;
  to?: string;
  charity_id?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderWithRelations extends Order {
  charities: { name: string } | null;
  packages: { name: string } | null;
}

export function listOrders(params: ListOrdersParams = {}) {
  return api.get<PaginatedResponse<OrderWithRelations>>('/api/admin/orders', params as Record<string, string | number>);
}

export function getOrder(id: string, includeAudit = false) {
  return api.get<{ data: OrderWithRelations & { audit_trail?: AuditLogEntry[]; admin_action_log?: AdminActionLogEntry[] } }>(
    `/api/admin/orders/${id}`,
    includeAudit ? { includeAudit: 'true' } : undefined
  );
}

export interface CreateOrderInput {
  charity_id: string;
  package_id: string;
  event_date: string;
  delivery_address: string;
  delivery_contact_name?: string | null;
  delivery_phone?: string | null;
  special_requests?: string | null;
  total_price_aud: number;
}

export function createOrder(input: CreateOrderInput) {
  return api.post<{ data: Order }>('/api/admin/orders', input);
}

export interface UpdateOrderInput extends Partial<CreateOrderInput> {
  status?: OrderStatus;
  completed_at?: string | null;
}

export function updateOrder(id: string, input: UpdateOrderInput) {
  return api.patch<{ data: Order }>(`/api/admin/orders/${id}`, input);
}

// ---------------------------------------------------------------------------
// Bunnings stores
// ---------------------------------------------------------------------------

export interface LocationFilters {
  state?: string;
  postcode?: string; // 4 digits or wildcard pattern such as 42*
  search?: string;
}

export interface BunningsFilters extends LocationFilters {
  source?: 'manual' | 'import';
}

function definedParams<T extends object>(params: T): Record<string, string> {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')) as Record<string, string>;
}

export function listBunningsStores(activeOnly = true, filters: BunningsFilters = {}) {
  return api.get<{ data: BunningsStore[] }>('/api/admin/bunnings', {
    active: activeOnly ? 'true' : 'false',
    ...definedParams(filters),
  });
}

export function getBunningsStore(id: string, includeAudit = false) {
  return api.get<{ data: BunningsStore & { charities: { charity_id: string; charity_name: string }[]; audit_trail?: AuditLogEntry[]; admin_action_log?: AdminActionLogEntry[] } }>(
    `/api/admin/bunnings/${id}`,
    includeAudit ? { includeAudit: 'true' } : undefined
  );
}

export type CreateBunningsStoreInput = Pick<BunningsStore, 'location'> &
  Partial<
    Pick<
      BunningsStore,
      | 'store_address'
      | 'store_phone'
      | 'store_manager_name'
      | 'store_manager_email'
      | 'store_manager_phone'
      | 'activities_officer_name'
      | 'activities_officer_email'
      | 'activities_officer_phone'
      | 'discovered_by'
      | 'discovered_date'
      | 'interaction_notes'
    >
  >;

export function createBunningsStore(input: CreateBunningsStoreInput) {
  return api.post<{ data: BunningsStore }>('/api/admin/bunnings', input);
}

export type UpdateBunningsStoreInput = Partial<CreateBunningsStoreInput> & { is_active?: boolean };

export function updateBunningsStore(id: string, input: UpdateBunningsStoreInput) {
  return api.patch<{ data: BunningsStore }>(`/api/admin/bunnings/${id}`, input);
}

export interface BunningsAoMagicLink {
  token: string;
  magicLinkUrl: string;
  activitiesOfficerEmail: string;
  expiresAt: string;
}

/** Generates a one-time AO portal link for this store (Task 3.2). Sending it is manual until Task 3.3's email integration exists. */
export function generateBunningsAoMagicLink(id: string) {
  return api.post<{ data: BunningsAoMagicLink }>(`/api/admin/bunnings/${id}/magic-link`, {});
}

// ---------------------------------------------------------------------------
// Customer interactions (charity CRM notes/calls/etc.)
// ---------------------------------------------------------------------------

export interface CreateInteractionInput {
  charity_id: string;
  interaction_type: InteractionType;
  direction: InteractionDirection;
  subject?: string | null;
  details?: string | null;
  outcome?: InteractionOutcome | null;
  next_action?: string | null;
  next_action_date?: string | null;
}

export function createInteraction(input: CreateInteractionInput) {
  return api.post<{ data: CustomerInteraction }>('/api/admin/interactions', input);
}

// ---------------------------------------------------------------------------
// Packages (public read — used to populate the "package" dropdown on the
// new-order form; there's no admin-specific packages endpoint since
// packages are meant to be publicly readable anyway)
// ---------------------------------------------------------------------------

export function listActivePackages() {
  return api.get<{ data: { packages: Package[] } }>('/api/public/landing-page-data', undefined, true);
}

// ---------------------------------------------------------------------------
// Supplier negotiation contact (one record per supplier chain — see backend route comment)
// ---------------------------------------------------------------------------

export function getSupplierContact(supplierChain = 'Woolworths') {
  return api.get<{ data: SupplierContact | null }>('/api/admin/supplier-contact', { supplier_chain: supplierChain });
}

export type CreateSupplierContactInput = Pick<SupplierContact, 'contact_person_name'> &
  Partial<
    Pick<
      SupplierContact,
      | 'supplier_chain'
      | 'contact_email'
      | 'contact_phone'
      | 'contact_role'
      | 'status'
      | 'last_contact_date'
      | 'next_contact_date'
      | 'discussion_summary'
      | 'delivery_logistics_status'
      | 'supply_pricing_status'
      | 'commercial_agreement_status'
      | 'internal_notes'
    >
  >;

export function createSupplierContact(input: CreateSupplierContactInput) {
  return api.post<{ data: SupplierContact }>('/api/admin/supplier-contact', input);
}

export type UpdateSupplierContactInput = Partial<CreateSupplierContactInput>;

export function updateSupplierContact(supplierChain: string, input: Omit<UpdateSupplierContactInput, 'supplier_chain'>) {
  return api.patch<{ data: SupplierContact }>(`/api/admin/supplier-contact?supplier_chain=${encodeURIComponent(supplierChain)}`, input);
}

// ---------------------------------------------------------------------------
// Suppliers (store locations for Woolworths, Coles, IGA, ...)
// ---------------------------------------------------------------------------

export interface ListSuppliersParams extends LocationFilters {
  supplier_chain?: string;
  page?: number;
  pageSize?: number;
}

export function listSuppliers(params: ListSuppliersParams = {}) {
  return api.get<PaginatedResponse<Supplier>>('/api/admin/suppliers', definedParams(params));
}

export function getSupplier(id: string) {
  return api.get<{ data: Supplier }>(`/api/admin/suppliers/${id}`);
}

export function listSupplierChains() {
  return api.get<{ data: SupplierChain[] }>('/api/admin/supplier-chains');
}

// ---------------------------------------------------------------------------
// Same-postcode lookups (exact four-digit match)
// ---------------------------------------------------------------------------

/** 0 = same postcode only; otherwise also include records within this many kilometres. */
export type NearbyRadiusKm = 0 | 5 | 10 | 25 | 50;

export const NEARBY_RADIUS_OPTIONS: { value: NearbyRadiusKm; label: string }[] = [
  { value: 0, label: 'Same postcode only' },
  { value: 5, label: 'Within 5 km' },
  { value: 10, label: 'Within 10 km' },
  { value: 25, label: 'Within 25 km' },
  { value: 50, label: 'Within 50 km' },
];

interface SamePostcodeMeta {
  postcode: string | null;
  radius_km: number | null;
  /** null in exact mode; false when nearby matching was requested but the postcode can not be placed. */
  origin_available: boolean | null;
}

export function getBunningsSamePostcode<T extends 'suppliers' | 'charities'>(id: string, include: T, radiusKm: NearbyRadiusKm = 0) {
  type Row = T extends 'suppliers' ? SamePostcodeSupplier : SamePostcodeCharity;
  return api.get<SamePostcodeMeta & { data: Row[] }>(`/api/admin/bunnings/${id}/same-postcode`, {
    include,
    ...(radiusKm ? { radius_km: radiusKm } : {}),
  });
}

export function getCharitySamePostcode(id: string, radiusKm: NearbyRadiusKm = 0) {
  return api.get<SamePostcodeMeta & { data: { suppliers: SamePostcodeSupplier[]; bunnings_stores: SamePostcodeBunnings[] } }>(
    `/api/admin/charities/${id}/same-postcode`,
    radiusKm ? { radius_km: radiusKm } : undefined
  );
}

// ---------------------------------------------------------------------------
// Events (date + Bunnings store + charity; supplier stores linked with a per-event status)
// ---------------------------------------------------------------------------

export interface ListEventsParams {
  status?: EventStatus;
  charity_id?: string;
  bunnings_store_id?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function listEvents(params: ListEventsParams = {}) {
  return api.get<PaginatedResponse<FundraisingEvent>>('/api/admin/events', definedParams(params));
}

export function getEvent(id: string) {
  return api.get<{ data: FundraisingEvent }>(`/api/admin/events/${id}`);
}

export interface CreateEventInput {
  event_date: string;
  bunnings_store_id: string;
  charity_id: string;
  status?: EventStatus;
  notes?: string | null;
}

export function createEvent(input: CreateEventInput) {
  return api.post<{ data: FundraisingEvent }>('/api/admin/events', input);
}

export type UpdateEventInput = Partial<CreateEventInput> & { is_deleted?: boolean };

export function updateEvent(id: string, input: UpdateEventInput) {
  return api.patch<{ data: FundraisingEvent }>(`/api/admin/events/${id}`, input);
}

export function addEventSupplier(eventId: string, input: { supplier_id: string; status?: EventSupplierStatus; notes?: string | null }) {
  return api.post<{ data: EventSupplierLink }>(`/api/admin/events/${eventId}/suppliers`, input);
}

export function updateEventSupplier(eventId: string, linkId: string, input: { status?: EventSupplierStatus; notes?: string | null }) {
  return api.patch<{ data: EventSupplierLink }>(`/api/admin/events/${eventId}/suppliers/${linkId}`, input);
}

export function removeEventSupplier(eventId: string, linkId: string) {
  return api.delete<{ data: { id: string } }>(`/api/admin/events/${eventId}/suppliers/${linkId}`);
}
