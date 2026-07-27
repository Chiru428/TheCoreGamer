import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect } from 'react';
import { renderPatchNotes, PatchNotesAttrs } from '../../lib/gaming-block-renderers';
import { ClipboardList, Plus, X, Trash2, Save, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PatchNotesNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as PatchNotesAttrs;

  // Auto-open edit panel when freshly inserted (version still at default)
  useEffect(() => {
    if (attrs.version === '1.0.0') {
      setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNoteChange = (index: number, field: string, value: any) => {
    const newNotes = [...attrs.notes];
    newNotes[index] = { ...newNotes[index], [field]: value };
    updateAttributes({ notes: newNotes });
  };

  const addNote = () => {
    updateAttributes({
      notes: [...attrs.notes, { type: 'added', text: 'New change description' }]
    });
  };

  const removeNote = (index: number) => {
    const newNotes = [...attrs.notes];
    newNotes.splice(index, 1);
    updateAttributes({ notes: newNotes });
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
    <NodeViewWrapper className="patch-notes-node-wrapper relative group" onMouseDown={handleMouseDown}>
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-lg shadow-lg"
        )}
        dangerouslySetInnerHTML={{ __html: renderPatchNotes(attrs) }} 
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
            Edit Patch Notes
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
              <ClipboardList className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Patch Notes Configuration</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Version</label>
                <input
                  type="text"
                  value={attrs.version}
                  onChange={(e) => updateAttributes({ version: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  onFocus={stopProp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
                <input
                  type="text"
                  value={attrs.date}
                  onChange={(e) => updateAttributes({ date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  onFocus={stopProp}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Changes</label>
                <button 
                  onClick={addNote}
                  className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                  onMouseDown={stopProp}
                >
                  <Plus className="w-3 h-3" /> Add Note
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {attrs.notes.map((n, i) => (
                  <div key={i} className="flex gap-3 items-start bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <select
                      value={n.type}
                      onChange={(e) => handleNoteChange(i, 'type', e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none uppercase font-bold"
                    >
                      <option value="added">Added</option>
                      <option value="fixed">Fixed</option>
                      <option value="changed">Changed</option>
                      <option value="removed">Removed</option>
                    </select>
                    <textarea
                      value={n.text}
                      onChange={(e) => handleNoteChange(i, 'text', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none resize-none min-h-[40px]"
                      onFocus={stopProp}
                    />
                    <button 
                      onClick={() => removeNote(i)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
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
};

export const PatchNotesNode = Node.create({
  name: 'patchNotes',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      version: { default: '1.0.0' },
      date: { default: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
      notes: {
        default: [
          { type: 'added', text: 'New feature description here' },
          { type: 'fixed', text: 'Bug fix description here' },
          { type: 'changed', text: 'Changed behavior description' },
        ],
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="patch-notes"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          const version = el.querySelector('.patch-version span:first-child')?.textContent?.replace('Patch ', '') || '1.0.0';
          const date = el.querySelector('.patch-date')?.textContent || '';
          const notes = Array.from(el.querySelectorAll('.patch-body p')).map(p => {
            const tag = p.querySelector('.patch-tag');
            let type: 'added' | 'fixed' | 'changed' | 'removed' = 'added';
            if (tag?.classList.contains('fixed')) type = 'fixed';
            else if (tag?.classList.contains('changed')) type = 'changed';
            else if (tag?.classList.contains('removed')) type = 'removed';
            
            return {
              type,
              text: p.textContent?.replace(tag?.textContent || '', '').trim() || '',
            };
          });
          return { version, date, notes };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'patch-notes' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PatchNotesNodeView);
  },
});
