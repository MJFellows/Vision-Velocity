'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CharityLayout } from '@/components/charity/CharityLayout';
import { charityApi, type CharityOrder } from '@/lib/charityApi';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { aud, shortDate } from '@/lib/dates';

function Orders() {
  const [orders, setOrders] = useState<CharityOrder[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    charityApi
      .orders()
      .then((r) => setOrders(r.data))
      .catch(() => setError(true));
  }, []);
  return (
    <>
      <h1 className="mb-6">My orders</h1>
      {error && <p className="text-sm text-red-600">Could not load your orders — please refresh.</p>}
      {orders === null && !error && <p className="text-sm text-charcoal/70">Loading…</p>}
      {orders && orders.length === 0 && <p className="text-sm text-charcoal/70">No orders yet. Vision Velocity records an order once your event and package are agreed.</p>}
      <div className="space-y-2">
        {orders?.map((o) => (
          <Link key={o.id} href={`/charity/orders/${o.id}`} className="flex items-center justify-between gap-3 rounded-card border border-grey bg-white p-4 hover:border-accent">
            <div>
              <p className="font-medium text-navy">{shortDate(o.event_date)}</p>
              <p className="text-sm text-charcoal/70">
                {o.packages?.name ?? 'Package'} · {aud(o.total_price_aud)}
              </p>
            </div>
            <Badge tone={toneForStatus(o.status)}>{o.status}</Badge>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function CharityOrdersPage() {
  return (
    <CharityLayout>
      <Orders />
    </CharityLayout>
  );
}
