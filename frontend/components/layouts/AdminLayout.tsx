import type { ReactNode } from 'react';
import { AdminNav } from './AdminNav';
import { MobileNav } from '@/components/ui/MobileNav';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-grey/40">
        <AdminNav />
        {/* pb-16 keeps content clear of the fixed MobileNav bar on phone widths; md:pb-0 removes it once the sidebar takes over. */}
        <main className="flex-1 p-4 pb-20 sm:p-6 md:p-8 md:pb-8">{children}</main>
      </div>
      <MobileNav />
    </ProtectedRoute>
  );
}
