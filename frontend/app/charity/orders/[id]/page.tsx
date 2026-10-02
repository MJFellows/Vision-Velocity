'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CharityLayout } from '@/components/charity/CharityLayout';
import { charityApi, type CharityOrder } from '@/lib/charityApi';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import { RecordActions } from '@/components/RecordActions';
import { aud, longDate } from '@/lib/dates';
import { Button } from '@/components/ui/Button';
import { fetchPdf, openBlobForPrinting, saveBlob } from '@/lib/exporting';
import { ApiRequestError } from '@/lib/api';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-charcoal/70">{label}</dt>
      <dd className="text-right">{value || '—'}</dd>
    </div>
  );
}

function InvoiceBox({ orderId, invoice }: { orderId: string; invoice: NonNullable<CharityOrder['invoice']> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filename = `Invoice-${invoice.invoice_number}.pdf`;
  const run = async (kind: 'print' | 'download') => {
    setBusy(kind);
    setError(null);
    const win = kind === 'print' ? window.open('', '_blank') : null;
    try {
      const blob = await fetchPdf(`/api/charity/orders/${orderId}/invoice`);
      if (kind === 'download' || !openBlobForPrinting(blob, win)) saveBlob(blob, filename);
    } catch (err) {
      win?.close();
      setError(err instanceof ApiRequestError ? err.message : 'Could not get the invoice — try again.');
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card className="mb-6 max-w-2xl">
      <CardHeader>
        <CardTitle>Invoice {invoice.invoice_number}</CardTitle>
      </CardHeader>
      <p className="mb-3 text-sm text-charcoal/80">
        {aud(invoice.amount_aud)} · issued {longDate(invoice.issue_date)} ·{' '}
        {invoice.status === 'paid' ? <strong>paid — thank you</strong> : <>payment due {longDate(invoice.due_date)}</>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" isLoading={busy === 'print'} onClick={() => run('print')} data-track="Print invoice">
          Print
        </Button>
        <Button type="button" variant="outline" isLoading={busy === 'download'} onClick={() => run('download')} data-track="Download invoice">
          Download PDF
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-xs text-charcoal/70">Payment details are on the invoice. Vision Velocity is not registered for GST, so no GST is charged.</p>
    </Card>
  );
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<CharityOrder | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    charityApi
      .order(id)
      .then((r) => setOrder(r.data))
      .catch(() => setError(true));
  }, [id]);

  if (error) return <p className="text-sm text-red-600">Could not load this order.</p>;
  if (!order) return <p className="text-sm text-charcoal/70">Loading…</p>;

  return (
    <>
      <Link href="/charity/orders" className="mb-4 inline-block text-sm text-accent underline">
        &larr; My orders
      </Link>
      <h1 className="mb-1">Order for {longDate(order.event_date)}</h1>
      <div className="mb-6">
        <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
      </div>
      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <dl className="space-y-2 text-sm">
          <Row label="Reference" value={order.id.slice(0, 8).toUpperCase()} />
          <Row label="Package" value={order.packages?.name} />
          <Row label="Total price" value={aud(order.total_price_aud)} />
          <Row label="Delivery address" value={order.delivery_address} />
          <Row label="Delivery contact" value={order.delivery_contact_name} />
          <Row label="Delivery phone" value={order.delivery_phone} />
          <Row label="Special requests" value={order.special_requests} />
        </dl>
        <p className="mt-3 text-xs text-charcoal/70">This is an order summary. {order.invoice ? 'Your invoice is below.' : 'Your invoice is emailed when the order is confirmed.'}</p>
      </Card>
      {order.invoice && <InvoiceBox orderId={order.id} invoice={order.invoice} />}
      <RecordActions
        title="Order summary"
        documentPath={`/api/charity/orders/${order.id}/document`}
        emailPath={`/api/charity/orders/${order.id}/email`}
        filename={`Order-summary-${order.id.slice(0, 8).toUpperCase()}.pdf`}
      />
    </>
  );
}

export default function CharityOrderPage() {
  return (
    <CharityLayout>
      <OrderDetail />
    </CharityLayout>
  );
}
