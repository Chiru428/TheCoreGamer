'use client';

import { useState, useEffect, useRef } from 'react';
import { searchAutocomplete } from '@/lib/api';
import type { AutocompleteResult } from '@/types';
import { Loader2, Search, X } from 'lucide-react';

interface ArticleSearchSelectProps {
  value: string;
  onChange: (id: string) => void;
}

export default function ArticleSearchSelect({ value, onChange }: ArticleSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchAutocomplete(query);
      if (res.success && res.data) {
        // Filter just in case the API returns other types
        setResults(res.data.filter(r => r.type === 'ARTICLE'));
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (article: AutocompleteResult) => {
    onChange(article.id);
    setSelectedTitle(article.title || article.slug);
    setQuery('');
    setOpen(false);
  };

  const clearSelection = () => {
    onChange('');
    setSelectedTitle('');
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {value ? (
        <div className="flex items-center justify-between px-3 py-2 bg-bg-surface border border-border rounded-lg">
          <div className="text-sm text-text-primary truncate font-medium">
            {selectedTitle || value}
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="p-1 text-text-muted hover:text-red-400 transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {loading ? (
              <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-text-muted" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search article by title..."
            className="w-full pl-9 pr-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
          />
        </div>
      )}

      {open && query && !value && (
        <div className="absolute z-10 w-full mt-1 bg-bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-elevated hover:text-accent transition-colors flex flex-col"
              >
                <span className="font-medium truncate">{result.title}</span>
                <span className="text-xs text-text-muted truncate">/{result.slug}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-text-muted text-center">
              {query.length < 2 ? 'Type at least 2 characters...' : loading ? 'Searching...' : 'No articles found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
