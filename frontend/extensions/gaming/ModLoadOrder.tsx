import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderModLoadOrder, ModLoadOrderAttrs } from '../../lib/gaming-block-renderers';
import { List, Settings2, Trash2, Save, X, Plus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModEntry {
  position: number;
  modName: string;
  author?: string;
  notes?: string;
  conflictWarning?: string;
  required: boolean;
}

// --- Node View ----------------------------------------------------------------

const ModLoadOrderNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as ModLoadOrderAttrs;

  const [title, setTitle] = useState(attrs.title ?? 'Mod Load Order');
  const [gameVersion, setGameVersion] = useState(attrs.gameVersion ?? '');
  const [entries, setEntries] = useState<ModEntry[]>(() => {
    try {
      const p = JSON.parse(attrs.entries as unknown as string);
      return Array.isArray(p) ? p : [];
    } catch { return Array.isArray(attrs.entries) ? (attrs.entries as unknown as ModEntry[]) : []; }
  });

  useEffect(() => {
    if (entries.length === 0) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => {
    const renumbered = entries.map((e, i) => ({ ...e, position: i + 1 }));
    updateAttributes({
      title, gameVersion,
      totalMods: renumbered.length,
      entries: JSON.stringify(renumbered),
    });
  };

  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const addEntry = () => setEntries(prev => [...prev, {
    position: prev.length + 1, modName: 'Mod Name', author: '', notes: '', conflictWarning: '', required: false,
  }]);
  const removeEntry = (i: number) => setEntries(prev => prev.filter((_, idx) => idx !== i));
  const updateEntry = (i: number, key: keyof ModEntry, val: string | boolean) =>
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));

  const previewAttrs: ModLoadOrderAttrs = {
    title, gameVersion,
    totalMods: entries.length,
    entries: entries.map((e, i) => ({ ...e, position: i + 1 })),
  };

  const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

  return (
    <NodeViewWrapper className="mod-load-order-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-slate-500/50 rounded-xl shadow-lg')}
        dangerouslySetInnerHTML={{ __html: renderModLoadOrder(previewAttrs) }} />

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-600/50 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
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
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(100,116,139,0.3)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-slate-300" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Mod Load Order</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Title</p>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle} onFocus={stopProp} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Game Version</p>
                <input type="text" value={gameVersion} onChange={e => setGameVersion(e.target.value)}
                  placeholder="e.g. v1.6.0" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle} onFocus={stopProp} />
              </div>
            </div>

            <div className="space-y-3">
              {entries.map((entry, i) => (
                <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-500">#{i + 1}</span>
                    <button type="button" onClick={() => removeEntry(i)} onMouseDown={stopProp}
                      className="p-1 text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Mod Name</p>
                      <input type="text" value={entry.modName} onChange={e => updateEntry(i, 'modName', e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                        style={inputStyle} onFocus={stopProp} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Author (optional)</p>
                      <input type="text" value={entry.author ?? ''} onChange={e => updateEntry(i, 'author', e.target.value)}
                        placeholder="e.g. modauthor99" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                        style={inputStyle} onFocus={stopProp} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Notes (optional)</p>
                    <input type="text" value={entry.notes ?? ''} onChange={e => updateEntry(i, 'notes', e.target.value)}
                      placeholder="e.g. Load after XYZ patch" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={inputStyle} onFocus={stopProp} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-amber-400" /> Conflict Warning (optional)
                    </p>
                    <input type="text" value={entry.conflictWarning ?? ''} onChange={e => updateEntry(i, 'conflictWarning', e.target.value)}
                      placeholder="e.g. Conflicts with BetterAI if loaded before it"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ ...inputStyle, border: '1px solid rgba(251,191,36,0.2)' }} onFocus={stopProp} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer" onMouseDown={stopProp}>
                    <input type="checkbox" checked={entry.required} onChange={e => updateEntry(i, 'required', e.target.checked)}
                      className="w-3.5 h-3.5 accent-cyan-400" />
                    <span className="text-xs text-slate-300">Required mod (shows Required badge)</span>
                  </label>
                </div>
              ))}
            </div>

            <button type="button" onClick={addEntry} onMouseDown={stopProp}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-slate-300 hover:text-white transition-colors"
              style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(100,116,139,0.4)' }}>
              <Plus className="w-4 h-4" /> Add Mod Entry
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

ModLoadOrderNodeView.displayName = 'ModLoadOrderNodeView';

// --- Node Definition ----------------------------------------------------------

export const ModLoadOrderNode = Node.create({
  name: 'modLoadOrder',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Mod Load Order' },
      gameVersion: { default: '' },
      totalMods: { default: 0 },
      entries: { default: JSON.stringify([]) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mod-load-order"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mod-load-order' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ModLoadOrderNodeView);
  },
});
