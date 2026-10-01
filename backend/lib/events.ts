/** Shared constants for the Events feature (events + event_suppliers). */

export const EVENT_STATUSES = ['planned', 'confirmed', 'completed', 'cancelled'] as const;
export const EVENT_SUPPLIER_STATUSES = ['possible', 'confirmed', 'declined'] as const;

/** PostgREST select for an event with its Bunnings store, charity and linked supplier stores. */
export const EVENT_SELECT = `*, bunnings_stores(id, location, suburb, state, postcode), charities(id, name, postcode), event_suppliers(id, supplier_id, status, notes, suppliers(id, supplier_chain, store_name, suburb, state, postcode))` as const;
