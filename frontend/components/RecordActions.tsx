'use client';

/**
 * "Print, download or email" panel for an order summary or event run sheet,
 * used in both the admin and charity areas. Admins also see the list of
 * emails already sent for the record.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiRequestError } from '@/lib/api';
import { fetchPdf, openBlobForPrinting, saveBlob } from '@/lib/exporting';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface SentEmail {
  id: string;
  created_at: string;
  recipient_email: string;
  recipient_name: string | null;
  sent_by_email: string | null;
  sent_by_type: string;
  status: string;
}

export function RecordActions({
  title,
  documentPath,
  emailPath,
  filename,
  allowPrices = false,
  historyFor,
  extra,
}: {
  title: string;
  /** API path returning the PDF (prices added as ?include_prices=true when allowed and ticked). */
  documentPath: string;
  emailPath: string;
  filename: string;
  allowPrices?: boolean;
  /** Admin only: shows emails already sent for this record. */
  historyFor?: { type: 'order' | 'event'; id: string };
  extra?: React.ReactNode;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [includePrices, setIncludePrices] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [to, setTo] = useState('');
  const [toName, setToName] = useState('');
  const [note, setNote] = useState('');
  const [ccSelf, setCcSelf] = useState(true);
  const [history, setHistory] = useState<SentEmail[]>([]);

  const path = allowPrices && includePrices ? `${documentPath}?include_prices=true` : documentPath;

  const loadHistory = useCallback(async () => {
    if (!historyFor) return;
    try {
      const res = await api.get<{ data: SentEmail[] }>('/api/admin/record-emails', { record_type: historyFor.type, record_id: historyFor.id });
      setHistory(res.data);
    } catch {
      // History is optional; leave it empty if it cannot be loaded.
    }
  }, [historyFor]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const run = async (kind: 'print' | 'download') => {
    setError(null);
    setMessage(null);
    setBusy(kind);
    // Open the tab straight away (inside the click) so the browser does not block it.
    const win = kind === 'print' ? window.open('', '_blank') : null;
    try {
      const blob = await fetchPdf(path);
      if (kind === 'download') saveBlob(blob, filename);
      else if (!openBlobForPrinting(blob, win)) {
        saveBlob(blob, filename);
        setMessage('Your browser blocked the new tab, so the PDF was downloaded instead — open it to print.');
      }
    } catch (err) {
      win?.close();
      setError(err instanceof ApiRequestError ? err.message : 'Could not create the document — try again.');
    } finally {
      setBusy(null);
    }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy('email');
    try {
      await api.post(emailPath, {
        to: to.trim(),
        to_name: toName.trim() || null,
        note: note.trim() || null,
        cc_self: ccSelf,
        include_prices: allowPrices ? includePrices : undefined,
      });
      setMessage(`Sent to ${to.trim()}.`);
      setShowEmail(false);
      setTo('');
      setToName('');
      setNote('');
      await loadHistory();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const details = err.details && typeof err.details === 'object' ? Object.values(err.details as Record<string, string>).join(' ') : '';
        setError(details ? `${err.message}: ${details}` : err.message);
      } else setError('Could not send — try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="mb-6 max-w-2xl">
      <CardHeader>
        <CardTitle>Print, download or email the {title.toLowerCase()}</CardTitle>
      </CardHeader>
      {allowPrices && (
        <label className="mb-3 flex items-center gap-2 text-sm text-charcoal">
          <input type="checkbox" checked={includePrices} onChange={(e) => setIncludePrices(e.target.checked)} />
          Include prices (leave unticked for volunteers and suppliers)
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" isLoading={busy === 'print'} onClick={() => run('print')} data-track={`Print ${title}`}>
          Print
        </Button>
        <Button type="button" variant="outline" isLoading={busy === 'download'} onClick={() => run('download')} data-track={`Download ${title}`}>
          Download PDF
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowEmail((v) => !v)} data-track={`Email ${title}`}>
          Email
        </Button>
        {extra}
      </div>
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showEmail && (
        <form onSubmit={send} className="mt-4 space-y-3 rounded-card border border-grey p-4" data-form={`Email ${title}`}>
          <Input label="Send to (email address)" type="email" value={to} onChange={(e) => setTo(e.target.value)} required />
          <Input label="Their name (optional)" value={toName} onChange={(e) => setToName(e.target.value)} />
          <div>
            <label htmlFor="record-note" className="mb-1 block text-sm font-medium text-charcoal">
              Note (optional)
            </label>
            <textarea id="record-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-card border border-grey px-3 py-2 text-sm focus-ring" />
          </div>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" checked={ccSelf} onChange={(e) => setCcSelf(e.target.checked)} />
            Send me a copy
          </label>
          <div className="flex gap-2">
            <Button type="submit" isLoading={busy === 'email'}>
              Send
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowEmail(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {historyFor && history.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-navy">Already emailed</h3>
          <ul className="space-y-1 text-xs text-charcoal/70">
            {history.map((h) => (
              <li key={h.id}>
                {new Date(h.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} — to{' '}
                {h.recipient_name ? `${h.recipient_name} (${h.recipient_email})` : h.recipient_email}
                {h.sent_by_email ? ` by ${h.sent_by_email}${h.sent_by_type === 'charity' ? ' (charity)' : ''}` : ''}
                {h.status === 'failed' ? ' — failed' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
