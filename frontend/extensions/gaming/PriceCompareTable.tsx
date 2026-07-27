import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, memo } from 'react';
import { PriceCompareTableAttrs, DEFAULT_PRICE_COMPARE_TABLE } from '../../lib/gaming-block-renderers';
import { fetchGames } from '@/lib/api';
import { Game } from '@/types';
import { Search, Trash2, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import PriceCompareTableRenderer from '@/components/public/blocks/PriceCompareTableRenderer';

const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' } as const;
const labelStyle = { color: 'var(--ed-text-muted, #8090a8)' } as const;

// --- Node View Component ------------------------------------------------------

const PriceCompareTableNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode, editor } = props;
  const attrs = node.attrs as PriceCompareTableAttrs;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Game[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  // -- Debounced game search — must run unconditionally (rules of hooks), so
  // this sits above the reader-view early return below. In reader view the
  // search input never renders, so `query` stays empty and this is a no-op.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const debounce = setTimeout(async () => {
      try {
        const res = await fetchGames({ fields: 'card', search: query, limit: 8 });
        setResults(res.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  // -- Reader view ----------------------------------------------------------
  if (!editor.isEditable) {
    return (
      <NodeViewWrapper className="price-compare-table-node-wrapper" style={{ isolation: 'isolate' }}>
        <PriceCompareTableRenderer gameId={attrs.gameId} gameTitle={attrs.gameTitle} itadId={attrs.itadId} />
      </NodeViewWrapper>
    );
  }

  // -- Editor view -----------------------------------------------------------
  const selectGame = (game: Game) => {
    updateAttributes({ gameId: game.id, gameTitle: game.title });
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const clearGame = () => {
    updateAttributes({ gameId: DEFAULT_PRICE_COMPARE_TABLE.gameId, gameTitle: DEFAULT_PRICE_COMPARE_TABLE.gameTitle, itadId: DEFAULT_PRICE_COMPARE_TABLE.itadId });
  };

  return (
    <NodeViewWrapper className="price-compare-table-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div
        className={cn('rounded-2xl border overflow-hidden transition-all duration-200', selected && 'ring-2 ring-blue-500/60')}
        style={{ background: 'var(--ed-elevated, #0d1527)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <RefreshCw className="w-4 h-4" style={labelStyle} />
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--ed-text, #fff)' }}>Price Comparison</h3>
        </div>

        <div className="p-4 space-y-3">
          {attrs.gameId ? (
            <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--ed-text, #fff)' }}>{attrs.gameTitle || attrs.gameId}</span>
              <button type="button" onClick={clearGame} onMouseDown={stopProp} className="text-slate-500 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={inputStyle}>
                <Search className="w-4 h-4" style={labelStyle} />
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowResults(true); }}
                  onFocus={e => { stopProp(e); setShowResults(true); }}
                  placeholder="Search for a game…"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: 'var(--ed-input-text, #fff)' }}
                />
              </div>
              {showResults && query.trim() && (
                <div
                  className="absolute z-50 w-full mt-1 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto"
                  style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {searching && (
                    <div className="px-3 py-2 text-xs" style={labelStyle}>Searching…</div>
                  )}
                  {!searching && results.length === 0 && (
                    <div className="px-3 py-2 text-xs" style={labelStyle}>No games found</div>
                  )}
                  {results.map(game => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => selectGame(game)}
                      onMouseDown={stopProp}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--ed-text, #fff)' }}
                    >
                      {game.coverImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={game.coverImageUrl} alt="" className="w-8 h-10 object-cover rounded flex-shrink-0" />
                      )}
                      <span className="truncate">{game.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {attrs.gameId && (
            <div className="rounded-xl overflow-hidden pointer-events-none opacity-90">
              <PriceCompareTableRenderer gameId={attrs.gameId} gameTitle={attrs.gameTitle} itadId={attrs.itadId} />
            </div>
          )}
        </div>
      </div>

      {/* Delete node button */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity duration-200', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        <button
          type="button"
          onClick={deleteNode}
          onMouseDown={stopProp}
          className="px-2 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </NodeViewWrapper>
  );
});

PriceCompareTableNodeView.displayName = 'PriceCompareTableNodeView';

// --- Node Definition ----------------------------------------------------------

export const PriceCompareTableNode = Node.create({
  name: 'priceCompareTable',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      gameId: { default: DEFAULT_PRICE_COMPARE_TABLE.gameId },
      gameTitle: { default: DEFAULT_PRICE_COMPARE_TABLE.gameTitle },
      itadId: { default: DEFAULT_PRICE_COMPARE_TABLE.itadId },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="price-compare-table"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'price-compare-table' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PriceCompareTableNodeView);
  },
});
