'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { CharityForm, type CharityFormValues } from '@/components/forms/CharityForm';
import { InteractionForm, type InteractionFormValues } from '@/components/forms/InteractionForm';
import { getCharity, updateCharity, approveCharity, createInteraction, listOrders, type CharityDetail, type OrderWithRelations } from '@/lib/adminApi';

export default function CharityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [charity, setCharity] = useState<CharityDetail | null>(null);
  const [orders, setOrders] = useState<OrderWithRelations[] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  const loadCharity = useCallback(async () => {
    try {
      const { data } = await getCharity(id);
      setCharity(data);
    } catch {
      setError('Could not load this charity.');
    }
  }, [id]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await listOrders({ charity_id: id, pageSize: 50 });
      setOrders(res.data);
    } catch {
      // Non-fatal — the Events tab just shows its own "couldn't load" state.
      setOrders([]);
    }
  }, [id]);

  useEffect(() => {
    loadCharity();
    loadOrders();
  }, [loadCharity, loadOrders]);

  const handleEditSubmit = async (values: CharityFormValues) => {
    await updateCharity(id, {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      location: values.location || null,
      contact_name: values.contact_name || null,
      tax_id: values.tax_id || null,
    });
    setIsEditing(false);
    await loadCharity();
  };

  const handleApprove = async () => {
    setIsApproving(true);
    setApprovalMessage(null);
    try {
      const res = await approveCharity(id);
      setApprovalMessage(
        res.email.sent
          ? 'Charity approved and the approval email was sent.'
          : `Charity approved, but the approval email was not sent${res.email.error ? ` (${res.email.error})` : ''}. Please contact them directly.`
      );
      setConfirmingApproval(false);
      await loadCharity();
    } catch (err) {
      setApprovalMessage(err instanceof Error ? err.message : 'Could not approve this charity.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleLogInteraction = async (values: InteractionFormValues) => {
    await createInteraction({
      charity_id: id,
      interaction_type: values.interaction_type,
      direction: values.direction,
      subject: values.subject || null,
      details: values.details || null,
      next_action: values.next_action || null,
      next_action_date: values.next_action_date || null,
    });
    await loadCharity();
  };

  if (error) {
    return (
      <AdminLayout>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/admin/charities" className="mt-4 inline-block text-sm text-accent underline">
          &larr; Back to charities
        </Link>
      </AdminLayout>
    );
  }

  if (!charity) {
    return (
      <AdminLayout>
        <p className="text-sm text-charcoal/60">Loading…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link href="/admin/charities" className="mb-4 inline-block text-sm text-accent underline">
        &larr; Back to charities
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1">{charity.name}</h1>
          <Badge tone={toneForStatus(charity.subscription_status)}>{charity.subscription_status}</Badge>
          {charity.subscription_status === 'trial' && (
            <p className="mt-2 text-sm text-charcoal/70">Awaiting approval.</p>
          )}
        </div>
        <div className="flex gap-2">
          {charity.subscription_status === 'trial' && !confirmingApproval && (
            <Button onClick={() => setConfirmingApproval(true)}>Approve</Button>
          )}
          <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </div>

      {confirmingApproval && (
        <Card className="mb-6 max-w-lg">
          <p className="mb-4 text-sm">
            Approving sets this charity to active and emails {charity.email || 'the charity'} to confirm.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleApprove} isLoading={isApproving}>
              Confirm approval
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingApproval(false)} disabled={isApproving}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {approvalMessage && (
        <p role="status" className="mb-6 max-w-lg text-sm text-charcoal">
          {approvalMessage}
        </p>
      )}

      {isEditing ? (
        <Card className="mb-6 max-w-lg">
          <CardHeader>
            <CardTitle>Edit charity</CardTitle>
          </CardHeader>
          <CharityForm defaultValues={charity} onSubmit={handleEditSubmit} submitLabel="Save changes" />
        </Card>
      ) : (
        <Card className="mb-6 max-w-lg">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-charcoal/60">Contact</dt>
              <dd>{charity.contact_name || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">Email</dt>
              <dd>{charity.email || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">Phone</dt>
              <dd>{charity.phone || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">Location</dt>
              <dd>{charity.location || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">ABN / tax ID</dt>
              <dd>{charity.tax_id || '—'}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Tabs
        tabs={[
          {
            id: 'events',
            label: 'Events',
            content: (
              <div className="space-y-3">
                {orders === null ? (
                  <p className="text-sm text-charcoal/60">Loading…</p>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-charcoal/60">No events for this charity yet.</p>
                ) : (
                  orders.map((order) => (
                    <Link key={order.id} href={`/admin/orders/${order.id}`}>
                      <Card className="flex items-center justify-between hover:border-accent">
                        <div>
                          <p className="font-medium text-navy">{order.packages?.name ?? 'Package'}</p>
                          <p className="text-sm text-charcoal/60">{order.event_date}</p>
                        </div>
                        <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            ),
          },
          {
            id: 'notes',
            label: 'Notes',
            content: (
              <div className="space-y-6">
                <Card className="max-w-lg">
                  <CardHeader>
                    <CardTitle>Log an interaction</CardTitle>
                  </CardHeader>
                  <InteractionForm onSubmit={handleLogInteraction} />
                </Card>

                <div className="space-y-3">
                  {charity.recent_interactions.length === 0 ? (
                    <p className="text-sm text-charcoal/60">No interactions logged yet.</p>
                  ) : (
                    charity.recent_interactions.map((interaction) => (
                      <Card key={interaction.id}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium capitalize text-navy">
                            {interaction.interaction_type.replace('_', ' ')} — {interaction.direction}
                          </span>
                          <span className="text-xs text-charcoal/50">
                            {new Date(interaction.created_at).toLocaleDateString('en-AU')}
                          </span>
                        </div>
                        {interaction.subject && <p className="text-sm font-medium">{interaction.subject}</p>}
                        {interaction.details && <p className="text-sm text-charcoal/70">{interaction.details}</p>}
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </AdminLayout>
  );
}
