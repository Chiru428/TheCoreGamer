import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderLootTable, LootTableAttrs } from '../../lib/gaming-block-renderers';
import { Dices, Settings2, Trash2, Save, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type LootItem = {
  name: string;
  source: string;
  dropRate: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Unique';
  notes?: string;
};

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unique'] as const;

// --- Node View ----------------------------------------------------------------

const LootTableNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as LootTableAttrs;

  const [gameName, setGameName] = useState(attrs.gameName ?? '');
  const [areaName, setAreaName] = useState(attrs.areaName ?? '');
  const [localItems, setLocalItems] = useState<LootItem[]>(() => {
    try { return JSON.parse(attrs.items as unknown as string); } catch { return attrs.items ?? []; }
  });

  // Auto-open on first insert
  useEffect(() => {
    if (!localItems.length) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => {
    updateAttributes({
      gameName,
      areaName,
      items: JSON.stringify(localItems),
    });
  };

  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const previewAttrs: LootTableAttrs = { gameName, areaName, items: localItems };

  const addItem = () => setLocalItems([...localItems, { name: '', source: '', dropRate: '', rarity: 'Common', notes: '' }]);
  const removeItem = (i: number) => setLocalItems(localItems.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: keyof LootItem, val: string) => {
    setLocalItems(localItems.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  };

  return (
    <NodeViewWrapper className="loot-table-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div
        className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-purple-500/60 rounded-2xl shadow-lg')}
        dangerouslySetInnerHTML={{ __html: renderLootTable(previewAttrs) }}
      />

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-purple-400 rounded-lg border border-purple-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Settings2 className="w-3.5 h-3.5" /> Edit Table
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
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(168,85,247,0.25)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Dices className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Loot / Drop Table</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Game Name (optional)</label>
                <input type="text" value={gameName} onChange={e => setGameName(e.target.value)} placeholder="e.g. Elden Ring"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  onFocus={stopProp} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Area / Source (optional)</label>
                <input type="text" value={areaName} onChange={e => setAreaName(e.target.value)} placeholder="e.g. Stormveil Castle"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  onFocus={stopProp} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Items</label>
                <button type="button" onClick={addItem} className="p-1 text-purple-400 hover:bg-purple-500/10 rounded"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2">
                {localItems.map((item, i) => (
                  <div key={i} className="grid gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', gridTemplateColumns: '1fr 1fr 90px auto 1fr auto' }}>
                    <input type="text" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Item name"
                      className="rounded px-2 py-1.5 text-xs focus:outline-none col-span-1"
                      style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} onFocus={stopProp} />
                    <input type="text" value={item.source} onChange={e => updateItem(i, 'source', e.target.value)} placeholder="Source"
                      className="rounded px-2 py-1.5 text-xs focus:outline-none"
                      style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} onFocus={stopProp} />
                    <input type="text" value={item.dropRate} onChange={e => updateItem(i, 'dropRate', e.target.value)} placeholder="12.5%"
                      className="rounded px-2 py-1.5 text-xs focus:outline-none"
                      style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} onFocus={stopProp} />
                    <select value={item.rarity} onChange={e => updateItem(i, 'rarity', e.target.value)}
                      className="rounded px-2 py-1.5 text-xs focus:outline-none"
                      style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}>
                      {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input type="text" value={item.notes ?? ''} onChange={e => updateItem(i, 'notes', e.target.value)} placeholder="Notes (optional)"
                      className="rounded px-2 py-1.5 text-xs focus:outline-none"
                      style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.07)', color: '#888' }} onFocus={stopProp} />
                    <button type="button" onClick={() => removeItem(i)} className="text-slate-600 hover:text-red-400 flex items-center justify-center"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              {localItems.length === 0 && (
                <p className="text-xs text-slate-500 italic mt-2">No items yet — click + to add one.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

LootTableNodeView.displayName = 'LootTableNodeView';

// --- Node Definition ----------------------------------------------------------

export const LootTableNode = Node.create({
  name: 'lootTable',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      gameName: { default: '' },
      areaName: { default: '' },
      items: { default: JSON.stringify([]) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="loot-table"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'loot-table' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LootTableNodeView);
  },
});
