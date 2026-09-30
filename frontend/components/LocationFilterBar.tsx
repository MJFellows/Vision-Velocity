'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { LocationFilters } from '@/lib/adminApi';

export const AU_STATE_OPTIONS = [
  { value: '', label: 'All states' },
  ...['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map((s) => ({ value: s, label: s })),
];

/** Valid postcode filter: digits plus * (any digits) and ? (one digit), e.g. 42*, 4?20, 4217. */
export const POSTCODE_FILTER_PATTERN = /^[0-9*?]{0,8}$/;

/**
 * State / postcode / free-text filters shared by the Suppliers and Bunnings lists.
 * Filters are applied when the form is submitted (not on every keystroke) to avoid
 * hammering the API. `extra` renders additional selects (e.g. supplier chain) first.
 */
export function LocationFilterBar({
  initial,
  onApply,
  extra,
  searchLabel = 'Search',
}: {
  initial: LocationFilters;
  onApply: (filters: LocationFilters) => void;
  extra?: ReactNode;
  searchLabel?: string;
}) {
  const [state, setState] = useState(initial.state ?? '');
  const [postcode, setPostcode] = useState(initial.postcode ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const [postcodeError, setPostcodeError] = useState<string | undefined>();

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const pc = postcode.trim();
    if (!POSTCODE_FILTER_PATTERN.test(pc)) {
      setPostcodeError('Use digits with * or ? wildcards, e.g. 42*');
      return;
    }
    setPostcodeError(undefined);
    onApply({ state: state || undefined, postcode: pc || undefined, search: search.trim() || undefined });
  };

  const clear = () => {
    setState('');
    setPostcode('');
    setSearch('');
    setPostcodeError(undefined);
    onApply({});
  };

  return (
    <form onSubmit={apply} className="mb-6 rounded-card border border-grey bg-white p-4" aria-label="Filters">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {extra}
        <Select label="State" name="state" value={state} onChange={(e) => setState(e.target.value)} options={AU_STATE_OPTIONS} />
        <Input
          label="Postcode"
          name="postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="e.g. 42*"
          helperText="4 digits; * = any digits, ? = one digit"
          error={postcodeError}
          inputMode="text"
          maxLength={8}
        />
        <Input
          label={searchLabel}
          name="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or suburb"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </div>
    </form>
  );
}
