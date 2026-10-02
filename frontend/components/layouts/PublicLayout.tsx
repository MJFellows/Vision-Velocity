import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { PublicVisitCounter } from '@/components/usage/PublicVisitCounter';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <PublicVisitCounter />
    </div>
  );
}
