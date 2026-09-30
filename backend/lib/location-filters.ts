/**
 * Shared helpers for filtering store-location tables (suppliers, bunnings_stores)
 * by state and postcode.
 *
 * Australian postcodes are always exactly four digits. Callers may pass a
 * wildcard pattern: `*` matches any run of digits and `?` matches one digit,
 * e.g. `42*` (all postcodes starting 42), `4?20`, `*00`. A value of fewer than
 * four characters with no wildcard (e.g. `42`) is treated as a prefix, i.e. `42*`.
 */

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

export type PostcodeFilter =
  | { kind: 'exact'; value: string }
  | { kind: 'like'; pattern: string };

/** Returns null for empty input; throws Error with a user-safe message if invalid. */
export function parsePostcodeFilter(raw: string | null | undefined): PostcodeFilter | null {
  const input = (raw ?? '').trim();
  if (!input) return null;
  if (!/^[0-9*?]+$/.test(input)) {
    throw new Error('Postcode may contain only digits and the wildcards * and ?');
  }
  const hasWildcard = /[*?]/.test(input);
  if (!hasWildcard) {
    if (input.length > 4) throw new Error('Postcode must be at most 4 digits');
    return input.length === 4 ? { kind: 'exact', value: input } : { kind: 'like', pattern: `${input}%` };
  }
  // Collapse repeated * and cap length so a pattern can't be abused.
  const collapsed = input.replace(/\*+/g, '*');
  if (collapsed.length > 8) throw new Error('Postcode pattern is too long');
  return { kind: 'like', pattern: collapsed.replace(/\*/g, '%').replace(/\?/g, '_') };
}

export function normaliseState(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim().toUpperCase();
  if (!v) return null;
  if (!(AU_STATES as readonly string[]).includes(v)) {
    throw new Error(`State must be one of ${AU_STATES.join(', ')}`);
  }
  return v;
}

/** Escape user text for use inside a PostgREST ilike pattern / or() filter. */
export function safeSearchTerm(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim().slice(0, 100);
  if (!v) return null;
  // Strip characters that have meaning in PostgREST filter syntax or LIKE wildcards.
  return v.replace(/[%_,()*\\]/g, ' ').replace(/\s+/g, ' ').trim() || null;
}
