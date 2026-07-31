'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface Props {
  facets?: any;
}

export default function GuideFilters({ facets }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const [isMainOpen, setIsMainOpen] = useState(false);

  const handleToggle = useCallback((paramKey: string, value: string) => {
    const params        = new URLSearchParams(searchParams.toString());
    const currentStr    = params.get(paramKey) || '';
    const currentValues = currentStr.split(',').filter(Boolean);

    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    if (newValues.length > 0) {
      params.set(paramKey, newValues.join(','));
    } else {
      params.delete(paramKey);
    }
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const getSelected = (paramKey: string) =>
    (searchParams.get(paramKey) || '').split(',').filter(Boolean);

  // Format slug to readable name if gameName facet isn't available
  const formatSlugToName = (slug: string) => {
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const gameItems = (facets?.games || facets?.gameSlug || []).map((g: any) => ({
    value: g.slug || String(g.value),
    label: g.slug ? g.value : formatSlugToName(String(g.value)),
    count: g.count,
  }));

  const FILTER_CONFIG = [
    {
      id: 'type',
      label: 'Guide Type',
      hideSearch: true,
      items: (facets?.guideTypes || facets?.guideType || []).map((f: any) => ({ value: String(f.value), label: String(f.value), count: f.count })),
    },
    {
      id: 'platform',
      label: 'Platforms',
      hideSearch: true,
      items: (facets?.platforms || []).map((f: any) => ({ value: String(f.value), label: String(f.value), count: f.count })),
    },
    {
      id: 'genre',
      label: 'Genres',
      items: (facets?.genres || []).map((f: any) => ({ value: String(f.value), label: String(f.value), count: f.count })),
    },
    {
      id: 'game',
      label: 'Game',
      items: gameItems,
    },
    {
      id: 'tag',
      label: 'Tags',
      items: (facets?.tags || []).map((f: any) => ({ value: String(f.value), label: String(f.value), count: f.count })),
    },
  ];

  const hasAnyFilter = FILTER_CONFIG.some(config => getSelected(config.id).length > 0);

  return (
    <div className="w-full bg-transparent border-2 border-border rounded-none overflow-hidden mb-2">
      <button
        onClick={() => setIsMainOpen(!isMainOpen)}
        className="w-full flex items-center justify-between p-4 transition-colors group lg:cursor-default lg:pointer-events-none"
      >
        <div className="flex items-center gap-2 font-black tracking-widest uppercase text-text text-[15px]">
          <Filter className="w-4 h-4 text-text-muted group-hover:text-[var(--brand-green)] transition-colors" />
          Filter
          {hasAnyFilter && <span className="ml-2 w-2 h-2 rounded-full bg-[var(--brand-green)]" />}
        </div>
        <div className="lg:hidden">
          {isMainOpen
            ? <ChevronUp   className="w-5 h-5 text-text-muted group-hover:text-[var(--brand-green)] transition-colors" />
            : <ChevronDown className="w-5 h-5 text-text-muted group-hover:text-[var(--brand-green)] transition-colors" />
          }
        </div>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out flex-col px-4 pb-2 lg:max-h-[80vh] lg:opacity-100 lg:overflow-y-auto lg:no-scrollbar lg:border-t-2 lg:border-border ${
          isMainOpen
            ? 'max-h-[60vh] overflow-y-auto no-scrollbar opacity-100 border-t-2 border-border flex'
            : 'max-h-0 opacity-0 overflow-hidden hidden lg:flex'
        }`}
      >
        {FILTER_CONFIG.map((config) => {
          const selectedValues = getSelected(config.id);

          // Ensure already-selected values always appear even if not in facets
          const displayItems = [...config.items];
          selectedValues.forEach(val => {
            if (!displayItems.find(f => f.value === val)) {
              displayItems.push({ value: val, label: val, count: 0 });
            }
          });

          if (displayItems.length === 0) return null;

          return (
            <FilterSection
              key={config.id}
              title={config.label}
              initiallyOpen={selectedValues.length > 0}
              hideSearch={config.hideSearch}
              items={displayItems}
              configId={config.id}
              selectedValues={selectedValues}
              onToggle={handleToggle}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface FilterSectionProps {
  title: string;
  initiallyOpen?: boolean;
  hideSearch?: boolean;
  items: { value: string; label: string; count?: number }[];
  configId: string;
  selectedValues: string[];
  onToggle: (id: string, value: string) => void;
}

function FilterSection({ title, initiallyOpen, hideSearch, items, configId, selectedValues, onToggle }: FilterSectionProps) {
  const [isOpen,       setIsOpen]       = useState(initiallyOpen ?? false);
  const [searchQuery,  setSearchQuery]  = useState('');

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="border-b-2 border-border py-3 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-1 group"
      >
        <h3 className="text-[14px] font-bold tracking-wide text-text group-hover:text-[var(--brand-green)] transition-colors">
          {title}
        </h3>
        {isOpen
          ? <ChevronUp   className="w-5 h-5 text-text-muted group-hover:text-[var(--brand-green)] transition-colors" />
          : <ChevronDown className="w-5 h-5 text-text-muted group-hover:text-[var(--brand-green)] transition-colors" />
        }
      </button>

      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mt-2 flex flex-col pr-1' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        {!hideSearch && (
          <div className="relative mb-3 mt-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded text-[13px] pl-8 pr-3 py-1.5 text-text focus:outline-none focus:border-[var(--brand-green)] transition-colors"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar pb-1 pt-1">
          {filteredItems.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-2">No matches found</p>
          ) : (
            filteredItems.map(item => (
              <label key={item.value} className="flex items-center justify-between cursor-pointer group px-1">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded border border-border bg-surface group-hover:border-[var(--brand-green)] transition-colors">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={selectedValues.includes(item.value)}
                      onChange={() => onToggle(configId, item.value)}
                    />
                    <svg
                      className="w-3.5 h-3.5 text-[var(--brand-green)] opacity-0 peer-checked:opacity-100 transition-opacity"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[13px] font-medium text-text group-hover:text-[var(--brand-green)] transition-colors">
                    {item.label}
                  </span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[12px] text-text-muted font-mono bg-border px-1.5 py-0.5 rounded">
                    {item.count}
                  </span>
                )}
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
