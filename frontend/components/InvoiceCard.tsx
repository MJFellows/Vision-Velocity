'use client';

/**
 * Invoice panel on an admin order page: the order's invoice (issue one, print,
 * download, email, mark paid or void), earlier void invoices, and the
 * automatic emails sent for the order.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiRequestError } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RecordActions } from '@/components/RecordActions';

interface InvoiceRow {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  amount_aud: number;
  status: 'issued' | 'paid' | 'void';
  paid_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  emailed_at: string | null;
}
interface AutoEmail {
  id: string;
  created_at: string;
  kind: 'order_received' | 'order_confirmed';
  recipients: string;
  status: 'sent' | 'failed' | 'skipped';
  detail: string | null;
}
interface InvoiceInfo {
  live: InvoiceRow | null;
  all: InvoiceRow[];
  automatedEmails: AutoEmail[];
  settingsProblem: string | null;
}

const money = (n: number) => Number(n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
const date = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
const KIND: Record<AutoEmail['kind'], string> = { order_received: 'Order received email', order_confirmed: 'Order confirmed email' };

export function InvoiceCard({ orderId, reloadKey = 0 }: { orderId: string; reloadKey?: number }) {
  const [info, setInfo] = useState<InvoiceInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: InvoiceInfo }>(`/api/admin/orders/${orderId}/invoice`);
      setInfo(res.data);
    } catch {
      setError('Could not load the invoice details.');
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong — try again.');
    } finally {
      setBusy(null);
    }
  };

  if (!info) {
    return (
      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <p className="text-sm text-charcoal/70">{error ?? 'Loading…'}</p>
      </Card>
    );
  }

  const live = info.live;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = live && live.status === 'issued' && live.due_date < today;
  const voided = info.all.filter((i) => i.status === 'void');

  return (
    <>
      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        {info.settingsProblem && !live && (
          <p className="mb-3 rounded-card bg-amber-50 p-3 text-sm text-amber-900">
            {info.settingsProblem}{' '}
            <Link href="/admin/invoice-settings" className="underline">
              Open Invoice settings
            </Link>
          </p>
        )}
        {live ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-navy">{live.invoice_number}</span>
              <Badge tone={live.status === 'paid' ? 'success' : overdue ? 'danger' : 'warning'}>
                {live.status === 'paid' ? 'Paid' : overdue ? 'Overdue' : 'Awaiting payment'}
              </Badge>
            </div>
            <p className="text-charcoal/80">
              {money(live.amount_aud)} · issued {date(live.issue_date)} · due {date(live.due_date)}
              {live.paid_at ? ` · paid ${date(live.paid_at)}` : ''}
              {live.emailed_at ? ' · emailed to the charity' : ' · not yet emailed'}
            </p>
            <div className="flex flex-wrap gap-2">
              {live.status === 'issued' ? (
                <Button type="button" isLoading={busy === 'paid'} onClick={() => act('paid', () => api.patch(`/api/admin/invoices/${live.id}`, { status: 'paid' }))}>
                  Mark as paid
                </Button>
              ) : (
                <Button type="button" variant="outline" isLoading={busy === 'unpaid'} onClick={() => act('unpaid', () => api.patch(`/api/admin/invoices/${live.id}`, { status: 'issued' }))}>
                  Mark as not paid
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setVoiding((v) => !v)}>
                Void invoice
              </Button>
            </div>
            {voiding && (
              <div className="rounded-card border border-grey p-3">
                <label htmlFor="void-reason" className="mb-1 block text-sm font-medium text-charcoal">
                  Why is this invoice being cancelled? (shown on the voided invoice)
                </label>
                <input id="void-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mb-2 w-full rounded-card border border-grey px-3 py-2 text-sm focus-ring" />
                <p className="mb-2 text-xs text-charcoal/70">Void it to correct a mistake, then press Issue invoice to create a corrected one with a new number.</p>
                <Button
                  type="button"
                  variant="outline"
                  isLoading={busy === 'void'}
                  onClick={() =>
                    act('void', async () => {
                      await api.patch(`/api/admin/invoices/${live.id}`, { status: 'void', void_reason: reason.trim() });
                      setVoiding(false);
                      setReason('');
                    })
                  }
                >
                  Confirm void
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm">
            <p className="mb-3 text-charcoal/80">No invoice yet. One is issued and emailed to the charity automatically when the order is set to Confirmed, or you can issue it now.</p>
            <Button type="button" disabled={!!info.settingsProblem} isLoading={busy === 'issue'} onClick={() => act('issue', () => api.post(`/api/admin/orders/${orderId}/invoice`))}>
              Issue invoice
            </Button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {voided.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Voided invoices</h3>
            <ul className="space-y-1 text-xs text-charcoal/70">
              {voided.map((v) => (
                <li key={v.id}>
                  {v.invoice_number} — {money(v.amount_aud)}, voided {v.voided_at ? date(v.voided_at) : ''}
                  {v.void_reason ? `: ${v.void_reason}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {info.automatedEmails.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Automatic emails</h3>
            <ul className="space-y-1 text-xs text-charcoal/70">
              {info.automatedEmails.map((a) => (
                <li key={a.id}>
                  {new Date(a.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} — {KIND[a.kind] ?? a.kind}:{' '}
                  {a.status === 'sent' ? 'sent' : a.status === 'skipped' ? 'not sent' : 'failed'}
                  {a.detail ? ` (${a.detail})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {live && (
        <RecordActions
          title="Invoice"
          documentPath={`/api/admin/invoices/${live.id}/pdf`}
          emailPath={`/api/admin/invoices/${live.id}/email`}
          filename={`Invoice-${live.invoice_number}.pdf`}
          historyFor={{ type: 'order', id: orderId }}
          historyDocument="invoice"
        />
      )}
    </>
  );
}
