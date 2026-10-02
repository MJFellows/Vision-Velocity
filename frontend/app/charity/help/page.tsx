'use client';

import { CharityLayout } from '@/components/charity/CharityLayout';
import { HelpCentre } from '@/components/help/HelpCentre';

export default function CharityHelpPage() {
  return (
    <CharityLayout>
      <HelpCentre audience="charity" base="/charity/help" />
    </CharityLayout>
  );
}
