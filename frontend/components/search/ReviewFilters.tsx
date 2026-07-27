'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, ChevronDown, ChevronUp, Search } from 'lucide-react';

const scoreLabels = [
  { value: '10', label: 'Masterpiece (10.0)' },
  { value: '9', label: 'Excellent (9.0 - 9.9)' },
  { value: '8', label: 'Great (8.0 - 8.9)' },
  { value: '7', label: 'Good (7.0 - 7.9)' },
  { value: '6', label: 'Fair (6.0 - 6.9)' },
  { value: '5', label: 'Average (5.0 - 5.9)' },
  { value: '4', label: 'Unimpressive (4.0 - 4.9)' },
  { value: '3', label: 'Bad (3.0 - 3.9)' },
  { value: '2', label: 'Terrible (2.0 - 2.9)' },
  { value: '0-1', label: 'Unplayable (0 - 1.9)' },
];

interface Props {
  facets?: {
    platforms: { value: string; count: number }[];
    genres: { value: string; count: number }[];
    years: { value: string; count: number }[];
    tags: { value: string; count: number }[];
  };
}

export default function ReviewFilters({ facets }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMainOpen, setIsMainOpen] = useState(false);

  const handleToggle = useCallback((paramKey: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentStr = params.get(paramKey) || '';
    const currentValues = currentStr.split(',').filter(Boolean);
    
    let newValues;
    if (currentValues.includes(value)) {
      newValues = currentValues.filter(v => v !== value);
    } else {
      newValues = [...currentValues, value];
    }

    if (newValues.length > 0) {
      params.set(paramKey, newValues.join(','));
    } else {
      params.delete(paramKey);
    }

    // Reset page when filtering
    params.delete('page');

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const getSelected = (paramKey: string) => {
    return (searchParams.get(paramKey) || '').split(',').filter(Boolean);
  };

  const FILTER_CONFIG = [
    { id: 'platform', label: 'Platforms', hideSearch: true, items: (facets?.platforms || []).map(f => ({ value: f.value, label: f.value, count: f.count })) },
    { id: 'genre', label: 'Genres', items: (facets?.genres || []).map(f => ({ value: f.value, label: f.value, count: f.count })) },
    { id: 'tag', label: 'Tags', items: (facets?.tags || []).map(f => ({ value: f.value, label: f.value, count: f.count })) },
    { id: 'score', label: 'Review Score', hideSearch: true, items: scoreLabels },
    { id: 'year', label: 'Release year', items: (facets?.years || []).map(f => ({ value: String(f.value), label: String(f.value), count: f.count })) },
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
          {hasAnyFilter && <span className="ml-2 w-2 h-2 rounded-full bg-[var(--brand-green)]"></span>}
        </div>
        <div className="lg:hidden">
          {isMainOpen ? (
            <ChevronUp className="w-5 h-5 text-text-muted group-hover:text-[var(--brand-green)] transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-muted group-hover:text-[var(--brand-green)] transition-colors" />
          )}
        </div>
      </button>

      <div className={`transition-all duration-300 ease-in-out flex-col px-4 pb-2 lg:max-h-[80vh] lg:opacity-100 lg:overflow-y-auto lg:no-scrollbar lg:border-t-2 lg:border-border ${isMainOpen ? 'max-h-[60vh] overflow-y-auto no-scrollbar opacity-100 border-t-2 border-border flex' : 'max-h-0 opacity-0 overflow-hidden hidden lg:flex'}`}>
        {FILTER_CONFIG.map((config) => {
          const selectedValues = getSelected(config.id);
          
          let displayItems = [...config.items];
          selectedValues.forEach(val => {
            if (!displayItems.find(f => f.value === val)) {
              displayItems.push({ value: val, label: val });
            }
          });

          if (config.id === 'year') {
            displayItems.sort((a, b) => Number(b.value) - Number(a.value));
          }

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
  const [isOpen, setIsOpen] = useState(initiallyOpen ?? false);
  const [searchQuery, setSearchQuery] = useState('');

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
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-text-muted group-hover:text-[var(--brand-green)] transition-colors" />
        ) : (
          <ChevronDown className="w-5 h-5 text-text-muted group-hover:text-[var(--brand-green)] transition-colors" />
        )}
      </button>
      
      <div 
        className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mt-2 flex flex-col pr-1' : 'max-h-0 opacity-0 overflow-hidden'}`}
      >
        {!hideSearch && (
          <div className="relative mb-3 mt-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input 
              type="text" 
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded text-[13px] pl-8 pr-3 py-1.5 text-text focus:outline-none focus:border-[var(--brand-green)] transition-colors"
            />
          </div>
        )}
        <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar pb-1 pt-1">
          {filteredItems.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-2">No matches found</p>
          ) : (
            filteredItems.map((item) => (
            <label 
              key={item.value} 
              className="flex items-center justify-between cursor-pointer group px-1"
            >
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
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={3}
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
          )))}
        </div>
      </div>
    </div>
  );
}
