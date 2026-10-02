'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { FundraisingEventForm, type toEventPayload } from '@/components/forms/FundraisingEventForm';
import { createEvent } from '@/lib/adminApi';

export default function NewEventPage() {
  const router = useRouter();

  const handleSubmit = async (payload: ReturnType<typeof toEventPayload>) => {
    const { data } = await createEvent(payload);
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
        <p className="mt-4 text-xs text-charcoal/70">Suppliers are added on the next screen, once the event exists.</p>
      </Card>
    </AdminLayout>
  );
}
