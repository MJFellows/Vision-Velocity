'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { listCharities } from '@/lib/adminApi';
import type { Charity } from '@/lib/types';

export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listCharities({
        search: search || undefined,
        status: status || undefined,
        pageSize: 50,
      });
      setCharities(res.data);
    } catch {
      setError('Could not load charities — try refreshing.');
    } finally {
      setIsLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeout = setTimeout(load, 250); // debounce search-as-you-type
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1>Charities</h1>
        <Link href="/admin/charities/new">
          <Button>+ Add</Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sm:w-48">
          <Select
            placeholder="All statuses"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'trial', label: 'Trial' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-charcoal/60">Loading…</p>
      ) : charities.length === 0 ? (
        <p className="text-sm text-charcoal/60">No charities found.</p>
      ) : (
        <div className="space-y-3">
          {charities.map((charity) => (
            <Link key={charity.id} href={`/admin/charities/${charity.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:border-accent">
                <div>
                  <p className="font-medium text-navy">{charity.name}</p>
                  <p className="text-sm text-charcoal/60">{charity.location || charity.email || 'No location on file'}</p>
                </div>
                <Badge tone={toneForStatus(charity.subscription_status)}>{charity.subscription_status}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
