'use client';

/** Invoices: every invoice issued, with filters, totals and a spreadsheet download. */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/exporting';

interface Row {
  id: string;
  invoice_number: string;
  order_id: string;
  issue_date: string;
  due_date: string;
  amount_aud: number;
  status: 'issued' | 'paid' | 'void';
  paid_at: string | null;
  emailed_at: string | null;
  buyer: { name?: string | null } | null;
}

const money = (n: number) => Number(n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
const date = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

const FILTERS = [
  { value: '', label: 'All invoices' },
  { value: 'issued', label: 'Awaiting payment' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

export default function InvoicesPage() {
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [today, setToday] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: Row[]; today: string }>('/api/admin/invoices', filter ? { status: filter } : undefined)
      .then((r) => {
        if (cancelled) return;
        setRows(r.data);
        setToday(r.today);
      })
      .catch(() => !cancelled && setError('Could not load invoices.'));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const totals = useMemo(() => {
    const live = (rows ?? []).filter((r) => r.status !== 'void');
    return {
      outstanding: live.filter((r) => r.status === 'issued').reduce((a, r) => a + Number(r.amount_aud), 0),
      paid: live.filter((r) => r.status === 'paid').reduce((a, r) => a + Number(r.amount_aud), 0),
    };
  }, [rows]);

  const label = (r: Row) => (r.status === 'paid' ? 'Paid' : r.status === 'void' ? 'Void' : r.due_date < today ? 'Overdue' : 'Awaiting payment');
  const tone = (r: Row) => (r.status === 'paid' ? 'success' : r.status === 'void' ? 'neutral' : r.due_date < today ? 'danger' : 'warning');

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1">Invoices</h1>
          <p className="text-sm text-charcoal/70">Issued automatically when an order is confirmed, or from the order page.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/invoice-settings">
            <Button variant="outline">Invoice settings</Button>
          </Link>
          <Button
            variant="outline"
            disabled={!rows || rows.length === 0}
            onClick={() =>
              downloadCsv(
                `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
                ['Invoice', 'Charity', 'Issued', 'Due', 'Amount (AUD)', 'Status', 'Paid on', 'Emailed'],
                (rows ?? []).map((r) => [r.invoice_number, r.buyer?.name ?? '', r.issue_date, r.due_date, Number(r.amount_aud).toFixed(2), label(r), r.paid_at?.slice(0, 10) ?? '', r.emailed_at ? 'Yes' : 'No'])
              )
            }
          >
            Download spreadsheet
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-56">
          <Select label="Show" value={filter} onChange={(e) => setFilter(e.target.value)} options={FILTERS} />
        </div>
        {rows && (
          <p className="text-sm text-charcoal/70">
            Awaiting payment: <strong>{money(totals.outstanding)}</strong> · Paid: <strong>{money(totals.paid)}</strong>
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!rows && !error && <p className="text-sm text-charcoal/70">Loading…</p>}
      {rows && rows.length === 0 && (
        <Card>
          <p className="text-sm text-charcoal/70">
            No invoices {filter ? 'match this filter' : 'yet'}. An invoice is created when an order is set to Confirmed (once the{' '}
            <Link href="/admin/invoice-settings" className="text-accent underline">
              invoice settings
            </Link>{' '}
            are complete).
          </p>
        </Card>
      )}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-grey bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Invoices</caption>
            <thead className="bg-grey/40 text-xs uppercase text-charcoal/70">
              <tr>
                <th scope="col" className="px-3 py-2">Invoice</th>
                <th scope="col" className="px-3 py-2">Charity</th>
                <th scope="col" className="px-3 py-2">Issued</th>
                <th scope="col" className="px-3 py-2">Due</th>
                <th scope="col" className="px-3 py-2 text-right">Amount</th>
                <th scope="col" className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/orders/${r.order_id}`} className="font-medium text-accent underline">
                      {r.invoice_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.buyer?.name ?? '—'}</td>
                  <td className="px-3 py-2">{date(r.issue_date)}</td>
                  <td className="px-3 py-2">{date(r.due_date)}</td>
                  <td className="px-3 py-2 text-right">{money(r.amount_aud)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={tone(r)}>{label(r)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
