'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { EventForm, type EventFormValues } from '@/components/forms/EventForm';
import { createOrder } from '@/lib/adminApi';

export default function NewOrderPage() {
  const router = useRouter();

  const handleSubmit = async (values: EventFormValues) => {
    const { data } = await createOrder({
      charity_id: values.charity_id,
      package_id: values.package_id,
      event_date: values.event_date,
      delivery_address: values.delivery_address,
      delivery_contact_name: values.delivery_contact_name || null,
      delivery_phone: values.delivery_phone || null,
      special_requests: values.special_requests || null,
      total_price_aud: values.total_price_aud,
    });
    router.push(`/admin/orders/${data.id}`);
  };

  return (
    <AdminLayout>
      <h1 className="mb-6">Add event</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <EventForm onSubmit={handleSubmit} />
      </Card>
    </AdminLayout>
  );
}
