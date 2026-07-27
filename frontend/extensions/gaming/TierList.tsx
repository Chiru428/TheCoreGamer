import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { renderTierList, TierListAttrs, TierItem, TierRow, TierLabel, DEFAULT_TIER_LIST } from '../../lib/gaming-block-renderers';
import { Plus, X, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIER_LABELS: TierLabel[] = ['S', 'A', 'B', 'C', 'D', 'F'];

const genId = () => Math.random().toString(36).slice(2, 10);

// --- Node View Component ------------------------------------------------------

const TierListNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode, editor } = props;

  const [data, setData] = useState<TierListAttrs>(() => {
    try {
      const parsed = JSON.parse(node.attrs.tiers);
      if (parsed && Array.isArray(parsed.tiers)) return parsed;
    } catch { /* fall through to default */ }
    return DEFAULT_TIER_LIST;
  });

  const [dragOverTier, setDragOverTier] = useState<number | null>(null);
  const [itemModal, setItemModal] = useState<{ tierIndex: number; name: string; imageUrl: string } | null>(null);

  const persist = (next: TierListAttrs) => {
    setData(next);
    updateAttributes({ tiers: JSON.stringify(next) });
  };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  // -- Reader view ----------------------------------------------------------
  if (!editor.isEditable) {
    return (
      <NodeViewWrapper className="tier-list-node-wrapper" style={{ isolation: 'isolate' }}>
        <div dangerouslySetInnerHTML={{ __html: renderTierList(data) }} />
      </NodeViewWrapper>
    );
  }

  // -- Editor view helpers --------------------------------------------------
  const setTitle = (title: string) => persist({ ...data, title });

  const addTier = () => {
    const used = new Set(data.tiers.map(t => t.label));
    const nextLabel = TIER_LABELS.find(l => !used.has(l)) ?? 'F';
    persist({ ...data, tiers: [...data.tiers, { label: nextLabel, color: '#6b7280', items: [] }] });
  };

  const removeTier = (tierIdx: number) => {
    if (data.tiers.length <= 1) return;
    persist({ ...data, tiers: data.tiers.filter((_, i) => i !== tierIdx) });
  };

  const updateTier = (tierIdx: number, patch: Partial<TierRow>) => {
    persist({ ...data, tiers: data.tiers.map((t, i) => (i === tierIdx ? { ...t, ...patch } : t)) });
  };

  const removeItem = (tierIdx: number, itemId: string) => {
    persist({
      ...data,
      tiers: data.tiers.map((t, i) => (i === tierIdx ? { ...t, items: t.items.filter(it => it.id !== itemId) } : t)),
    });
  };

  const addItem = (tierIdx: number, item: TierItem) => {
    persist({
      ...data,
      tiers: data.tiers.map((t, i) => (i === tierIdx ? { ...t, items: [...t.items, item] } : t)),
    });
  };

  const moveItem = (sourceTier: number, itemId: string, targetTier: number) => {
    if (sourceTier === targetTier) return;
    const item = data.tiers[sourceTier]?.items.find(it => it.id === itemId);
    if (!item) return;
    persist({
      ...data,
      tiers: data.tiers.map((t, i) => {
        if (i === sourceTier) return { ...t, items: t.items.filter(it => it.id !== itemId) };
        if (i === targetTier) return { ...t, items: [...t.items, item] };
        return t;
      }),
    });
  };

  const handleDragStart = (e: React.DragEvent, sourceTier: number, itemId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ itemId, sourceTier }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, tierIdx: number) => {
    e.preventDefault();
    if (dragOverTier !== tierIdx) setDragOverTier(tierIdx);
  };

  const handleDrop = (e: React.DragEvent, targetTier: number) => {
    e.preventDefault();
    setDragOverTier(null);
    try {
      const { itemId, sourceTier } = JSON.parse(e.dataTransfer.getData('application/json'));
      moveItem(sourceTier, itemId, targetTier);
    } catch { /* ignore malformed drop payload */ }
  };

  const submitItem = () => {
    if (!itemModal) return;
    const name = itemModal.name.trim();
    if (!name) return;
    addItem(itemModal.tierIndex, { id: genId(), name, imageUrl: itemModal.imageUrl.trim() || undefined });
    setItemModal(null);
  };

  return (
    <NodeViewWrapper className="tier-list-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div
        className={cn('rounded-2xl border overflow-hidden transition-all duration-200', selected && 'ring-2 ring-amber-500/60')}
        style={{ background: 'var(--ed-elevated, #0d1527)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {/* Title */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input
            type="text"
            value={data.title}
            onChange={e => setTitle(e.target.value)}
            onFocus={stopProp}
            placeholder="Tier List Title"
            className="w-full bg-transparent text-base font-bold uppercase tracking-wide focus:outline-none"
            style={{ color: 'var(--ed-text, #fff)', fontFamily: 'var(--gc-font-heading, inherit)' }}
          />
        </div>

        {/* Tier rows */}
        <div className="flex flex-col">
          {data.tiers.map((tier, tierIdx) => (
            <div
              key={tierIdx}
              className={cn('flex items-stretch border-b transition-colors', dragOverTier === tierIdx && 'bg-amber-500/10')}
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              onDragOver={e => handleDragOver(e, tierIdx)}
              onDragLeave={() => setDragOverTier(null)}
              onDrop={e => handleDrop(e, tierIdx)}
            >
              {/* Colored label cell */}
              <div className="flex-shrink-0 flex items-center justify-center p-2">
                <div
                  className="flex items-center justify-center rounded-lg font-extrabold text-lg text-white shadow"
                  style={{ width: 48, height: 48, background: tier.color, textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
                >
                  {tier.label}
                </div>
              </div>

              {/* Draggable item area */}
              <div className="flex-1 flex flex-wrap items-center gap-2 p-2" style={{ minHeight: 64 }}>
                {tier.items.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={e => handleDragStart(e, tierIdx, item.id)}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg cursor-grab active:cursor-grabbing"
                    style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <GripVertical className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium" style={{ color: 'var(--ed-text, #fff)' }}>{item.name}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(tierIdx, item.id)}
                      onMouseDown={stopProp}
                      className="text-slate-500 hover:text-red-400 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setItemModal({ tierIndex: tierIdx, name: '', imageUrl: '' })}
                  onMouseDown={stopProp}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-dashed"
                  style={{ color: 'var(--ed-text-muted, #8090a8)', borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  <Plus className="w-3 h-3" /> Add item
                </button>
              </div>

              {/* Tier controls */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-2">
                <input
                  type="color"
                  value={tier.color}
                  onChange={e => updateTier(tierIdx, { color: e.target.value })}
                  onFocus={stopProp}
                  onMouseDown={stopProp}
                  title="Tier color"
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                {data.tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTier(tierIdx)}
                    onMouseDown={stopProp}
                    title="Remove tier"
                    className="text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add tier */}
        <div className="p-2.5">
          <button
            type="button"
            onClick={addTier}
            onMouseDown={stopProp}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-dashed"
            style={{ color: 'var(--ed-text-muted, #8090a8)', borderColor: 'rgba(255,255,255,0.15)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Tier
          </button>
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

      {/* Item add modal */}
      {itemModal && (
        <div
          className="relative z-50 mt-3 p-5 rounded-2xl shadow-2xl backdrop-blur-xl"
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(245,158,11,0.25)' }}
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--ed-text, #fff)' }}>Add Item</h3>
            <button type="button" onClick={() => setItemModal(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>Name</label>
              <input
                type="text"
                value={itemModal.name}
                onChange={e => setItemModal({ ...itemModal, name: e.target.value })}
                onFocus={stopProp}
                placeholder="e.g. Elden Ring"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>Image URL (optional)</label>
              <input
                type="text"
                value={itemModal.imageUrl}
                onChange={e => setItemModal({ ...itemModal, imageUrl: e.target.value })}
                onFocus={stopProp}
                placeholder="https://..."
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setItemModal(null)}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg"
                style={{ color: 'var(--ed-text-muted, #8090a8)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitItem}
                disabled={!itemModal.name.trim()}
                className="px-3 py-1.5 bg-amber-600/90 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

TierListNodeView.displayName = 'TierListNodeView';

// --- Node Definition ----------------------------------------------------------

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tierList: {
      insertTierList: () => ReturnType;
    };
  }
}

export const TierListNode = Node.create({
  name: 'tierList',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      tiers: { default: JSON.stringify(DEFAULT_TIER_LIST) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tier-list"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tier-list' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TierListNodeView);
  },

  addCommands() {
    return {
      insertTierList: () => ({ commands }) => {
        return commands.insertContent({ type: this.name });
      },
    };
  },
});
