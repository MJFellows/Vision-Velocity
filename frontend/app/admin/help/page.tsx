'use client';

import { AdminLayout } from '@/components/layouts/AdminLayout';
import { HelpCentre } from '@/components/help/HelpCentre';

export default function AdminHelpPage() {
  return (
    <AdminLayout>
      <HelpCentre audience="admin" base="/admin/help" />
    </AdminLayout>
  );
}
