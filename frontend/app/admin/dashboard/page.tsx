'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { listCharities, listOrders, listBunningsStores } from '@/lib/adminApi';

function startOfWeek(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day;
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().slice(0, 10);
}

function endOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + 6;
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().slice(0, 10);
}

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

interface DashboardStats {
  totalCharities: number;
  trialCharities: number;
  eventsThisWeek: number;
  bunningsStores: number;
  revenueYtd: number;
  revenueIsPartial: boolean;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const [allCharities, trialCharities, weekOrders, ytdOrders, stores] = await Promise.all([
          listCharities({ pageSize: 1 }),
          listCharities({ status: 'trial', pageSize: 1 }),
          listOrders({ from: startOfWeek(), to: endOfWeek(), pageSize: 1 }),
          listOrders({ from: startOfYear(), pageSize: 100 }),
          listBunningsStores(true),
        ]);

        if (cancelled) return;

        const revenueYtd = ytdOrders.data
          .filter((o) => o.status !== 'cancelled')
          .reduce((sum, o) => sum + Number(o.total_price_aud), 0);

        setStats({
          totalCharities: allCharities.pagination.total,
          trialCharities: trialCharities.pagination.total,
          eventsThisWeek: weekOrders.pagination.total,
          bunningsStores: stores.data.length,
          revenueYtd,
          // pageSize caps at 100 server-side — if there are more YTD orders than that, the sum below is a lower bound, not exact.
          revenueIsPartial: ytdOrders.pagination.total > ytdOrders.data.length,
        });
      } catch {
        if (!cancelled) setError('Could not load dashboard stats — try refreshing.');
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <AdminLayout>
      <h1 className="mb-1">Hi {firstName}, what would you like to do?</h1>
      <p className="mb-6 text-sm text-charcoal/60">Here&apos;s where things stand today.</p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Charities" value={String(stats?.totalCharities ?? '')} isLoading={!stats} />
        <StatCard label="Trial charities" value={String(stats?.trialCharities ?? '')} isLoading={!stats} />
        <StatCard label="Events this week" value={String(stats?.eventsThisWeek ?? '')} isLoading={!stats} />
        <StatCard label="Bunnings stores" value={String(stats?.bunningsStores ?? '')} isLoading={!stats} />
      </div>

      <div className="mt-4">
        <StatCard
          label={`Revenue YTD${stats?.revenueIsPartial ? ' (partial — over 100 orders)' : ''}`}
          value={stats ? `$${stats.revenueYtd.toLocaleString('en-AU')}` : ''}
          isLoading={!stats}
        />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/charities">
          <Button variant="outline" className="w-full">
            View Charities
          </Button>
        </Link>
        <Link href="/admin/orders">
          <Button variant="outline" className="w-full">
            View Orders
          </Button>
        </Link>
        <Link href="/admin/bunnings">
          <Button variant="outline" className="w-full">
            View Bunnings Stores
          </Button>
        </Link>
        <Link href="/admin/woolworths">
          <Button variant="outline" className="w-full">
            Woolworths Status
          </Button>
        </Link>
      </div>
    </AdminLayout>
  );
}
