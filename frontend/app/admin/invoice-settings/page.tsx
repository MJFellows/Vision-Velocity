'use client';

/**
 * Invoice settings: the business details printed on every invoice. Vision
 * Velocity is not registered for GST, so invoices are titled "Invoice" (not
 * "Tax invoice") and say that no GST is charged.
 */

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, ApiRequestError } from '@/lib/api';

interface Settings {
  business_name: string;
  abn: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  payment_terms_days: number;
  payment_instructions: string | null;
  footer_note: string | null;
  gst_registered: boolean;
  updated_at: string;
  updated_by_email: string | null;
}

export default function InvoiceSettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get<{ data: Settings; problem: string | null }>('/api/admin/invoice-settings')
      .then((r) => {
        setS(r.data);
        setProblem(r.problem);
      })
      .catch(() => setError('Could not load the invoice settings.'));
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => (prev ? { ...prev, [k]: v } : prev));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    setFieldErrors({});
    try {
      const r = await api.put<{ data: Settings; problem: string | null }>('/api/admin/invoice-settings', {
        business_name: s.business_name,
        abn: s.abn ?? '',
        address: s.address,
        email: s.email ?? '',
        phone: s.phone,
        payment_terms_days: Number(s.payment_terms_days),
        payment_instructions: s.payment_instructions,
        footer_note: s.footer_note,
      });
      setS(r.data);
      setProblem(r.problem);
      setMessage('Saved. New invoices will use these details; invoices already issued keep the details they were issued with.');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        if (err.details && typeof err.details === 'object') setFieldErrors(err.details as Record<string, string>);
      } else setError('Could not save — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Link href="/admin/invoices" className="mb-4 inline-block text-sm text-accent underline">
        &larr; Invoices
      </Link>
      <h1 className="mb-1">Invoice settings</h1>
      <p className="mb-6 max-w-2xl text-sm text-charcoal/70">
        These details are printed on every invoice. Vision Velocity is not registered for GST, so invoices are titled &quot;Invoice&quot; (not
        &quot;Tax invoice&quot;) and state that no GST has been charged. The ABN and payment instructions must be filled in before any invoice
        can be issued.
      </p>
      {problem && <p className="mb-4 max-w-2xl rounded-card bg-amber-50 p-3 text-sm text-amber-900">{problem}</p>}
      {error && !s && <p className="text-sm text-red-600">{error}</p>}
      {s && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Business details</CardTitle>
          </CardHeader>
          <form onSubmit={save} className="space-y-4" data-form="Invoice settings">
            <Input id="business_name" label="Business name" value={s.business_name} onChange={(e) => set('business_name', e.target.value)} error={fieldErrors.business_name} required />
            <Input
              id="abn"
              label="ABN (11 digits)"
              inputMode="numeric"
              value={s.abn ?? ''}
              onChange={(e) => set('abn', e.target.value)}
              error={fieldErrors.abn}
              helperText="You can check it on the Australian Business Register (abr.business.gov.au)."
            />
            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-charcoal">
                Business address
              </label>
              <textarea id="address" rows={2} value={s.address ?? ''} onChange={(e) => set('address', e.target.value)} className="w-full rounded-card border border-grey px-3 py-2 text-sm focus-ring" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="email" type="email" label="Email for invoice questions" value={s.email ?? ''} onChange={(e) => set('email', e.target.value)} error={fieldErrors.email} />
              <Input id="phone" label="Phone (optional)" value={s.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <Input
              id="payment_terms_days"
              type="number"
              min={0}
              max={120}
              label="Payment due (days after the invoice date)"
              value={String(s.payment_terms_days)}
              onChange={(e) => set('payment_terms_days', Number(e.target.value))}
              error={fieldErrors.payment_terms_days}
            />
            <div>
              <label htmlFor="payment_instructions" className="mb-1 block text-sm font-medium text-charcoal">
                How to pay (printed on the invoice)
              </label>
              <textarea
                id="payment_instructions"
                rows={4}
                value={s.payment_instructions ?? ''}
                onChange={(e) => set('payment_instructions', e.target.value)}
                placeholder="For example: account name, BSB and account number for bank transfer"
                className="w-full rounded-card border border-grey px-3 py-2 text-sm focus-ring"
              />
              {fieldErrors.payment_instructions && <p className="mt-1 text-xs text-red-600">{fieldErrors.payment_instructions}</p>}
            </div>
            <div>
              <label htmlFor="footer_note" className="mb-1 block text-sm font-medium text-charcoal">
                Note at the bottom of invoices (optional)
              </label>
              <textarea id="footer_note" rows={2} value={s.footer_note ?? ''} onChange={(e) => set('footer_note', e.target.value)} className="w-full rounded-card border border-grey px-3 py-2 text-sm focus-ring" />
            </div>
            <p className="text-xs text-charcoal/70">
              GST registered: {s.gst_registered ? 'yes' : 'no'}. If Vision Velocity registers for GST, invoices will need to become tax invoices — ask for the
              invoice layout to be updated first.
            </p>
            {message && <p className="text-sm text-green-700">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" isLoading={saving}>
              Save settings
            </Button>
            {s.updated_by_email && (
              <p className="text-xs text-charcoal/70">
                Last changed {new Date(s.updated_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} by{' '}
                {s.updated_by_email}
              </p>
            )}
          </form>
        </Card>
      )}
    </AdminLayout>
  );
}
