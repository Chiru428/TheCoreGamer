'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  totalResults: number;
}

const FILTER_LABELS: Record<string, string> = {
  type:     'Type',
  platform: 'Platform',
  genre:    'Genre',
  game:     'Game',
  tag:      'Tag',
  q:        'Search',
};

export default function GuideActiveFilters({ totalResults }: Props) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const filterKeys = ['type', 'platform', 'genre', 'game', 'tag', 'q'];

  const hasFilters = filterKeys.some(k => searchParams.has(k));

  const activeFilters = useMemo(() => {
    const filters: { key: string; value: string; displayValue: string }[] = [];
    filterKeys.forEach(key => {
      const val = searchParams.get(key);
      if (val) {
        val.split(',').filter(Boolean).forEach(v => {
          filters.push({ key, value: v, displayValue: v });
        });
      }
    });
    return filters;
  }, [searchParams]);

  const removeFilter = (key: string, value: string) => {
    const params        = new URLSearchParams(searchParams.toString());
    const currentValues = (params.get(key) || '').split(',').filter(Boolean);
    const newValues     = currentValues.filter(v => v !== value);
    if (newValues.length > 0) {
      params.set(key, newValues.join(','));
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    filterKeys.forEach(key => params.delete(key));
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (!hasFilters) return null;

  return (
    <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
      <p className="text-text-muted text-sm font-medium whitespace-nowrap">
        Showing <span className="text-text font-bold">{totalResults}</span> results
      </p>

      <div className="flex flex-wrap gap-2 flex-1">
        {activeFilters.map(filter => (
          <button
            key={`${filter.key}-${filter.value}`}
            onClick={() => removeFilter(filter.key, filter.value)}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full border-2 border-[var(--brand-green)] text-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-black transition-colors"
          >
            <span className="opacity-60">{FILTER_LABELS[filter.key] ?? filter.key}:</span>
            <span>{filter.displayValue}</span>
            <X className="w-3 h-3" />
          </button>
        ))}
        {activeFilters.length > 1 && (
          <button
            onClick={clearAllFilters}
            className="text-[12px] font-semibold px-2.5 py-1 rounded-full border-2 border-border text-text-muted hover:border-danger hover:text-danger transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
