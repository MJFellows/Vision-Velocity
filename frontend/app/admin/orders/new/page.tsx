'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { OrderForm, type toOrderPayload } from '@/components/forms/OrderForm';
import { api } from '@/lib/api';
import type { Order } from '@/lib/types';

export default function NewOrderPage() {
  const router = useRouter();
  const [notify, setNotify] = useState(true);

  const handleSubmit = async (payload: ReturnType<typeof toOrderPayload>) => {
    const { data } = await api.post<{ data: Order }>('/api/admin/orders', { ...payload, notify_charity: notify });
    router.push(`/admin/orders/${data.id}`);
  };

  return (
    <AdminLayout>
      <h1 className="mb-6">New order</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <label className="mb-4 flex items-start gap-2 text-sm text-charcoal">
          <input type="checkbox" className="mt-1" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          <span>
            Email the charity the order summary when the order is created. (When you later set the order to Confirmed, its invoice is issued
            and emailed automatically.)
          </span>
        </label>
        <OrderForm onSubmit={handleSubmit} submitLabel="Create order" />
      </Card>
    </AdminLayout>
  );
}
