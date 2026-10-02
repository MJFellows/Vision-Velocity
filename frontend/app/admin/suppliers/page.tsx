'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { LocationFilterBar } from '@/components/LocationFilterBar';
import { formatDay } from '@/components/OpeningHoursTable';
import { listSuppliers, listSupplierChains, type LocationFilters } from '@/lib/adminApi';
import type { Supplier, SupplierChain } from '@/lib/types';

const PAGE_SIZE = 50;

const TODAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export default function AdminSuppliersPage() {
  const [chains, setChains] = useState<SupplierChain[]>([]);
  const [chain, setChain] = useState('');
  const [filters, setFilters] = useState<LocationFilters>({});
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSupplierChains()
      .then((res) => setChains(res.data))
      .catch(() => setChains([]));
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listSuppliers({ supplier_chain: chain || undefined, ...filters, page, pageSize: PAGE_SIZE });
      setSuppliers(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch {
      setError('Could not load suppliers — check the filters and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [chain, filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const todayKey = TODAY_KEYS[new Date().getDay()];

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1>Suppliers</h1>
        <Link href="/admin/supplier-status">
          <Button variant="outline">Negotiation status</Button>
        </Link>
      </div>

      <LocationFilterBar
        initial={filters}
        searchLabel="Store or suburb"
        onApply={(f) => {
          setPage(1);
          setFilters(f);
        }}
        extra={
          <Select
            label="Supplier chain"
            name="supplier_chain"
            value={chain}
            onChange={(e) => {
              setPage(1);
              setChain(e.target.value);
            }}
            options={[{ value: '', label: 'All chains' }, ...chains.map((c) => ({ value: c.name, label: c.name }))]}
          />
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <p className="mb-3 text-sm text-charcoal/70" aria-live="polite">
        {isLoading ? 'Loading…' : `${total.toLocaleString('en-AU')} supplier${total === 1 ? '' : 's'}`}
      </p>

      {!isLoading && suppliers.length === 0 ? (
        <p className="text-sm text-charcoal/70">No suppliers match these filters.</p>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <Link key={s.id} href={`/admin/suppliers/${s.id}`}>
              <Card className="hover:border-accent">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy">{s.store_name}</p>
                    <p className="text-sm text-charcoal/70">
                      {[s.address, s.suburb].filter(Boolean).join(', ')} {s.state} {s.postcode}
                    </p>
                    <p className="text-sm text-charcoal/70">
                      {s.phone || 'No phone on file'}
                      {s.opening_hours ? ` · Today: ${formatDay(s.opening_hours[todayKey])}` : ''}
                    </p>
                  </div>
                  <Badge>{s.supplier_chain}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-charcoal/70">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
