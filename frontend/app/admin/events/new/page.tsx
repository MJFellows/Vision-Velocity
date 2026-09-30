'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { FundraisingEventForm, type FundraisingEventFormValues } from '@/components/forms/FundraisingEventForm';
import { createEvent } from '@/lib/adminApi';

export default function NewEventPage() {
  const router = useRouter();

  const handleSubmit = async (values: FundraisingEventFormValues) => {
    const { data } = await createEvent({
      event_date: values.event_date,
      bunnings_store_id: values.bunnings_store_id,
      charity_id: values.charity_id,
      status: values.status,
      notes: values.notes || null,
    });
    router.push(`/admin/events/${data.id}`);
  };

  return (
    <AdminLayout>
      <h1 className="mb-6">Add event</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <FundraisingEventForm onSubmit={handleSubmit} submitLabel="Add event" />
        <p className="mt-4 text-xs text-charcoal/60">Suppliers are added on the next screen, once the event exists.</p>
      </Card>
    </AdminLayout>
  );
}
