import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import {
  renderAchievementBlock,
  AchievementBlockAttrs,
  TrophyType,
  DEFAULT_ACHIEVEMENT_BLOCK,
} from '../../lib/gaming-block-renderers';
import { Trophy, X, Settings2, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const TROPHY_TYPES: TrophyType[] = ['bronze', 'silver', 'gold', 'platinum'];

const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' } as const;
const labelStyle = { color: 'var(--ed-text-muted, #8090a8)' } as const;

// --- Node View Component ------------------------------------------------------

const AchievementBlockNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as AchievementBlockAttrs;

  // Auto-open edit panel when freshly inserted (name still has default value)
  useEffect(() => {
    if (attrs.name === DEFAULT_ACHIEVEMENT_BLOCK.name) {
      setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key: keyof AchievementBlockAttrs, value: any) => {
    updateAttributes({ [key]: value });
  };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) {
      e.stopPropagation();
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
      }
    }
  };

  return (
    <NodeViewWrapper
      className="achievement-block-node-wrapper relative group"
      style={{ isolation: 'isolate' }}
      onMouseDown={handleMouseDown}
    >
      {/* Rendered card */}
      <div
        className={cn(
          'transition-all duration-200',
          selected && !isEditing && 'ring-2 ring-blue-500 rounded-2xl shadow-lg'
        )}
        dangerouslySetInnerHTML={{ __html: renderAchievementBlock(attrs) }}
      />

      {/* Floating toolbar */}
      <div
        className={cn(
          'absolute top-3 right-3 flex gap-2 z-20 transition-opacity duration-200',
          selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            onMouseDown={stopProp}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 bg-green-600/90 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            onMouseDown={stopProp}
          >
            <Save className="w-3.5 h-3.5" />
            Done
          </button>
        )}
        <button
          type="button"
          onClick={deleteNode}
          className="px-2 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md"
          onMouseDown={stopProp}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Edit panel */}
      {isEditing && (
        <div
          className="relative z-50 mt-3 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(0,229,255,0.2)' }}
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--ed-text, #fff)' }}>Achievement Configuration</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} onMouseDown={stopProp} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={labelStyle}>Trophy Type</label>
                <select
                  value={attrs.trophyType ?? 'bronze'}
                  onChange={e => handleChange('trophyType', e.target.value as TrophyType)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                >
                  {TROPHY_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={labelStyle}>Trophy Name</label>
                <input
                  type="text"
                  value={attrs.name ?? ''}
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={stopProp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={labelStyle}>Game / Description</label>
                <textarea
                  value={attrs.description ?? ''}
                  onChange={e => handleChange('description', e.target.value)}
                  rows={3}
                  placeholder="How to unlock this achievement…"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                  style={inputStyle}
                  onFocus={stopProp}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={labelStyle}>Difficulty</label>
                  <select
                    value={attrs.difficulty ?? 1}
                    onChange={e => handleChange('difficulty', parseInt(e.target.value))}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={inputStyle}
                  >
                    {[1, 2, 3, 4, 5].map(d => (
                      <option key={d} value={d}>{'★'.repeat(d)}{'☆'.repeat(5 - d)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={labelStyle}>XP / Points</label>
                  <input
                    type="number"
                    min={0}
                    value={attrs.xpValue ?? 0}
                    onChange={e => handleChange('xpValue', parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={stopProp}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={labelStyle}>Tips</label>
                <textarea
                  value={attrs.tips ?? ''}
                  onChange={e => handleChange('tips', e.target.value)}
                  rows={5}
                  placeholder="Tips for earning this achievement…"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                  style={inputStyle}
                  onFocus={stopProp}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--ed-text, #fff)' }}>
                <input
                  type="checkbox"
                  checked={!!attrs.hasSpoiler}
                  onChange={e => handleChange('hasSpoiler', e.target.checked)}
                  onMouseDown={stopProp}
                />
                Hide tips behind spoiler toggle
              </label>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

AchievementBlockNodeView.displayName = 'AchievementBlockNodeView';

// --- Node Definition ----------------------------------------------------------

export const AchievementBlockNode = Node.create({
  name: 'achievementBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      trophyType: { default: DEFAULT_ACHIEVEMENT_BLOCK.trophyType },
      name: { default: DEFAULT_ACHIEVEMENT_BLOCK.name },
      description: { default: DEFAULT_ACHIEVEMENT_BLOCK.description },
      difficulty: { default: DEFAULT_ACHIEVEMENT_BLOCK.difficulty },
      xpValue: { default: DEFAULT_ACHIEVEMENT_BLOCK.xpValue },
      tips: { default: DEFAULT_ACHIEVEMENT_BLOCK.tips },
      hasSpoiler: { default: DEFAULT_ACHIEVEMENT_BLOCK.hasSpoiler },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="achievement-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'achievement-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AchievementBlockNodeView);
  },
});
