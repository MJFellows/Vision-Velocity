'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { BunningsStoreForm, type BunningsStoreFormValues } from '@/components/forms/BunningsStoreForm';
import { createBunningsStore } from '@/lib/adminApi';

export default function NewBunningsStorePage() {
  const router = useRouter();

  const handleSubmit = async (values: BunningsStoreFormValues) => {
    const { data } = await createBunningsStore({
      location: values.location,
      store_address: values.store_address || null,
      store_phone: values.store_phone || null,
      store_manager_name: values.store_manager_name || null,
      store_manager_email: values.store_manager_email || null,
      store_manager_phone: values.store_manager_phone || null,
      activities_officer_name: values.activities_officer_name || null,
      activities_officer_email: values.activities_officer_email || null,
      activities_officer_phone: values.activities_officer_phone || null,
      discovered_by: values.discovered_by || null,
      discovered_date: new Date().toISOString().slice(0, 10),
    });
    router.push(`/admin/bunnings/${data.id}`);
  };

  return (
    <AdminLayout>
      <h1 className="mb-6">Add Bunnings store</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Store details</CardTitle>
        </CardHeader>
        <BunningsStoreForm onSubmit={handleSubmit} submitLabel="Add store" />
      </Card>
    </AdminLayout>
  );
}
