/**
 * Application-level audit logging — the "admin_action_log" half of the
 * audit trail. This is deliberately separate from the database's own
 * audit_log table, which is populated automatically by Postgres triggers
 * on charities, orders, packages, leads, admin_users, bunnings_stores, and
 * supplier_contact (see the schema migration) and captures the full
 * before/after row as JSON with no application code involved — that part
 * needs no help from here and cannot be bypassed by a bug in this file.
 *
 * What THIS file adds, that the trigger-level table can't:
 *   - a human-readable `action` label per API call (e.g. "updated_order")
 *     rather than a raw table diff
 *   - who performed it as a proper FK (admin_user_id) as well as the
 *     denormalised email
 *   - which entity it targeted (entity_type/entity_id), for the
 *     getAuditTrail()/getAdminActionLog() lookups below
 *   - the field-level before/after diff actually relevant to that one API
 *     call (via diffChanges()), not the whole row
 *   - the raw request params, so a FAILED action is still reconstructable
 *     from the log even though nothing was written to audit_log for it
 *     (the trigger only fires on a successful DB write)
 *   - ip_address / user_agent, matching what audit_log captures at the row
 *     level
 *
 * admin_action_log is append-only at the database level (see the
 * admin_action_log_append_only migration): there is no UPDATE or DELETE
 * RLS policy for any role, including admins, so entries written here
 * cannot later be edited or removed through the API — only through direct
 * database access, which is outside this application's control.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabase';

export type AdminActionStatus = 'success' | 'error' | 'pending';

export interface LogAdminActionParams {
  /** The acting admin's admin_users.id, when known (e.g. resolved by middleware). */
  adminUserId?: string | null;
  /** The acting admin's email — always required, even if adminUserId is unavailable
   *  (e.g. a rejected request where the caller never resolved to a valid admin). */
  userEmail: string;
  /** Human-readable action label, e.g. "created_charity", "updated_order_status". */
  action: string;
  description?: string;
  /** The table/resource this action targeted, e.g. "charities". */
  entityType?: string;
  /** The specific record acted on. */
  entityId?: string | null;
  /** Field-level before/after — see diffChanges() below for the usual way to build this. */
  changes?: Record<string, unknown> | null;
  /** The request body/query params, so a failed action is still reconstructable. */
  requestParams?: Record<string, unknown> | null;
  /** Multiple affected records, for bulk actions where a single entityId doesn't fit. */
  recordIds?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: AdminActionStatus;
  /** Populated when status = 'error': what went wrong. */
  errorDetail?: string | null;
}

/**
 * Writes one row to admin_action_log. Uses the service-role client
 * deliberately — this must succeed even when the acting user isn't a valid
 * admin at all (e.g. logging a rejected/unauthorized access attempt from
 * middleware, which by definition has no admin-scoped RLS access), and it
 * must never fail silently just because the underlying business operation
 * already failed for its own reasons.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('admin_action_log').insert({
    admin_user_id: params.adminUserId ?? null,
    user_email: params.userEmail,
    action: params.action,
    description: params.description ?? null,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    changes: params.changes ?? null,
    request_params: params.requestParams ?? null,
    record_ids: params.recordIds ?? [],
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    status: params.status ?? 'success',
    error_detail: params.errorDetail ?? null,
  });

  if (error) {
    // Deliberately does not throw: a failed audit-log write should never
    // cause the underlying business operation's response to change (it
    // already succeeded or failed on its own merits). Logged loudly
    // server-side so it's caught by monitoring instead.
    console.error('[AUDIT_LOG_WRITE_FAILED]', error, params);
  }
}

/**
 * Builds a { before, after } diff containing only the fields that actually
 * changed between two objects (shallow comparison — sufficient for the
 * flat column sets these tables use). Pass the pre-update row and the
 * update payload (or post-update row); returns null if nothing changed.
 */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};

  for (const key of Object.keys(after)) {
    const beforeValue = before[key];
    const afterValue = after[key];
    // JSON round-trip comparison handles objects/arrays (e.g. `tags`)
    // without pulling in a deep-equal dependency for this narrow use.
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changedBefore[key] = beforeValue;
      changedAfter[key] = afterValue;
    }
  }

  if (Object.keys(changedAfter).length === 0) return null;
  return { before: changedBefore, after: changedAfter };
}

/**
 * Fetches the full row-level change history for one record from audit_log
 * (the trigger-populated table), most recent first. Requires an
 * already-authenticated admin Supabase client — audit_log's RLS is
 * admin-select-only (see the schema).
 */
export async function getAuditTrail(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string
) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('table_name', entityType)
    .eq('record_id', entityId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * The application-level counterpart to getAuditTrail(): fetches the
 * admin_action_log entries for one entity, most recent first. Useful
 * alongside getAuditTrail() — audit_log shows exactly what changed at the
 * database row level, admin_action_log shows the human-readable sequence
 * of API calls (including any that failed) that produced those changes.
 */
export async function getAdminActionLog(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string
) {
  const { data, error } = await supabase
    .from('admin_action_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
}
