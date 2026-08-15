'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const defaultSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
  { value: 'updated', label: 'Recently Updated' },
];

// For reference-style content (guides/walkthroughs/lists): drop "Oldest First",
// which sees no real use on content people search rather than browse chronologically.
export const referenceSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
  { value: 'updated', label: 'Recently Updated' },
];

interface SortDropdownProps {
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

export default function SortDropdown({ options = defaultSortOptions, defaultValue = 'newest' }: SortDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || defaultValue;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLabel = options.find(opt => opt.value === currentSort)?.label || options[0]?.label;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === defaultValue) {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }
    
    params.delete('page'); // reset to first page without polluting the URL
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-3 relative" ref={dropdownRef}>
      <label className="text-sm font-semibold text-text-muted drop-shadow-sm">Sort by:</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center w-[180px] px-4 py-2 text-sm font-medium text-[var(--text)] bg-[var(--bg2)] border border-gray-200/50 dark:border-white/10 rounded-full shadow-sm hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <span className="flex-1 text-center truncate px-2">{currentLabel}</span>
          <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform duration-200 opacity-70", isOpen && "rotate-180")} />
        </button>
        
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-[180px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="py-4 flex flex-col gap-3 bg-[var(--bg2)] border border-gray-200/60 dark:border-white/10 rounded-[20px] shadow-xl dark:shadow-2xl shadow-black/5 dark:shadow-black/50">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSortChange(opt.value)}
                  className="group w-full text-center px-5 py-1 text-sm font-medium"
                >
                  <span className="relative inline-block text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {opt.label}
                    <span 
                      className={cn(
                        "absolute left-0 -bottom-1 h-[2px] bg-gray-900 dark:bg-white transition-all duration-300 ease-out",
                        currentSort === opt.value ? "w-full" : "w-0 group-hover:w-full"
                      )} 
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
