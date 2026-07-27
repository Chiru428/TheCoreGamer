'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AnalyticsTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: 'Overview', href: '/admin/analytics' },
    { name: 'Content Performance', href: '/admin/analytics/content' },
    { name: 'Author Breakdown', href: '/admin/analytics/authors' },
    { name: 'Search Analytics', href: '/admin/analytics/search' },
  ];

  return (
    <div className="flex border-b border-border mb-8 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary hover:border-border'
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
