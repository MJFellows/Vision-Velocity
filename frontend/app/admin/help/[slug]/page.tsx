'use client';

import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { HelpGuidePage } from '@/components/help/HelpGuidePage';

export default function AdminHelpGuide() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <AdminLayout>
      <HelpGuidePage slug={slug} base="/admin/help" />
    </AdminLayout>
  );
}
