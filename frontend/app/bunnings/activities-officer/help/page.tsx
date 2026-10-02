'use client';

import { BunningsLayout } from '@/components/bunnings/BunningsLayout';
import { HelpCentre } from '@/components/help/HelpCentre';

export default function BunningsHelpPage() {
  return (
    <BunningsLayout>
      <HelpCentre audience="bunnings" base="/bunnings/activities-officer/help" />
    </BunningsLayout>
  );
}
