'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { listBunningsStores } from '@/lib/adminApi';
import type { BunningsStore } from '@/lib/types';

export default function AdminBunningsPage() {
  const [stores, setStores] = useState<BunningsStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listBunningsStores(true);
      setStores(res.data);
    } catch {
      setError('Could not load Bunnings stores — try refreshing.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-charcoal/60">Loading…</p>
      ) : stores.length === 0 ? (
        <p className="text-sm text-charcoal/60">No Bunnings stores discovered yet.</p>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => (
            <Link key={store.id} href={`/admin/bunnings/${store.id}`}>
              <Card className="hover:border-accent">
                <p className="font-medium text-navy">{store.location}</p>
                <p className="text-sm text-charcoal/60">
                  {store.activities_officer_name || 'No Activities Officer on file'}
                  {store.activities_officer_phone ? ` — ${store.activities_officer_phone}` : ''}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
