'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpandableSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function ExpandableSection({ title, icon, defaultOpen = true, children }: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-bg-surface mb-8 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-5 py-4 text-left hover:bg-bg-elevated/50 transition-colors"
        aria-expanded={open}
      >
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
