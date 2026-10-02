'use client';

import { useParams } from 'next/navigation';
import { CharityLayout } from '@/components/charity/CharityLayout';
import { HelpGuidePage } from '@/components/help/HelpGuidePage';

export default function CharityHelpGuide() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <CharityLayout>
      <HelpGuidePage slug={slug} base="/charity/help" />
    </CharityLayout>
  );
}
