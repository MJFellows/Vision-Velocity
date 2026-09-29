'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { listOrders, type OrderWithRelations } from '@/lib/adminApi';
import type { OrderStatus } from '@/lib/types';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listOrders({ status: status || undefined, pageSize: 50 });
      setOrders(res.data);
    } catch {
      setError('Could not load orders — try refreshing.');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1>Orders</h1>
        <Link href="/admin/orders/new">
          <Button>+ Add event</Button>
        </Link>
      </div>

      <div className="mb-4 sm:w-48">
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-charcoal/60">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-charcoal/60">No orders found.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`}>
              <Card className="flex items-center justify-between hover:border-accent">
                <div>
                  <p className="font-medium text-navy">{order.charities?.name ?? 'Charity'}</p>
                  <p className="text-sm text-charcoal/60">
                    {order.event_date} — {order.packages?.name ?? 'Package'}
                  </p>
                </div>
                <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
