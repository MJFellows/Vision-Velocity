'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WoolworthsStatusCard } from '@/components/WoolworthsStatusCard';
import { WoolworthsForm, type WoolworthsFormValues } from '@/components/forms/WoolworthsForm';
import { getWoolworthsContact, createWoolworthsContact, updateWoolworthsContact } from '@/lib/adminApi';
import type { WoolworthsContact } from '@/lib/types';

export default function AdminWoolworthsPage() {
  const [contact, setContact] = useState<WoolworthsContact | null | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getWoolworthsContact();
      setContact(data);
    } catch {
      setError('Could not load Woolworths negotiation status.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toApiValues = (values: WoolworthsFormValues) => ({
    contact_person_name: values.contact_person_name,
    contact_email: values.contact_email || null,
    contact_phone: values.contact_phone || null,
    contact_role: values.contact_role || null,
    status: values.status,
    last_contact_date: values.last_contact_date || null,
    next_contact_date: values.next_contact_date || null,
    discussion_summary: values.discussion_summary || null,
    delivery_logistics_status: values.delivery_logistics_status || null,
    supply_pricing_status: values.supply_pricing_status || null,
    commercial_agreement_status: values.commercial_agreement_status || null,
    internal_notes: values.internal_notes || null,
  });

  const handleCreate = async (values: WoolworthsFormValues) => {
    await createWoolworthsContact(toApiValues(values));
    await load();
  };

  const handleUpdate = async (values: WoolworthsFormValues) => {
    await updateWoolworthsContact(toApiValues(values));
    setIsEditing(false);
    await load();
  };

  return (
    <AdminLayout>
      <h1 className="mb-6">Woolworths status</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {contact === undefined && <p className="text-sm text-charcoal/60">Loading…</p>}

      {contact === null && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>No negotiation contact yet</CardTitle>
          </CardHeader>
          <p className="mb-4 text-sm text-charcoal/70">
            Add Natalie&apos;s Woolworths contact to start tracking the negotiation.
          </p>
          <WoolworthsForm onSubmit={handleCreate} submitLabel="Add contact" />
        </Card>
      )}

      {contact && !isEditing && (
        <>
          <WoolworthsStatusCard contact={contact} />
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </>
      )}

      {contact && isEditing && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Update negotiation status</CardTitle>
          </CardHeader>
          <WoolworthsForm defaultValues={contact} onSubmit={handleUpdate} submitLabel="Save changes" />
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </Card>
      )}
    </AdminLayout>
  );
}
