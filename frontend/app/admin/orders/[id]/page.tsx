'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OrderForm, type toOrderPayload } from '@/components/forms/OrderForm';
import { RecordActions } from '@/components/RecordActions';
import { InvoiceCard } from '@/components/InvoiceCard';
import { api, ApiRequestError } from '@/lib/api';
import { statusLabel } from '@/lib/labels';
import { getOrder, updateOrder } from '@/lib/adminApi';
import type { OrderStatus } from '@/lib/types';
import type { OrderWithRelations } from '@/lib/adminApi';

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderWithRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [invoiceReload, setInvoiceReload] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await getOrder(id);
      setOrder(data);
    } catch {
      setError('Could not load this order.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEditSubmit = async (payload: ReturnType<typeof toOrderPayload>) => {
    await updateOrder(id, payload);
    setIsEditing(false);
    setMessage('Order saved.');
    await load();
  };

  const saveStatus = async (status: OrderStatus, notifyCharity = true) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    setPendingConfirm(false);
    try {
      const res = await api.patch<{ autoEmail?: { status: string; detail: string; invoiceNumber?: string } }>(`/api/admin/orders/${id}`, {
        status,
        notify_charity: notifyCharity,
      });
      const a = res.autoEmail;
      if (a?.status === 'sent') setMessage(`Status changed to ${statusLabel(status)}. ${a.invoiceNumber ? `Invoice ${a.invoiceNumber} and the order summary were` : 'The order summary was'} emailed to the charity.`);
      else if (a?.status === 'failed') setError(`Status changed, but the email to the charity failed: ${a.detail}`);
      else if (a?.status === 'skipped') setMessage(`Status changed to ${statusLabel(status)}. No email sent: ${a.detail}.`);
      else setMessage(`Status changed to ${statusLabel(status)}.`);
      await load();
      setInvoiceReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not update status — try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = (status: OrderStatus) => {
    if (status === 'confirmed' && order?.status !== 'confirmed') {
      setPendingConfirm(true);
      return;
    }
    saveStatus(status);
  };

  if (error && !order) {
    return (
      <AdminLayout>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/admin/orders" className="mt-4 inline-block text-sm text-accent underline">
          &larr; Back to orders
        </Link>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <p className="text-sm text-charcoal/70">Loading…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link href="/admin/orders" className="mb-4 inline-block text-sm text-accent underline">
        &larr; Back to orders
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1">{order.charities?.name ?? 'Order'}</h1>
          <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            onClick={() => {
              setMessage(null);
              setIsEditing(true);
            }}
          >
            Edit
          </Button>
        )}
      </div>

      {message && <p className="mb-4 text-sm text-green-700">{message}</p>}
      {error && order && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isEditing ? (
        <Card className="mb-6 max-w-lg">
          <CardHeader>
            <CardTitle>Edit order</CardTitle>
          </CardHeader>
          <OrderForm order={order} onSubmit={handleEditSubmit} onCancel={() => setIsEditing(false)} submitLabel="Save changes" />
        </Card>
      ) : (
      <Card className="mb-6 max-w-lg">
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Package</dt>
            <dd>{order.packages?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Event date</dt>
            <dd>{new Date(`${order.event_date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Delivery address</dt>
            <dd className="text-right">{order.delivery_address}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Delivery contact</dt>
            <dd>{order.delivery_contact_name || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Delivery phone</dt>
            <dd>{order.delivery_phone || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Special requests</dt>
            <dd className="text-right">{order.special_requests || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Total price</dt>
            <dd>{Number(order.total_price_aud).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}</dd>
          </div>
        </dl>
      </Card>
      )}

      {!isEditing && (
        <RecordActions
          title="Order summary"
          documentPath={`/api/admin/orders/${order.id}/document`}
          emailPath={`/api/admin/orders/${order.id}/email`}
          filename={`Order-summary-${order.id.slice(0, 8).toUpperCase()}.pdf`}
          historyFor={{ type: 'order', id: order.id }}
          historyDocument="order_summary"
        />
      )}

      {!isEditing && <InvoiceCard orderId={order.id} reloadKey={invoiceReload} />}

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Update status</CardTitle>
        </CardHeader>
        <Select
          value={order.status}
          disabled={isSaving}
          onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
          options={STATUS_OPTIONS}
        />
        {pendingConfirm && (
          <div className="mt-3 rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="mb-2">Confirming the order issues its invoice and emails the invoice and order summary to the charity.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" isLoading={isSaving} onClick={() => saveStatus('confirmed', true)}>
                Confirm and email the charity
              </Button>
              <Button type="button" variant="outline" disabled={isSaving} onClick={() => saveStatus('confirmed', false)}>
                Confirm without emailing
              </Button>
              <Button type="button" variant="outline" disabled={isSaving} onClick={() => setPendingConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
