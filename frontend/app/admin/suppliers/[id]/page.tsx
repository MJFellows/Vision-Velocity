'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { OpeningHoursTable } from '@/components/OpeningHoursTable';
import { getSupplier } from '@/lib/adminApi';
import type { Supplier } from '@/lib/types';

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupplier(id)
      .then((res) => setSupplier(res.data))
      .catch(() => setError('Could not load this supplier.'));
  }, [id]);

  const back = (
    <Link href="/admin/suppliers" className="mb-4 inline-block text-sm text-accent underline">
      &larr; Back to suppliers
    </Link>
  );

  if (error) {
    return (
      <AdminLayout>
        <p className="text-sm text-red-600">{error}</p>
        {back}
      </AdminLayout>
    );
  }
  if (!supplier) {
    return (
      <AdminLayout>
        <p className="text-sm text-charcoal/60">Loading…</p>
      </AdminLayout>
    );
  }

  const mapsUrl =
    supplier.latitude != null && supplier.longitude != null
      ? `https://www.google.com/maps?q=${supplier.latitude},${supplier.longitude}`
      : null;

  return (
    <AdminLayout>
      {back}
      <div className="mb-6 flex items-start justify-between gap-3">
        <h1>{supplier.store_name}</h1>
        <Badge>{supplier.supplier_chain}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Supplier chain" value={supplier.supplier_chain} />
            <Row label="Store ID" value={supplier.source_store_id} />
            <Row label="Address" value={supplier.address} />
            <Row label="Suburb" value={supplier.suburb} />
            <Row label="State" value={supplier.state} />
            <Row label="Postcode" value={supplier.postcode} />
            <Row label="Phone" value={supplier.phone} />
            <Row
              label="Coordinates"
              value={
                mapsUrl ? (
                  <a className="text-navy underline" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    {supplier.latitude}, {supplier.longitude}
                  </a>
                ) : null
              }
            />
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opening hours</CardTitle>
          </CardHeader>
          <OpeningHoursTable hours={supplier.opening_hours} raw={supplier.opening_hours_raw} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Facilities</CardTitle>
          </CardHeader>
          {supplier.facilities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {supplier.facilities.map((f) => (
                <Badge key={f}>{f}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-charcoal/60">No facilities recorded for this store.</p>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-charcoal/60">{label}</dt>
      <dd className="text-right">{value || '—'}</dd>
    </div>
  );
}
