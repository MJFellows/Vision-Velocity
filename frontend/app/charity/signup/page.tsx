// Charity multi-step signup flow (Task 3.1)

import { Suspense } from 'react';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { SignupForm } from '@/components/SignupForm';
import { api } from '@/lib/api';

interface BunningsStore {
  id: string;
  location: string;
}

async function getBunningsStores(): Promise<BunningsStore[]> {
  try {
    const { data } = await api.get<{ data: BunningsStore[] }>('/api/public/bunnings-stores', undefined, true);
    return data;
  } catch (error) {
    console.error('Error fetching Bunnings stores:', error);
    return [];
  }
}

// Rendered per-request rather than statically: the Bunnings store list
// is fetched from the backend at request time, and there is no live
// backend to call during `next build`'s static generation pass.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign Up Your Charity - Vision Velocity',
  description: 'Join Vision Velocity and start planning your first fundraising event.',
};

export default async function CharitySignupPage() {
  const bunningsStores = await getBunningsStores();

  return (
    <PublicLayout>
      <div className="bg-grey/20 px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="mx-auto mb-8 max-w-2xl">
          <h1 className="mb-2 text-3xl font-bold text-navy sm:text-4xl">Sign up your charity</h1>
          <p className="text-base text-charcoal/70 sm:text-lg">
            Join Vision Velocity and start planning your first fundraising event. It takes just a few minutes.
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-charcoal/60">Loading…</div>}>
          <SignupForm bunningsStores={bunningsStores} />
        </Suspense>
      </div>
    </PublicLayout>
  );
}
