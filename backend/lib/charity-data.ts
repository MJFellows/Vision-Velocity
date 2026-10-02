/** Column lists for what a signed-in charity may see (never internal notes, tags or supplier pricing). */

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
