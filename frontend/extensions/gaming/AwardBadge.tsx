import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderAwardBadge, AwardBadgeAttrs } from '../../lib/gaming-block-renderers';
import { Trophy, Settings2, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const AWARD_OPTIONS = [
  'Game of the Year',
  "Editor's Choice",
  'Best Story',
  'Best Visuals',
  'Best Audio',
  'Best Multiplayer',
  'Best Indie',
  'Must Play',
] as const;

// --- Node View ----------------------------------------------------------------

const AwardBadgeNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as AwardBadgeAttrs;

  // Auto-open edit panel on first insert
  useEffect(() => {
    if (!attrs.category) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key: keyof AwardBadgeAttrs, value: string) =>
    updateAttributes({ [key]: value });

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (
      e.type === 'mousedown' &&
      !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
    ) e.preventDefault();
  };

  return (
    <NodeViewWrapper className="award-badge-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      {/* Live preview */}
      <div
        className={cn(
          'transition-all duration-200',
          selected && !isEditing && 'ring-2 ring-yellow-500/60 rounded-2xl shadow-lg',
        )}
        dangerouslySetInnerHTML={{ __html: renderAwardBadge(attrs) }}
      />

      {/* Toolbar */}
      <div
        className={cn(
          'absolute top-3 right-3 flex gap-2 z-20 transition-opacity duration-200',
          selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-yellow-400 rounded-lg border border-yellow-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Edit Award
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            onMouseDown={stopProp}
            className="px-3 py-1.5 bg-green-600/90 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
          >
            <Save className="w-3.5 h-3.5" />
            Done
          </button>
        )}
        <button
          type="button"
          onClick={deleteNode}
          onMouseDown={stopProp}
          className="px-2 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Edit panel */}
      {isEditing && (
        <div
          className="relative z-50 mt-3 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(245,197,24,0.25)' }}
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Award Badge</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} onMouseDown={stopProp} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Award Type */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Award Type</label>
              <select
                value={attrs.award ?? 'Game of the Year'}
                onChange={e => set('award', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                {AWARD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Year</label>
              <input
                type="text"
                value={attrs.year ?? ''}
                onChange={e => set('year', e.target.value)}
                placeholder={new Date().getFullYear().toString()}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                onFocus={stopProp}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Category (free text)</label>
              <input
                type="text"
                value={attrs.category ?? ''}
                onChange={e => set('category', e.target.value)}
                placeholder="e.g. Action RPG"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                onFocus={stopProp}
              />
            </div>

            {/* Publisher */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Publisher (optional)</label>
              <input
                type="text"
                value={attrs.publisher ?? ''}
                onChange={e => set('publisher', e.target.value)}
                placeholder="e.g. FromSoftware"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                onFocus={stopProp}
              />
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

AwardBadgeNodeView.displayName = 'AwardBadgeNodeView';

// --- Node Definition ----------------------------------------------------------

export const AwardBadgeNode = Node.create({
  name: 'awardBadge',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      award: { default: 'Game of the Year' },
      year: { default: new Date().getFullYear().toString() },
      category: { default: '' },
      publisher: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="award-badge"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'award-badge' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AwardBadgeNodeView);
  },
});
