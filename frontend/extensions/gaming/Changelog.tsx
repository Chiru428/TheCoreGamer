import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { renderChangelog, ChangelogAttrs } from '../../lib/gaming-block-renderers';
import { History, Plus, X, Trash2, Save, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ChangelogNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as ChangelogAttrs;

  const handleEntryChange = (index: number, field: string, value: any) => {
    const newChanges = [...attrs.changes];
    newChanges[index] = { ...newChanges[index], [field]: value };
    updateAttributes({ changes: newChanges });
  };

  const addEntry = () => {
    updateAttributes({
      changes: [...attrs.changes, { version: 'v1.0', text: 'New update description', type: 'added' }]
    });
  };

  const removeEntry = (index: number) => {
    const newChanges = [...attrs.changes];
    newChanges.splice(index, 1);
    updateAttributes({ changes: newChanges });
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
    <NodeViewWrapper className="changelog-node-wrapper relative group" onMouseDown={handleMouseDown}>
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-lg shadow-lg"
        )}
        dangerouslySetInnerHTML={{ __html: renderChangelog(attrs) }} 
      />

      <div className={cn(
        "absolute top-4 right-4 flex gap-2 transition-opacity duration-200",
        (selected || isEditing) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            onMouseDown={stopProp}
          >
            <Settings2 className="w-4 h-4" />
            Edit Changelog
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-2 bg-green-500/80 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            onMouseDown={stopProp}
          >
            <Save className="w-4 h-4" />
            Done
          </button>
        )}
        <button
          type="button"
          onClick={deleteNode}
          className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md"
          onMouseDown={stopProp}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isEditing && (
        <div 
          className="absolute z-50 top-full left-0 right-0 mt-4 p-6 bg-[#0d1527] border border-cyan-500/30 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2"
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Changelog Configuration</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Changelog Title</label>
              <input
                type="text"
                value={attrs.title}
                onChange={(e) => updateAttributes({ title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                onFocus={stopProp}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">History Entries</label>
                <button 
                  onClick={addEntry}
                  className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                  onMouseDown={stopProp}
                >
                  <Plus className="w-3 h-3" /> Add Entry
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {attrs.changes.map((entry, i) => (
                  <div key={i} className="flex gap-3 items-start bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <div className="w-24 space-y-1">
                      <label className="text-[9px] text-slate-500 uppercase">Version</label>
                      <input
                        type="text"
                        value={entry.version}
                        onChange={(e) => handleEntryChange(i, 'version', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none"
                        onFocus={stopProp}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] text-slate-500 uppercase">Description</label>
                      <textarea
                        value={entry.text}
                        onChange={(e) => handleEntryChange(i, 'text', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none resize-none h-12"
                        onFocus={stopProp}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[9px] text-slate-500 uppercase">Type</label>
                      <select
                        value={entry.type}
                        onChange={(e) => handleEntryChange(i, 'type', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none uppercase font-bold"
                      >
                        <option value="added">Added</option>
                        <option value="fixed">Fixed</option>
                        <option value="changed">Changed</option>
                        <option value="removed">Removed</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => removeEntry(i)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors mt-4"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

export const ChangelogNode = Node.create({
  name: 'changelog',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Changelog' },
      changes: {
        default: [
          { version: 'v2.0', text: 'Major release — complete overhaul', type: 'added' },
          { version: 'v1.9', text: 'Performance improvements and crash fixes', type: 'fixed' },
          { version: 'v1.8', text: 'Updated compatibility for game patch 1.57', type: 'changed' },
          { version: 'v1.5', text: 'Deprecated legacy support', type: 'removed' },
        ],
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="changelog"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          const title = el.querySelector('.patch-version span')?.textContent || 'Changelog';
          const changes = Array.from(el.querySelectorAll('.patch-body p')).map(p => {
            const tag = p.querySelector('.patch-tag');
            let type: 'added' | 'fixed' | 'changed' | 'removed' = 'added';
            if (tag?.classList.contains('fixed')) type = 'fixed';
            else if (tag?.classList.contains('changed')) type = 'changed';
            else if (tag?.classList.contains('removed')) type = 'removed';
            
            return {
              type,
              version: tag?.textContent || '',
              text: p.textContent?.replace(tag?.textContent || '', '').trim() || '',
            };
          });
          return { title, changes };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'changelog' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChangelogNodeView);
  },
});
