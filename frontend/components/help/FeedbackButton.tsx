'use client';

/** "Send feedback" button: one box, "What were you trying to do?". The page is attached automatically. */

import { useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { api, ApiRequestError } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export function FeedbackButton({ endpoint, label = 'Feedback' }: { endpoint: string; label?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return setError('Please write a message.');
    setSending(true);
    setError(null);
    try {
      await api.post(endpoint, { page: pathname, message: message.trim() });
      setDone(true);
      setMessage('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not send — please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        data-track="Send feedback"
        onClick={() => {
          setOpen(true);
          setDone(false);
        }}
        className="rounded-full border border-grey bg-white px-3 py-1.5 text-sm font-medium text-navy shadow-sm hover:bg-grey/40 focus-ring"
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label={label} className="w-full max-w-md rounded-card bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-navy">{label}</h2>
            {done ? (
              <>
                <p className="mb-4 text-sm text-green-700">Thank you — your message has been sent to Vision Velocity.</p>
                <Button type="button" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </>
            ) : (
              <form onSubmit={submit} data-no-track>
                <label htmlFor="feedback-message" className="mb-1 block text-sm text-charcoal/80">
                  What were you trying to do, and what happened? Suggestions are welcome too.
                </label>
                <textarea
                  id="feedback-message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mb-3 w-full rounded-card border border-grey px-3 py-2 text-sm focus-ring"
                />
                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <Button type="submit" isLoading={sending}>
                    Send
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
