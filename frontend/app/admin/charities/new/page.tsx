'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CharityForm, type CharityFormValues } from '@/components/forms/CharityForm';
import { createCharity } from '@/lib/adminApi';

export default function NewCharityPage() {
  const router = useRouter();

  const handleSubmit = async (values: CharityFormValues) => {
    const { data } = await createCharity({
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      location: values.location || null,
      postcode: values.postcode || null,
      contact_name: values.contact_name || null,
      tax_id: values.tax_id || null,
    });
    router.push(`/admin/charities/${data.id}`);
  };

  return (
    <AdminLayout>
      <h1 className="mb-6">Add charity</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Charity details</CardTitle>
        </CardHeader>
        <CharityForm onSubmit={handleSubmit} submitLabel="Add charity" />
      </Card>
    </AdminLayout>
  );
}
