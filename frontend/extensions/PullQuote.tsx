import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { Quote, Trash2, Settings2, Save, X } from 'lucide-react';
import { renderPullQuote, PullQuoteAttrs } from '../lib/gaming-block-renderers';
import { cn } from '@/lib/utils';

const PullQuoteNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as PullQuoteAttrs;

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  return (
    <NodeViewWrapper
      className="pull-quote-node-wrapper relative group my-6"
      onMouseDown={(e: React.MouseEvent) => {
        if (isEditing) {
          e.stopPropagation();
          if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) e.preventDefault();
        }
      }}
    >
      {/* Preview */}
      <div
        className={cn('transition-all duration-200', selected && !isEditing ? 'ring-2 ring-cyan-500 rounded-xl shadow-lg shadow-cyan-500/20' : '')}
        dangerouslySetInnerHTML={{ __html: renderPullQuote(attrs) }}
      />

      {/* Controls */}
      <div className={cn('absolute top-2 right-2 flex gap-2 transition-opacity duration-200', (selected || isEditing) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} className="p-2 bg-slate-900/80 hover:bg-slate-800 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider" onMouseDown={stopProp}>
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
        <div className="absolute z-50 top-full left-0 right-0 mt-4 p-6 bg-[#0d1527] border border-cyan-500/30 rounded-xl shadow-2xl backdrop-blur-xl" onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Quote className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Pull Quote</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white" onMouseDown={stopProp}><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quote Text</label>
              <textarea
                value={attrs.quote}
                onChange={e => updateAttributes({ quote: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none h-24"
                placeholder="Enter the pull quote…"
                onFocus={stopProp}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attribution</label>
                <input type="text" value={attrs.attribution} onChange={e => updateAttributes({ attribution: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50" placeholder="Person's name" onFocus={stopProp} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role / Context</label>
                <input type="text" value={attrs.role} onChange={e => updateAttributes({ role: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50" placeholder="Game Director, Lead Dev…" onFocus={stopProp} />
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

PullQuoteNodeView.displayName = 'PullQuoteNodeView';

export const PullQuoteNode = Node.create({
  name: 'pullQuote',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      quote: { default: '' },
      attribution: { default: '' },
      role: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'blockquote[data-type="pull-quote"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          return {
            quote: (el as HTMLElement).querySelector('.pull-quote-text')?.textContent || '',
            attribution: (el as HTMLElement).querySelector('.pull-quote-attribution')?.textContent || '',
            role: (el as HTMLElement).querySelector('.pull-quote-role')?.textContent || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(HTMLAttributes, { 'data-type': 'pull-quote' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PullQuoteNodeView);
  },
});
