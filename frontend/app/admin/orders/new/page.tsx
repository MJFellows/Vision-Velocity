'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { OrderForm, type toOrderPayload } from '@/components/forms/OrderForm';
import { createOrder } from '@/lib/adminApi';

export default function NewOrderPage() {
  const router = useRouter();

  const handleSubmit = async (payload: ReturnType<typeof toOrderPayload>) => {
    const { data } = await createOrder(payload);
    router.push(`/admin/orders/${data.id}`);
  };

  return (
    <AdminLayout>
      <h1 className="mb-6">New order</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <OrderForm onSubmit={handleSubmit} submitLabel="Create order" />
      </Card>
    </AdminLayout>
  );
}
