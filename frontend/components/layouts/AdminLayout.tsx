import type { ReactNode } from 'react';
import { AdminNav } from './AdminNav';
import { MobileNav } from '@/components/ui/MobileNav';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GlobalSearch } from '@/components/GlobalSearch';
import { HelpPanel } from '@/components/help/HelpPanel';
import { FeedbackButton } from '@/components/help/FeedbackButton';
import { FirstVisitTour, ADMIN_TOUR } from '@/components/help/FirstVisitTour';
import { UsageTracker } from '@/components/usage/UsageTracker';
import { RecentTracker } from '@/components/usage/RecentTracker';

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-grey/40">
        <AdminNav />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar: search, page help and feedback on every admin page. */}
          <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-grey bg-white/95 px-4 py-2 backdrop-blur sm:px-6 md:px-8">
            <GlobalSearch />
            <div className="ml-auto flex items-center gap-2">
              <FeedbackButton endpoint="/api/admin/feedback" />
              <HelpPanel helpHome="/admin/help" />
            </div>
          </div>
          {/* pb-20 keeps content clear of the fixed MobileNav bar on phone widths; md:pb-8 once the sidebar takes over. */}
          <main className="flex-1 p-4 pb-24 sm:p-6 md:p-8 md:pb-8">{children}</main>
        </div>
      </div>
      <MobileNav />
      <UsageTracker endpoint="/api/admin/usage" />
      <RecentTracker />
      <FirstVisitTour area="admin" steps={ADMIN_TOUR} />
    </ProtectedRoute>
  );
}
