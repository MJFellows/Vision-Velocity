'use client';

import { useState, type ReactNode } from 'react';
import clsx from 'clsx';

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs, defaultTabId }: { tabs: TabDef[]; defaultTabId?: string }) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div>
      <div className="flex border-b border-grey">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={clsx(
              'flex-1 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab.id === active?.id ? 'border-accent text-accent' : 'border-transparent text-charcoal/60 hover:text-charcoal'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{active?.content}</div>
    </div>
  );
}
