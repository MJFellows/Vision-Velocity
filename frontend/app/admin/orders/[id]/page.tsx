'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { getOrder, updateOrder } from '@/lib/adminApi';
import type { OrderStatus } from '@/lib/types';
import type { OrderWithRelations } from '@/lib/adminApi';

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderWithRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getOrder(id);
      setOrder(data);
    } catch {
      setError('Could not load this order.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (status: OrderStatus) => {
    setIsSaving(true);
    try {
      await updateOrder(id, { status });
      await load();
    } catch {
      setError('Could not update status — try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (error && !order) {
    return (
      <AdminLayout>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/admin/orders" className="mt-4 inline-block text-sm text-accent underline">
          &larr; Back to orders
        </Link>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <p className="text-sm text-charcoal/60">Loading…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link href="/admin/orders" className="mb-4 inline-block text-sm text-accent underline">
        &larr; Back to orders
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1">{order.charities?.name ?? 'Order'}</h1>
          <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
        </div>
      </div>

      <Card className="mb-6 max-w-lg">
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-charcoal/60">Package</dt>
            <dd>{order.packages?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/60">Event date</dt>
            <dd>{order.event_date}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/60">Delivery address</dt>
            <dd className="text-right">{order.delivery_address}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/60">Delivery contact</dt>
            <dd>{order.delivery_contact_name || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/60">Delivery phone</dt>
            <dd>{order.delivery_phone || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/60">Special requests</dt>
            <dd className="text-right">{order.special_requests || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/60">Total price</dt>
            <dd>${Number(order.total_price_aud).toLocaleString('en-AU')}</dd>
          </div>
        </dl>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Update status</CardTitle>
        </CardHeader>
        <Select
          value={order.status}
          disabled={isSaving}
          onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
          options={STATUS_OPTIONS}
        />
      </Card>
    </AdminLayout>
  );
}
