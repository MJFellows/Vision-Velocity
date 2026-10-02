'use client';

/** Admin view of who can sign in for a charity: add a person, resend the set-up email, switch access on or off. */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiRequestError } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface CharityUser {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'member';
  is_active: boolean;
  invited_at: string;
  last_sign_in_at: string | null;
}

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'never';
}

export function CharityAccessCard({ charityId, charityEmail, charityContact, approved }: { charityId: string; charityEmail: string | null; charityContact: string | null; approved: boolean }) {
  const [users, setUsers] = useState<CharityUser[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: CharityUser[] }>(`/api/admin/charities/${charityId}/users`);
      setUsers(res.data);
    } catch {
      setUsers([]);
    }
  }, [charityId]);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async (inviteEmail: string, inviteName: string | null, role: 'owner' | 'member') => {
    setError(null);
    setMessage(null);
    setBusy(inviteEmail);
    try {
      const res = await api.post<{ data: { emailSent: boolean; emailError?: string } }>(`/api/admin/charities/${charityId}/users`, { email: inviteEmail, name: inviteName, role });
      setMessage(res.data.emailSent ? `Set-up email sent to ${inviteEmail}.` : `Access given, but the email could not be sent (${res.data.emailError ?? 'unknown error'}).`);
      setAdding(false);
      setEmail('');
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not give access — try again.');
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (u: CharityUser) => {
    if (u.is_active && !window.confirm(`Switch off sign-in access for ${u.email}?`)) return;
    setBusy(u.id);
    try {
      await api.patch(`/api/admin/charities/${charityId}/users/${u.id}`, { is_active: !u.is_active });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    invite(email.trim(), name.trim() || null, users && users.some((u) => u.role === 'owner') ? 'member' : 'owner');
  };

  return (
    <Card className="mb-6 max-w-lg">
      <CardHeader>
        <CardTitle>Sign-in access</CardTitle>
      </CardHeader>
      {!approved && <p className="mb-3 text-sm text-charcoal/70">Approving the charity gives its contact a sign-in automatically.</p>}
      {users === null && <p className="text-sm text-charcoal/60">Loading…</p>}
      {users && users.length === 0 && (
        <div className="mb-3 text-sm text-charcoal/70">
          <p>Nobody can sign in for this charity yet.</p>
          {approved && charityEmail && (
            <Button className="mt-2" variant="outline" isLoading={busy === charityEmail} onClick={() => invite(charityEmail, charityContact, 'owner')}>
              Give {charityEmail} access
            </Button>
          )}
        </div>
      )}
      {users && users.length > 0 && (
        <ul className="mb-3 divide-y divide-grey text-sm">
          {users.map((u) => (
            <li key={u.id} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-navy">
                    {u.name || u.email} {u.role === 'owner' && <Badge tone="info">Main contact</Badge>} {!u.is_active && <Badge tone="danger">Switched off</Badge>}
                  </p>
                  <p className="text-xs text-charcoal/60">
                    {u.email} · last signed in {when(u.last_sign_in_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {u.is_active && (
                    <button type="button" className="text-xs text-accent underline" disabled={busy !== null} onClick={() => invite(u.email, u.name, u.role)}>
                      Resend set-up email
                    </button>
                  )}
                  <button type="button" className="text-xs text-charcoal/70 underline" disabled={busy !== null} onClick={() => toggle(u)}>
                    {u.is_active ? 'Switch off' : 'Switch on'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="mb-2 text-sm text-green-700">{message}</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {approved &&
        (adding ? (
          <form onSubmit={submit} className="space-y-3 rounded-card border border-grey p-3" data-form="Add charity person">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div className="flex gap-2">
              <Button type="submit" isLoading={busy === email.trim()}>
                Give access
              </Button>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)}>
            + Add person
          </Button>
        ))}
    </Card>
  );
}
