'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { LocationFilterBar } from '@/components/LocationFilterBar';
import { listBunningsStores, type BunningsFilters, type LocationFilters } from '@/lib/adminApi';
import type { BunningsStore } from '@/lib/types';

export default function AdminBunningsPage() {
  const [stores, setStores] = useState<BunningsStore[]>([]);
  const [filters, setFilters] = useState<LocationFilters>({});
  const [source, setSource] = useState<'' | 'manual' | 'import'>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: BunningsFilters = { ...filters, source: source || undefined };
      const res = await listBunningsStores(true, params);
      setStores(res.data);
    } catch {
      setError('Could not load Bunnings stores — check the filters and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, source]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1>Bunnings stores</h1>
        <Link href="/admin/bunnings/new">
          <Button>+ Add store</Button>
        </Link>
      </div>

      <LocationFilterBar
        initial={filters}
        searchLabel="Store or suburb"
        onApply={setFilters}
        extra={
          <Select
            label="Record type"
            name="source"
            value={source}
            onChange={(e) => setSource(e.target.value as '' | 'manual' | 'import')}
            options={[
              { value: '', label: 'All stores' },
              { value: 'manual', label: 'Visited / entered by team' },
              { value: 'import', label: 'National directory' },
            ]}
          />
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <p className="mb-3 text-sm text-charcoal/60" aria-live="polite">
        {isLoading ? 'Loading…' : `${stores.length.toLocaleString('en-AU')} store${stores.length === 1 ? '' : 's'}`}
      </p>

      {!isLoading && stores.length === 0 ? (
        <p className="text-sm text-charcoal/60">No Bunnings stores match these filters.</p>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => (
            <Link key={store.id} href={`/admin/bunnings/${store.id}`}>
              <Card className="hover:border-accent">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy">{store.location}</p>
                    <p className="text-sm text-charcoal/60">
                      {[store.suburb, store.state, store.postcode].filter(Boolean).join(' ') || 'Location not recorded'}
                    </p>
                    <p className="text-sm text-charcoal/60">
                      {store.activities_officer_name || 'No Activities Officer on file'}
                      {store.activities_officer_phone ? ` — ${store.activities_officer_phone}` : ''}
                    </p>
                  </div>
                  {store.source === 'manual' && <Badge tone="info">Visited</Badge>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
