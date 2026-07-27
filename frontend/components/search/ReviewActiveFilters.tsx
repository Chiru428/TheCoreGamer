'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  totalResults: number;
}

export default function ReviewActiveFilters({ totalResults }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const filterKeys = ['platform', 'genre', 'tag', 'score', 'year', 'q'];
  
  const hasFilters = Array.from(searchParams.keys()).some(k => 
    filterKeys.includes(k)
  );

  const activeFilters = useMemo(() => {
    const filters: { key: string, value: string, displayValue: string }[] = [];
    filterKeys.forEach(key => {
      const val = searchParams.get(key);
      if (val) {
        val.split(',').filter(Boolean).forEach(v => {
          let displayValue = v;
          if (key === 'score') {
            const scoreLabels: Record<string, string> = {
              '10': 'Masterpiece',
              '9': 'Excellent',
              '8': 'Great',
              '7': 'Good',
              '6': 'Fair',
              '5': 'Average',
              '4': 'Unimpressive',
              '3': 'Bad',
              '2': 'Terrible',
              '0-1': 'Unplayable'
            };
            displayValue = scoreLabels[v] || v;
          }
          filters.push({ key, value: v, displayValue });
        });
      }
    });
    return filters;
  }, [searchParams]);

  const removeFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValues = (params.get(key) || '').split(',').filter(Boolean);
    const newValues = currentValues.filter(v => v !== value);
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
    filterKeys.forEach(key => {
      params.delete(key);
    });
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (!hasFilters) return null;

  return (
    <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
      <p className="text-text-muted text-sm font-medium whitespace-nowrap">
        Showing <span className="text-text font-bold">{totalResults}</span> results
      </p>
      
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f, i) => (
            <button
              key={`${f.key}-${f.value}-${i}`}
              onClick={() => removeFilter(f.key, f.value)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-semibold text-text-primary bg-bg-elevated border border-border hover:border-[var(--brand-green)] hover:text-[var(--brand-green)] transition-colors group"
            >
              {f.displayValue}
              <X className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
            </button>
          ))}
          {activeFilters.length > 1 && (
            <button 
              onClick={clearAllFilters}
              className="text-[13px] font-bold text-red-500 hover:underline ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
