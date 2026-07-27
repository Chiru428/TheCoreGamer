import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderPriceHistory, PriceHistoryAttrs } from '../../lib/gaming-block-renderers';
import { TrendingUp, Settings2, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Node View ----------------------------------------------------------------

const PriceHistoryNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as PriceHistoryAttrs;

  const [gameSlug, setGameSlug] = useState(attrs.gameSlug ?? '');
  const [gameName, setGameName] = useState(attrs.gameName ?? 'Game Title');
  const [currentPrice, setCurrentPrice] = useState(attrs.currentPrice ?? '');
  const [allTimeLow, setAllTimeLow] = useState(attrs.allTimeLow ?? '');
  const [storeName, setStoreName] = useState(attrs.storeName ?? '');

  useEffect(() => {
    if (!attrs.gameSlug) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => updateAttributes({ gameSlug, gameName, currentPrice, allTimeLow, storeName });
  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const previewAttrs: PriceHistoryAttrs = { gameSlug, gameName, currentPrice, allTimeLow, storeName };

  const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };
  const inp = (lbl: string, val: string, set: (v: string) => void, ph = '') => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">{lbl}</p>
      <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={inputStyle} onFocus={stopProp} />
    </div>
  );

  return (
    <NodeViewWrapper className="price-history-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-emerald-500/50 rounded-xl shadow-lg')}
        dangerouslySetInnerHTML={{ __html: renderPriceHistory(previewAttrs) }} />

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-emerald-400 rounded-lg border border-emerald-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Settings2 className="w-3.5 h-3.5" /> Edit
          </button>
        ) : (
          <button type="button" onClick={handleDone} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-green-600/90 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Save className="w-3.5 h-3.5" /> Done
          </button>
        )}
        <button type="button" onClick={deleteNode} onMouseDown={stopProp}
          className="px-2 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Edit panel */}
      {isEditing && (
        <div className="relative z-50 mt-3 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(52,211,153,0.2)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Price History</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-slate-500 mb-4">The sparkline is fetched live from <code className="text-xs">/api/deals/prices?gameSlug=…</code> on the published page.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {inp('Game Slug (API key)', gameSlug, setGameSlug, 'e.g. cyberpunk-2077')}
              {inp('Game Name (display)', gameName, setGameName, 'e.g. Cyberpunk 2077')}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {inp('Current Price (fallback)', currentPrice, setCurrentPrice, 'e.g. $29.99')}
              {inp('All-Time Low (fallback)', allTimeLow, setAllTimeLow, 'e.g. $9.99')}
              {inp('Store Name', storeName, setStoreName, 'e.g. Steam')}
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

PriceHistoryNodeView.displayName = 'PriceHistoryNodeView';

// --- Node Definition ----------------------------------------------------------

export const PriceHistoryNode = Node.create({
  name: 'priceHistory',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      gameSlug: { default: '' },
      gameName: { default: 'Game Title' },
      currentPrice: { default: '' },
      allTimeLow: { default: '' },
      storeName: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-widget="price-history"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-widget': 'price-history' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PriceHistoryNodeView);
  },
});
