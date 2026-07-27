import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { AlertCircle, Trash2, Settings2, Save, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CorrectionNoticeAttrs {
  originalText: string;
  correctionText: string;
  correctedAt: string;
  disclosureLabel: string;
}

const CorrectionNoticeNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as CorrectionNoticeAttrs;

  const displayDate = attrs.correctedAt
    ? new Date(attrs.correctedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  return (
    <NodeViewWrapper className="correction-node-wrapper relative group my-4" onMouseDown={(e: React.MouseEvent) => { if (isEditing) { e.stopPropagation(); if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) e.preventDefault(); } }}>
      <div className={cn('rounded-xl border overflow-hidden transition-all duration-200', selected && !isEditing ? 'ring-2 ring-amber-500 shadow-lg shadow-amber-500/20' : '', 'border-amber-500/30 bg-amber-950/10')}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-900/20 border-b border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-amber-300 uppercase tracking-widest flex-1">Correction</span>
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70">
            <Clock className="w-3 h-3" />
            <span>{displayDate}</span>
          </div>
        </div>
        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {attrs.originalText && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-red-400/70 block mb-1">Previously stated:</span>
              <p className="text-sm text-red-400/70 line-through leading-relaxed">{attrs.originalText}</p>
            </div>
          )}
          {attrs.correctionText && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-green-400/70 block mb-1">Corrected to:</span>
              <p className="text-sm text-green-400 leading-relaxed">{attrs.correctionText}</p>
            </div>
          )}
          {attrs.disclosureLabel && (
            <p className="text-[10px] text-amber-400/50 italic border-t border-amber-500/10 pt-2">{attrs.disclosureLabel}</p>
          )}
        </div>
      </div>

      {/* Editor controls */}
      <div className={cn('absolute top-2 right-12 flex gap-2 transition-opacity duration-200', (selected || isEditing) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} className="p-2 bg-slate-900/80 hover:bg-slate-800 text-amber-400 rounded-lg border border-amber-500/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider" onMouseDown={stopProp}>
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
        <div className="absolute z-50 top-full left-0 right-0 mt-4 p-6 bg-[#0d1527] border border-amber-500/30 rounded-xl shadow-2xl backdrop-blur-xl" onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Correction Configuration</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white" onMouseDown={stopProp}><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider">Original (incorrect) text</label>
              <textarea
                value={attrs.originalText}
                onChange={e => updateAttributes({ originalText: e.target.value })}
                className="w-full bg-slate-900 border border-red-900/40 rounded-lg px-4 py-2 text-red-300 text-sm focus:outline-none focus:border-red-500/50 resize-none h-20"
                placeholder="The text that was incorrect…"
                onFocus={stopProp}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-green-400/70 uppercase tracking-wider">Correction</label>
              <textarea
                value={attrs.correctionText}
                onChange={e => updateAttributes({ correctionText: e.target.value })}
                className="w-full bg-slate-900 border border-green-900/40 rounded-lg px-4 py-2 text-green-300 text-sm focus:outline-none focus:border-green-500/50 resize-none h-20"
                placeholder="The corrected information…"
                onFocus={stopProp}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Correction Date/Time</label>
                <input
                  type="datetime-local"
                  value={attrs.correctedAt ? attrs.correctedAt.slice(0, 16) : new Date().toISOString().slice(0, 16)}
                  onChange={e => updateAttributes({ correctedAt: new Date(e.target.value).toISOString() })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  onFocus={stopProp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">FTC Disclosure (optional)</label>
                <input
                  type="text"
                  value={attrs.disclosureLabel}
                  onChange={e => updateAttributes({ disclosureLabel: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="Correction: An earlier version of this article stated…"
                  onFocus={stopProp}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

CorrectionNoticeNodeView.displayName = 'CorrectionNoticeNodeView';

export const CorrectionNoticeNode = Node.create({
  name: 'correctionNotice',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      originalText: { default: '' },
      correctionText: { default: '' },
      correctedAt: { default: new Date().toISOString() },
      disclosureLabel: { default: 'Correction: An earlier version of this article misstated the above information. We regret the error.' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="correction-notice"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          return {
            originalText: (el as HTMLElement).querySelector('.correction-original')?.textContent || '',
            correctionText: (el as HTMLElement).querySelector('.correction-text')?.textContent || '',
            correctedAt: (el as HTMLElement).getAttribute('data-corrected-at') || new Date().toISOString(),
            disclosureLabel: (el as HTMLElement).querySelector('.correction-disclosure')?.textContent || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'correction-notice' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CorrectionNoticeNodeView);
  },
});
