// Reference: Types needed in lib/types.ts for Task 2.4
// These types should already exist from Task 1.2 (generated from Supabase schema)
// This file shows what they should look like

/**
 * Bunnings Store Type
 * Represents a discovered Bunnings store and its Activities Officer contact
 */
export interface BunningsStore {
  id: string;
  location: string;
  address: string;
  store_phone: string;
  activities_officer_name: string;
  activities_officer_email: string;
  activities_officer_phone: string;
  discovered_by: string;
  discovered_date: string | null;
  interaction_notes: string | null;
  is_active: boolean;
  charities_run_sizzles_here?: string[] | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/**
 * Woolworths Negotiation Contact Type
 * Represents the current status of Woolworths partnership negotiations
 */
export interface WoolworthsContact {
  id: string;
  primary_owner: string; // Usually 'natalie'
  status: 'interested' | 'meeting_scheduled' | 'proposal_submitted' | 'negotiating' | 'agreed';
  store_manager_name: string | null;
  store_manager_email: string | null;
  store_manager_phone: string | null;
  last_contact_date: string | null;
  next_milestone_date: string | null;
  delivery_logistics_status: string | null;
  supply_pricing_status: string | null;
  commercial_agreement_status: string | null;
  negotiation_notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/**
 * Admin Action Log Entry Type
 * Represents an audit log entry for admin actions
 */
export interface AdminActionLogEntry {
  id: string;
  admin_user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string; // e.g., 'bunnings_stores', 'woolworths_contact'
  entity_id: string;
  changes: Record<string, any> | null; // Field-level diff
  request_params: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  error_detail: string | null;
  created_at: string;
}

/**
 * API Error Response Type
 * Standard error response format from all API routes
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    statusCode: number;
    type?: string;
  };
}

/**
 * API Success Response Types
 */
export interface ApiListResponse<T> {
  data: T[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiDetailResponse<T> {
  data: T;
  audit?: AdminActionLogEntry[];
}

export interface ApiCreateResponse<T> {
  data: T;
}

export interface ApiUpdateResponse<T> {
  data: T;
}

// Example usage in components:
// const [stores, setStores] = useState<BunningsStore[]>([]);
// const [woolworths, setWoolworths] = useState<WoolworthsContact | null>(null);
