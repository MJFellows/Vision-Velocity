'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { downloadCsv } from '@/lib/exporting';
import { statusLabel } from '@/lib/labels';
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={orders.length === 0}
            onClick={() =>
              downloadCsv(
                'orders.csv',
                ['Event date', 'Charity', 'Package', 'Status', 'Total price', 'Delivery address', 'Delivery contact', 'Delivery phone'],
                orders.map((o) => [o.event_date, o.charities?.name ?? '', o.packages?.name ?? '', statusLabel(o.status), o.total_price_aud, o.delivery_address, o.delivery_contact_name ?? '', o.delivery_phone ?? ''])
              )
            }
          >
            Download spreadsheet
          </Button>
          <Link href="/admin/orders/new">
            <Button>+ New order</Button>
          </Link>
        </div>
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
        <p className="text-sm text-charcoal/70">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-charcoal/70">No orders yet. An order records what a charity has asked for (a package, delivery details and price). <Link href="/admin/orders/new" className="text-accent underline">Create the first order</Link> — you need at least one active package.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`}>
              <Card className="flex items-center justify-between hover:border-accent">
                <div>
                  <p className="font-medium text-navy">{order.charities?.name ?? 'Charity'}</p>
                  <p className="text-sm text-charcoal/70">
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
