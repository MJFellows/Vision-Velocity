'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import type { FundraisingEvent } from '@/lib/types';
import { CharityForm, type CharityFormValues } from '@/components/forms/CharityForm';
import { InteractionForm, type InteractionFormValues } from '@/components/forms/InteractionForm';
import { SamePostcodePanel, type PanelSection } from '@/components/SamePostcodePanel';
import { getCharity, getCharitySamePostcode, updateCharity, approveCharity, createInteraction, listOrders, listEvents, type CharityDetail, type OrderWithRelations, type NearbyRadiusKm } from '@/lib/adminApi';

export default function CharityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [charity, setCharity] = useState<CharityDetail | null>(null);
  const [orders, setOrders] = useState<OrderWithRelations[] | null>(null);
  const [events, setEvents] = useState<FundraisingEvent[] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelPostcode, setPanelPostcode] = useState<string | null>(null);
  const [panelRadius, setPanelRadius] = useState<NearbyRadiusKm>(0);
  const [panelOrigin, setPanelOrigin] = useState<boolean | null>(null);
  const [panelSections, setPanelSections] = useState<PanelSection[]>([]);

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

  const loadEvents = useCallback(async () => {
    try {
      const res = await listEvents({ charity_id: id, pageSize: 100 });
      setEvents(res.data);
    } catch {
      setEvents([]);
    }
  }, [id]);

  useEffect(() => {
    loadCharity();
    loadOrders();
    loadEvents();
  }, [loadCharity, loadOrders, loadEvents]);

  const handleEditSubmit = async (values: CharityFormValues) => {
    await updateCharity(id, {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      location: values.location || null,
      postcode: values.postcode || null,
      contact_name: values.contact_name || null,
      tax_id: values.tax_id || null,
    });
    setIsEditing(false);
    await loadCharity();
  };

  const openSamePostcode = async (radius: NearbyRadiusKm = 0) => {
    setPanelOpen(true);
    setPanelRadius(radius);
    setPanelLoading(true);
    setPanelError(null);
    const distanceText = (km: number | null | undefined) => (km != null ? ` · ${km} km` : '');
    try {
      const res = await getCharitySamePostcode(id, radius);
      setPanelPostcode(res.postcode);
      setPanelOrigin(res.origin_available);
      setPanelSections([
        {
          title: 'Suppliers',
          emptyText: radius ? 'No supplier stores in this area.' : 'No supplier stores in this postcode.',
          items: res.data.suppliers.map((s) => ({
            id: s.id,
            href: `/admin/suppliers/${s.id}`,
            primary: s.store_name,
            secondary: `${[s.address, s.suburb, s.state, s.postcode].filter(Boolean).join(', ')}${distanceText(s.distance_km)}`,
            badge: s.supplier_chain,
          })),
        },
        {
          title: 'Bunnings stores',
          emptyText: radius ? 'No Bunnings stores in this area.' : 'No Bunnings stores in this postcode.',
          items: res.data.bunnings_stores.map((b) => ({
            id: b.id,
            href: `/admin/bunnings/${b.id}`,
            primary: b.location,
            secondary: `${[b.store_address, b.suburb, b.state, b.postcode].filter(Boolean).join(', ')}${distanceText(b.distance_km)}`,
          })),
        },
      ]);
    } catch {
      setPanelError('Could not load records for this postcode — try again.');
    } finally {
      setPanelLoading(false);
    }
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
          <Button variant="outline" onClick={() => openSamePostcode(0)}>
            Suppliers &amp; Bunnings in same postcode
          </Button>
          <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </div>

      {panelOpen && (
        <SamePostcodePanel
          title="Same postcode"
          postcode={panelPostcode}
          sections={panelSections}
          isLoading={panelLoading}
          error={panelError}
          noPostcodeMessage="This charity has no postcode yet. Edit the charity and add one to find suppliers and Bunnings stores nearby."
          radiusKm={panelRadius}
          onRadiusChange={(r) => openSamePostcode(r)}
          originAvailable={panelOrigin}
          onClose={() => setPanelOpen(false)}
        />
      )}

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
              <dt className="text-charcoal/60">Postcode</dt>
              <dd>{charity.postcode || '—'}</dd>
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
                <Link href="/admin/events/new" className="inline-block text-sm text-accent underline">
                  Add an event
                </Link>
                {events === null ? (
                  <p className="text-sm text-charcoal/60">Loading…</p>
                ) : events.length === 0 ? (
                  <p className="text-sm text-charcoal/60">No events for this charity yet.</p>
                ) : (
                  events.map((ev) => (
                    <Link key={ev.id} href={`/admin/events/${ev.id}`}>
                      <Card className="flex items-center justify-between hover:border-accent">
                        <div>
                          <p className="font-medium text-navy">
                            {new Date(`${ev.event_date}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-sm text-charcoal/60">{ev.bunnings_stores?.location ?? 'Bunnings store'}</p>
                          <p className="text-xs text-charcoal/60">
                            Suppliers: {ev.event_suppliers.filter((x) => x.status === 'confirmed').length} confirmed ·{' '}
                            {ev.event_suppliers.filter((x) => x.status === 'possible').length} possible ·{' '}
                            {ev.event_suppliers.filter((x) => x.status === 'declined').length} declined
                          </p>
                        </div>
                        <Badge tone={toneForStatus(ev.status)}>{ev.status}</Badge>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            ),
          },
          {
            id: 'orders',
            label: 'Orders',
            content: (
              <div className="space-y-3">
                {orders === null ? (
                  <p className="text-sm text-charcoal/60">Loading…</p>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-charcoal/60">No orders for this charity yet.</p>
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
