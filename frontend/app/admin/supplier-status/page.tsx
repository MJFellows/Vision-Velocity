'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SupplierStatusCard } from '@/components/SupplierStatusCard';
import { SupplierContactForm, type SupplierContactFormValues } from '@/components/forms/SupplierContactForm';
import { getSupplierContact, createSupplierContact, updateSupplierContact, listSupplierChains } from '@/lib/adminApi';
import type { SupplierChain, SupplierContact } from '@/lib/types';

export default function AdminSupplierStatusPage() {
  const [chains, setChains] = useState<SupplierChain[]>([]);
  const [chain, setChain] = useState('Woolworths');
  const [contact, setContact] = useState<SupplierContact | null | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSupplierChains()
      .then((res) => setChains(res.data))
      .catch(() => setChains([{ name: 'Woolworths', display_order: 1 }]));
  }, []);

  const load = useCallback(async () => {
    setContact(undefined);
    setError(null);
    try {
      const { data } = await getSupplierContact(chain);
      setContact(data);
    } catch {
      setError(`Could not load ${chain} negotiation status.`);
    }
  }, [chain]);

  useEffect(() => {
    load();
  }, [load]);

  const toApiValues = (values: SupplierContactFormValues) => ({
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

  const handleCreate = async (values: SupplierContactFormValues) => {
    await createSupplierContact({ ...toApiValues(values), supplier_chain: chain });
    await load();
  };

  const handleUpdate = async (values: SupplierContactFormValues) => {
    await updateSupplierContact(chain, toApiValues(values));
    setIsEditing(false);
    await load();
  };

  return (
    <AdminLayout>
      <h1 className="mb-6">Supplier status</h1>

      <div className="mb-6 max-w-xs">
        <Select
          label="Supplier chain"
          name="supplier_chain"
          value={chain}
          onChange={(e) => {
            setIsEditing(false);
            setChain(e.target.value);
          }}
          options={(chains.length ? chains : [{ name: chain, display_order: 0 }]).map((c) => ({ value: c.name, label: c.name }))}
        />
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {contact === undefined && !error && <p className="text-sm text-charcoal/60">Loading…</p>}

      {contact === null && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>No {chain} negotiation contact yet</CardTitle>
          </CardHeader>
          <p className="mb-4 text-sm text-charcoal/70">
            Add Natalie&apos;s {chain} contact to start tracking the negotiation.
          </p>
          <SupplierContactForm onSubmit={handleCreate} submitLabel="Add contact" />
        </Card>
      )}

      {contact && !isEditing && (
        <>
          <SupplierStatusCard contact={contact} />
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </>
      )}

      {contact && isEditing && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Update {chain} negotiation status</CardTitle>
          </CardHeader>
          <SupplierContactForm defaultValues={contact} onSubmit={handleUpdate} submitLabel="Save changes" />
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </Card>
      )}
    </AdminLayout>
  );
}
