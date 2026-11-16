/** Column lists for what a signed-in charity may see (never internal notes, tags or supplier pricing). */

import { z } from 'zod';

export const CHARITY_ORGANISATION_TYPES = ['charity', 'not_for_profit', 'community_group', 'sporting_club', 'school', 'other'] as const;
export const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

/**
 * Registration details recorded for a charity. All optional (create and update);
 * bank account details are not stored in this table.
 */
export const charityRegistrationFields = {
  trading_name: z.string().trim().max(150).nullable().optional(),
  organisation_type: z.enum(CHARITY_ORGANISATION_TYPES).nullable().optional(),
  acnc_registration: z.string().trim().max(100).nullable().optional(),
  registered_address: z.string().trim().max(300).nullable().optional(),
  state: z.enum(AUSTRALIAN_STATES).nullable().optional(),
  website: z.string().trim().max(300).nullable().optional(),
  contact_position: z.string().trim().max(150).nullable().optional(),
  contact_phone: z.string().trim().max(30).nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  confirmed_authorised_contact: z.boolean().optional(),
  confirmed_accurate_information: z.boolean().optional(),
  accepted_terms: z.boolean().optional(),
  acknowledged_privacy_policy: z.boolean().optional(),
  consented_to_contact: z.boolean().optional(),
  acknowledged_fees: z.boolean().optional(),
  fundraising_authority_details: z.string().trim().max(1000).nullable().optional(),
  fundraising_purpose: z.string().trim().max(1000).nullable().optional(),
  short_description: z.string().trim().max(300).nullable().optional(),
  fundraising_approver_name: z.string().trim().max(150).nullable().optional(),
};

export const CHARITY_SAFE_COLUMNS =
  'id, name, email, phone, location, contact_name, postcode, tax_id, bunnings_store_id, subscription_status, created_at, bunnings_stores(id, location, suburb, postcode)';

export const CHARITY_EVENT_COLUMNS =
  'id, event_date, event_name, status, cover_type, estimated_hotdogs, estimated_staff, number_of_shifts, actual_hotdogs_sold, number_of_sales, sales_value_aud, requested_by_charity, created_at, bunnings_stores(id, location, suburb, state, postcode, store_address, store_phone), event_packages(quantity, packages(name))';

export const CHARITY_ORDER_COLUMNS =
  'id, event_date, status, delivery_address, delivery_contact_name, delivery_phone, special_requests, total_price_aud, created_at, packages(name, description)';

/** Today's date in Brisbane (UTC+10, no daylight saving). */
export function brisbaneToday(): string {
  return new Date(Date.now() + 10 * 3_600_000).toISOString().slice(0, 10);
}
