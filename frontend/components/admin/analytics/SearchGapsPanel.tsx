'use client';

import Link from 'next/link';
import { formatNumber } from '@/lib/utils';
import type { SearchMiss } from '@/types';
import ExpandableSection from './ExpandableSection';
import { Search, FileEdit } from 'lucide-react';

export default function SearchGapsPanel({ data }: { data?: SearchMiss[] }) {
  const misses = (data ?? []).slice(0, 20);
  const counts = misses.map((m) => m.count);
  const maxCount = Math.max(1, ...counts);
  const minCount = Math.min(maxCount, ...counts);

  const fontSize = (count: number) => {
    if (maxCount === minCount) return 16;
    const ratio = (count - minCount) / (maxCount - minCount);
    return 12 + ratio * 20; // 12px – 32px
  };

  return (
    <ExpandableSection title="Search Gaps" icon={<Search className="w-4 h-4 text-accent" />}>
      <p className="text-sm text-text-muted mb-4">
        Top zero-result search queries from the last 30 days. Larger text means searched more often — click to create an article.
      </p>
      {misses.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">No search miss data yet</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-bg-elevated border border-border">
          {misses.map((m) => (
            <Link
              key={m.query}
              href={`/admin/posts/new?prefill=${encodeURIComponent(m.query)}`}
              title={`${formatNumber(m.count)} searches — Create article`}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-accent/10 transition-colors leading-none"
              style={{ fontSize: fontSize(m.count) }}
            >
              <span className="text-text-primary font-semibold group-hover:text-accent transition-colors">{m.query}</span>
              <FileEdit className="w-3 h-3 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </ExpandableSection>
  );
}
