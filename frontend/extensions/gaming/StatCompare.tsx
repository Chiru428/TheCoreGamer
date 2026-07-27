import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderStatCompare, StatCompareAttrs } from '../../lib/gaming-block-renderers';
import { BarChart2, Settings2, Trash2, Save, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatRow = { label: string; values: string[]; winnerIndex?: number };

// --- Node View ----------------------------------------------------------------

const StatCompareNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as StatCompareAttrs;

  // Hydrate local arrays from attrs (stored as JSON strings in the node)
  const [localHeaders, setLocalHeaders] = useState<string[]>(() => {
    try { return JSON.parse(attrs.headers as unknown as string); } catch { return attrs.headers ?? []; }
  });
  const [localRows, setLocalRows] = useState<StatRow[]>(() => {
    try { return JSON.parse(attrs.rows as unknown as string); } catch { return attrs.rows ?? []; }
  });
  const [title, setTitle] = useState(attrs.title ?? '');
  const [highlightWinner, setHighlightWinner] = useState(attrs.highlightWinner !== false);

  // Open on first insert
  useEffect(() => {
    if (!localHeaders.length) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => {
    updateAttributes({
      title,
      headers: JSON.stringify(localHeaders),
      rows: JSON.stringify(localRows),
      highlightWinner,
    });
  };

  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  // Build preview-compatible attrs (parse JSON arrays back)
  const previewAttrs: StatCompareAttrs = {
    title,
    headers: localHeaders,
    rows: localRows,
    highlightWinner,
  };

  const addHeader = () => setLocalHeaders([...localHeaders, `Col ${localHeaders.length + 1}`]);
  const removeHeader = (i: number) => {
    setLocalHeaders(localHeaders.filter((_, idx) => idx !== i));
    setLocalRows(localRows.map(r => ({
      ...r,
      values: r.values.filter((_, vi) => vi !== i),
      winnerIndex: r.winnerIndex === i ? undefined : r.winnerIndex !== undefined && r.winnerIndex > i ? r.winnerIndex - 1 : r.winnerIndex,
    })));
  };
  const updateHeader = (i: number, v: string) => { const h = [...localHeaders]; h[i] = v; setLocalHeaders(h); };

  const addRow = () => setLocalRows([...localRows, { label: 'Stat', values: localHeaders.map(() => '—') }]);
  const removeRow = (i: number) => setLocalRows(localRows.filter((_, idx) => idx !== i));
  const updateRowLabel = (i: number, v: string) => {
    const r = localRows.map((row, idx) => idx === i ? { ...row, label: v } : row);
    setLocalRows(r);
  };
  const updateRowValue = (ri: number, vi: number, v: string) => {
    const r = localRows.map((row, idx) => idx === ri ? { ...row, values: row.values.map((val, vidx) => vidx === vi ? v : val) } : row);
    setLocalRows(r);
  };
  const setWinner = (ri: number, wi: number | undefined) => {
    const r = localRows.map((row, idx) => idx === ri ? { ...row, winnerIndex: wi } : row);
    setLocalRows(r);
  };

  return (
    <NodeViewWrapper className="stat-compare-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div
        className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-cyan-500/60 rounded-2xl shadow-lg')}
        dangerouslySetInnerHTML={{ __html: renderStatCompare(previewAttrs) }}
      />

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
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
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(0,229,255,0.2)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Stat Comparison</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {/* Title */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Table Title (optional)</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Platform Comparison"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                onFocus={stopProp} />
            </div>

            {/* Highlight winner toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={highlightWinner} onChange={e => setHighlightWinner(e.target.checked)}
                className="accent-cyan-500 w-4 h-4" />
              <span className="text-sm text-slate-300">Highlight winner per row</span>
            </label>

            {/* Column headers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Column Headers (2–4)</label>
                {localHeaders.length < 4 && (
                  <button type="button" onClick={addHeader} className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded">
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {localHeaders.map((h, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="text" value={h} onChange={e => updateHeader(i, e.target.value)}
                      className="rounded px-2 py-1 text-xs focus:outline-none w-28"
                      style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      onFocus={stopProp} />
                    {localHeaders.length > 2 && (
                      <button type="button" onClick={() => removeHeader(i)} className="text-slate-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Rows</label>
                <button type="button" onClick={addRow} className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2">
                {localRows.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-2 flex-wrap">
                    <input type="text" value={row.label} onChange={e => updateRowLabel(ri, e.target.value)}
                      placeholder="Stat name"
                      className="rounded px-2 py-1 text-xs focus:outline-none w-28 shrink-0"
                      style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc' }}
                      onFocus={stopProp} />
                    {localHeaders.map((_, vi) => (
                      <input key={vi} type="text" value={row.values[vi] ?? ''}
                        onChange={e => updateRowValue(ri, vi, e.target.value)}
                        placeholder={localHeaders[vi]}
                        className="rounded px-2 py-1 text-xs focus:outline-none w-20"
                        style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: `1px solid ${row.winnerIndex === vi ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.1)'}`, color: '#fff' }}
                        onFocus={stopProp} />
                    ))}
                    {highlightWinner && (
                      <select value={row.winnerIndex ?? ''} onChange={e => setWinner(ri, e.target.value === '' ? undefined : parseInt(e.target.value))}
                        className="rounded px-1 py-1 text-[10px] focus:outline-none"
                        style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(0,229,255,0.3)', color: 'var(--ed-accent, #00e5ff)' }}>
                        <option value="">No winner</option>
                        {localHeaders.map((h, i) => <option key={i} value={i}>{h} ▲</option>)}
                      </select>
                    )}
                    <button type="button" onClick={() => removeRow(ri)} className="text-slate-500 hover:text-red-400"><X className="w-3 h-3" /></button>
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

StatCompareNodeView.displayName = 'StatCompareNodeView';

// --- Node Definition ----------------------------------------------------------

export const StatCompareNode = Node.create({
  name: 'statCompare',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: '' },
      headers: { default: JSON.stringify(['PS5', 'Xbox Series X', 'PC']) },
      rows: { default: JSON.stringify([
        { label: 'Resolution', values: ['4K', '4K', '4K+'], winnerIndex: 2 },
        { label: 'Frame Rate', values: ['60fps', '60fps', '120fps'], winnerIndex: 2 },
      ]) },
      highlightWinner: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="stat-compare"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'stat-compare' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StatCompareNodeView);
  },
});
