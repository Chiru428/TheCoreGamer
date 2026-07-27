import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { Eye, EyeOff, Trash2, Settings2, Save, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpoilerBlockAttrs {
  label: string;
  content: string;
}

const SpoilerNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [revealed, setRevealed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as SpoilerBlockAttrs;

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  return (
    <NodeViewWrapper className="spoiler-node-wrapper relative group my-4" onMouseDown={(e: React.MouseEvent) => { if (isEditing) { e.stopPropagation(); if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) e.preventDefault(); } }}>
      {/* Preview */}
      <div className={cn('transition-all duration-200 rounded-xl overflow-hidden border', selected && !isEditing ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20' : '', 'border-purple-500/30 bg-purple-950/20')}>
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-purple-900/20 border-b border-purple-500/20">
          <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-sm font-semibold text-purple-300 flex-1">{attrs.label || '⚠ Spoiler — tap to reveal'}</span>
          <button
            type="button"
            onClick={() => setRevealed(r => !r)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold transition-colors"
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {revealed ? 'Hide' : 'Reveal'}
          </button>
        </div>
        {/* Content */}
        <div className={cn('transition-all duration-300 px-5', revealed ? 'py-4 opacity-100 max-h-96' : 'py-0 opacity-0 max-h-0 overflow-hidden')}>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">{attrs.content || 'Spoiler content goes here…'}</p>
        </div>
        {!revealed && (
          <div className="py-3 px-5 text-xs text-purple-400/60 italic text-center select-none">
            Content hidden — click Reveal to read
          </div>
        )}
      </div>

      {/* Editor controls */}
      <div className={cn('absolute top-3 right-3 flex gap-2 transition-opacity duration-200', (selected || isEditing) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} className="p-2 bg-slate-900/80 hover:bg-slate-800 text-purple-400 rounded-lg border border-purple-500/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider" onMouseDown={stopProp}>
            <Settings2 className="w-4 h-4" /> Edit
          </button>
        ) : (
          <button type="button" onClick={() => setIsEditing(false)} className="p-2 bg-green-500/80 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider" onMouseDown={stopProp}>
            <Save className="w-4 h-4" /> Done
          </button>
        )}
        <button type="button" onClick={deleteNode} className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md" onMouseDown={stopProp}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Edit panel */}
      {isEditing && (
        <div className="absolute z-50 top-full left-0 right-0 mt-4 p-6 bg-[#0d1527] border border-purple-500/30 rounded-xl shadow-2xl backdrop-blur-xl" onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Spoiler Configuration</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white" onMouseDown={stopProp}><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Warning Label</label>
              <input
                type="text"
                value={attrs.label}
                onChange={e => updateAttributes({ label: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                placeholder="⚠ Spoiler — tap to reveal"
                onFocus={stopProp}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hidden Content</label>
              <textarea
                value={attrs.content}
                onChange={e => updateAttributes({ content: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50 resize-none h-28"
                placeholder="Enter the spoiler content that will be hidden…"
                onFocus={stopProp}
              />
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

SpoilerNodeView.displayName = 'SpoilerNodeView';

export const SpoilerBlockNode = Node.create({
  name: 'spoilerBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: '⚠ Spoiler — tap to reveal' },
      content: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="spoiler-block"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          const label = el.querySelector('.spoiler-label')?.textContent || '⚠ Spoiler — tap to reveal';
          const content = el.querySelector('.spoiler-content')?.textContent || '';
          return { label, content };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'spoiler-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpoilerNodeView);
  },
});
