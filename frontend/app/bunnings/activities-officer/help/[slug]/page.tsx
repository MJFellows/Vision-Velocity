'use client';

import { useParams } from 'next/navigation';
import { BunningsLayout } from '@/components/bunnings/BunningsLayout';
import { HelpGuidePage } from '@/components/help/HelpGuidePage';

export default function BunningsHelpGuide() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <BunningsLayout>
      <HelpGuidePage slug={slug} base="/bunnings/activities-officer/help" />
    </BunningsLayout>
  );
}
