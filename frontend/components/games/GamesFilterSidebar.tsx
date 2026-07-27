'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import type { FacetData } from '@/hooks/useAlgoliaGames';

interface Props {
  facets: FacetData;
}

const FILTER_CONFIG = [
  { id: 'genres', label: 'Genres', facetKey: 'genres' },
  { id: 'platforms', label: 'Platforms', facetKey: 'platforms' },
  { id: 'gameModes', label: 'Game modes', facetKey: 'gameModes' },
  { id: 'perspectives', label: 'Player perspectives', facetKey: 'playerPerspectives' },
  { id: 'themes', label: 'Themes', facetKey: 'themes' },
  { id: 'collection', label: 'Collection', facetKey: 'collectionName' },
  { id: 'tags', label: 'Tags', facetKey: 'tags' },
  { id: 'year', label: 'Release year', facetKey: 'releaseYear' },
  { id: 'status', label: 'Release status', facetKey: 'releaseStatus' },
  { id: 'rating', label: 'Age rating', facetKey: 'esrbRating' },
  { id: 'developer', label: 'Developer', facetKey: 'developer' },
];

export default function GamesFilterSidebar({ facets }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleToggle = (paramKey: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentStr = params.get(paramKey) || '';
    const currentValues = currentStr.split(/,\s*(?![^()]*\))/).filter(Boolean).map(v => v.trim());
    
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

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const getSelected = (paramKey: string) => {
    return (searchParams.get(paramKey) || '').split(/,\s*(?![^()]*\))/).filter(Boolean).map(v => v.trim());
  };

  const hasAnyFilter = FILTER_CONFIG.some(config => getSelected(config.id).length > 0);

  return (
    <div className="w-full bg-transparent border-2 border-border rounded-none overflow-hidden mb-2">
      <div className="w-full flex items-center justify-between p-4 border-b-2 border-border">
        <div className="flex items-center gap-2 font-black tracking-widest uppercase text-text text-[15px]">
          <Filter className="w-4 h-4 text-text-muted" />
          Filter
          {hasAnyFilter && <span className="ml-2 w-2 h-2 rounded-full bg-[var(--brand-green)]"></span>}
        </div>
      </div>
      <div className="flex flex-col px-4 pb-2">
      {FILTER_CONFIG.map((config) => {
        const facetValues = facets[config.facetKey] || [];
        const selectedValues = getSelected(config.id);
        
        // Always show selected items even if facet count drops to 0 (unless we strictly want to hide)
        // Combine facet returned items + selected items to prevent UI jumping
        let displayItems = [...facetValues];
        
        selectedValues.forEach(val => {
          if (!displayItems.find(f => f.value === val)) {
            displayItems.push({ value: val, count: 0 });
          }
        });

        if (config.id === 'year') {
          displayItems.sort((a, b) => Number(b.value) - Number(a.value));
        }

        // Skip rendering if no options exist and none are selected
        if (displayItems.length === 0) return null;

        return (
          <FilterSection 
            key={config.id} 
            title={config.label}
            initiallyOpen={selectedValues.length > 0}
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
  items: { value: string; count: number }[];
  configId: string;
  selectedValues: string[];
  onToggle: (id: string, value: string) => void;
}

function FilterSection({ title, initiallyOpen, items, configId, selectedValues, onToggle }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen ?? false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item => 
    item.value.toLowerCase().includes(searchQuery.toLowerCase())
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
        {items.length > 8 && (
          <div className="mb-2 px-1 pt-1">
            <input 
              type="text" 
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded px-2 py-1.5 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-[var(--brand-green)] transition-colors"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar pb-1 pt-1">
          {filteredItems.length === 0 ? (
            <div className="text-[12px] text-text-muted px-1 py-2">No matches found</div>
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
                    {item.value}
                  </span>
                </div>
                {item.count > 0 && (
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
