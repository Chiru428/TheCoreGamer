import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { searchAutocomplete } from '@/lib/api';
import type { AutocompleteResult } from '@/types';

export interface PickedGame {
  slug: string;
  title: string;
  imageUrl?: string;
}

// --- Inline game search (editor-only, not the public-facing component) -----

export function GamePicker({
  onSelect,
  stopProp,
  placeholder = 'Search game by title…',
}: {
  onSelect: (game: PickedGame) => void;
  stopProp: (e: React.MouseEvent | React.FocusEvent) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await searchAutocomplete(query);
      if (res.success && res.data) setResults(res.data.filter(r => r.type === 'GAME'));
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const inputStyle = {
    background: 'var(--ed-input-bg, #0a0f1e)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
  };

  return (
    <div className="relative" onMouseDown={stopProp}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500/50"
          style={inputStyle}
          onFocus={stopProp}
        />
      </div>
      {results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-lg shadow-2xl overflow-hidden border border-white/10"
          style={{ background: 'var(--ed-elevated, #0d1527)' }}>
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-emerald-500/10 transition-colors flex flex-col gap-0.5"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => {
                onSelect({ slug: r.slug, title: r.title || r.slug, imageUrl: r.imageUrl ?? undefined });
                setQuery('');
                setResults([]);
              }}
            >
              <span className="font-medium truncate">{r.title}</span>
              <span className="text-xs text-slate-400 truncate">/{r.slug}</span>
            </button>
          ))}
        </div>
      )}
      {loading && query.length >= 2 && results.length === 0 && (
        <p className="mt-1 text-xs text-slate-500 px-1">Searching…</p>
      )}
    </div>
  );
}
