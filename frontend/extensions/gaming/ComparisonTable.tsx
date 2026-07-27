import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import {
  renderComparisonTable,
  ComparisonTableAttrs,
  ComparisonColumn,
  ComparisonRow,
  DEFAULT_COMPARISON_TABLE,
} from '../../lib/gaming-block-renderers';
import { Plus, X, Trash2, GripVertical, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

const genId = () => Math.random().toString(36).slice(2, 10);
const MAX_COLUMNS = 6;

const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' } as const;
const labelStyle = { color: 'var(--ed-text-muted, #8090a8)' } as const;

// --- Node View Component ------------------------------------------------------

const ComparisonTableNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode, editor } = props;
  const attrs = node.attrs as ComparisonTableAttrs;
  const columns: ComparisonColumn[] = Array.isArray(attrs.columns) && attrs.columns.length ? attrs.columns : DEFAULT_COMPARISON_TABLE.columns;
  const rows: ComparisonRow[] = Array.isArray(attrs.rows) ? attrs.rows : DEFAULT_COMPARISON_TABLE.rows;

  const [dragColIdx, setDragColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  // -- Reader view ----------------------------------------------------------
  if (!editor.isEditable) {
    return (
      <NodeViewWrapper className="comparison-table-node-wrapper" style={{ isolation: 'isolate' }}>
        <div dangerouslySetInnerHTML={{ __html: renderComparisonTable({ title: attrs.title, columns, rows }) }} />
      </NodeViewWrapper>
    );
  }

  // -- Editor view helpers --------------------------------------------------
  const setTitle = (title: string) => updateAttributes({ title });

  const addColumn = () => {
    if (columns.length >= MAX_COLUMNS) return;
    const newCol: ComparisonColumn = { id: genId(), label: `Option ${columns.length + 1}` };
    const newColumns = [...columns, newCol];
    const newRows = rows.map(r => ({ ...r, values: [...r.values, { columnId: newCol.id, value: '' }] }));
    updateAttributes({ columns: newColumns, rows: newRows });
  };

  const removeColumn = (colId: string) => {
    if (columns.length <= 2) return;
    const newColumns = columns.filter(c => c.id !== colId);
    const newRows = rows.map(r => ({
      ...r,
      values: r.values.filter(v => v.columnId !== colId),
      winnerColumnId: r.winnerColumnId === colId ? undefined : r.winnerColumnId,
    }));
    updateAttributes({ columns: newColumns, rows: newRows });
  };

  const updateColumn = (colId: string, patch: Partial<ComparisonColumn>) => {
    updateAttributes({ columns: columns.map(c => (c.id === colId ? { ...c, ...patch } : c)) });
  };

  const addRow = () => {
    const newRow: ComparisonRow = {
      id: genId(),
      label: `Feature ${rows.length + 1}`,
      values: columns.map(c => ({ columnId: c.id, value: '' })),
    };
    updateAttributes({ rows: [...rows, newRow] });
  };

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) return;
    updateAttributes({ rows: rows.filter(r => r.id !== rowId) });
  };

  const updateRow = (rowId: string, patch: Partial<ComparisonRow>) => {
    updateAttributes({ rows: rows.map(r => (r.id === rowId ? { ...r, ...patch } : r)) });
  };

  const updateCell = (rowId: string, colId: string, value: string) => {
    updateAttributes({
      rows: rows.map(r => {
        if (r.id !== rowId) return r;
        const hasCell = r.values.some(v => v.columnId === colId);
        const values = hasCell
          ? r.values.map(v => (v.columnId === colId ? { ...v, value } : v))
          : [...r.values, { columnId: colId, value }];
        return { ...r, values };
      }),
    });
  };

  // -- Column drag-to-reorder ------------------------------------------------
  const handleColDragStart = (e: React.DragEvent, idx: number) => {
    setDragColIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragOverColIdx !== idx) setDragOverColIdx(idx);
  };

  const handleColDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    setDragOverColIdx(null);
    if (dragColIdx === null || dragColIdx === targetIdx) return;
    const newColumns = [...columns];
    const [moved] = newColumns.splice(dragColIdx, 1);
    newColumns.splice(targetIdx, 0, moved);
    updateAttributes({ columns: newColumns });
    setDragColIdx(null);
  };

  const gridCols = `minmax(120px,1fr) repeat(${columns.length}, minmax(110px,1fr))`;

  return (
    <NodeViewWrapper className="comparison-table-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div
        className={cn('rounded-2xl border overflow-hidden transition-all duration-200', selected && 'ring-2 ring-blue-500/60')}
        style={{ background: 'var(--ed-elevated, #0d1527)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {/* Title */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input
            type="text"
            value={attrs.title ?? ''}
            onChange={e => setTitle(e.target.value)}
            onFocus={stopProp}
            placeholder="Comparison Title"
            className="w-full bg-transparent text-base font-bold uppercase tracking-wide focus:outline-none"
            style={{ color: 'var(--ed-text, #fff)', fontFamily: 'var(--gc-font-heading, inherit)' }}
          />
        </div>

        {/* Table grid */}
        <div className="overflow-x-auto p-3">
          <div className="grid gap-2" style={{ gridTemplateColumns: gridCols, minWidth: 480 }}>
            {/* Corner cell */}
            <div />

            {/* Column headers */}
            {columns.map((col, ci) => (
              <div
                key={col.id}
                draggable
                onDragStart={e => handleColDragStart(e, ci)}
                onDragOver={e => handleColDragOver(e, ci)}
                onDrop={e => handleColDrop(e, ci)}
                onDragEnd={() => { setDragColIdx(null); setDragOverColIdx(null); }}
                className={cn('rounded-lg p-2 flex flex-col gap-1.5 cursor-grab active:cursor-grabbing', dragOverColIdx === ci && 'ring-1 ring-blue-400')}
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="flex items-center gap-1">
                  <GripVertical className="w-3 h-3 flex-shrink-0" style={labelStyle} />
                  <input
                    type="text"
                    value={col.label}
                    onChange={e => updateColumn(col.id, { label: e.target.value })}
                    onFocus={stopProp}
                    placeholder="Column label"
                    className="flex-1 bg-transparent text-xs font-bold focus:outline-none"
                    style={{ color: 'var(--ed-text, #fff)' }}
                  />
                  {columns.length > 2 && (
                    <button type="button" onClick={() => removeColumn(col.id)} onMouseDown={stopProp} className="text-slate-500 hover:text-red-400 flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={col.imageUrl ?? ''}
                  onChange={e => updateColumn(col.id, { imageUrl: e.target.value })}
                  onFocus={stopProp}
                  placeholder="Image URL (optional)"
                  className="w-full bg-transparent text-[10px] font-mono focus:outline-none rounded px-1.5 py-1"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--ed-text-muted, #8090a8)' }}
                />
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={labelStyle}>
                  <input
                    type="checkbox"
                    checked={!!col.isWinner}
                    onChange={e => updateColumn(col.id, { isWinner: e.target.checked })}
                    onMouseDown={stopProp}
                  />
                  Winner column
                </label>
              </div>
            ))}

            {/* Rows */}
            {rows.map(row => (
              <React.Fragment key={row.id}>
                <div
                  className="rounded-lg p-2 flex flex-col gap-1.5"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={row.label}
                      onChange={e => updateRow(row.id, { label: e.target.value })}
                      onFocus={stopProp}
                      placeholder="Row label"
                      className="flex-1 bg-transparent text-xs font-bold focus:outline-none"
                      style={{ color: 'var(--ed-text, #fff)' }}
                    />
                    {rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(row.id)} onMouseDown={stopProp} className="text-slate-500 hover:text-red-400 flex-shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={labelStyle}>
                    <Crown className="w-3 h-3" />
                    <select
                      value={row.winnerColumnId ?? ''}
                      onChange={e => updateRow(row.id, { winnerColumnId: e.target.value || undefined })}
                      onFocus={stopProp}
                      className="flex-1 bg-transparent text-[10px] focus:outline-none rounded px-1 py-0.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--ed-text, #fff)' }}
                    >
                      <option value="">Mark winner…</option>
                      {columns.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {columns.map(col => {
                  const cell = row.values.find(v => v.columnId === col.id);
                  const isWinner = row.winnerColumnId === col.id;
                  return (
                    <input
                      key={col.id}
                      type="text"
                      value={cell?.value ?? ''}
                      onChange={e => updateCell(row.id, col.id, e.target.value)}
                      onFocus={stopProp}
                      placeholder="Value"
                      className={cn('rounded-lg px-2 py-2 text-xs text-center focus:outline-none', isWinner && 'font-bold')}
                      style={{
                        background: isWinner ? 'color-mix(in srgb, var(--gc-success, #22c55e) 12%, var(--ed-input-bg, #0a0f1e))' : 'var(--ed-input-bg, #0a0f1e)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--ed-input-text, #fff)',
                      }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Add row / column controls */}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={addRow}
              onMouseDown={stopProp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed"
              style={{ color: 'var(--ed-text-muted, #8090a8)', borderColor: 'rgba(255,255,255,0.15)' }}
            >
              <Plus className="w-3 h-3" /> Add row
            </button>
            {columns.length < MAX_COLUMNS && (
              <button
                type="button"
                onClick={addColumn}
                onMouseDown={stopProp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed"
                style={{ color: 'var(--ed-text-muted, #8090a8)', borderColor: 'rgba(255,255,255,0.15)' }}
              >
                <Plus className="w-3 h-3" /> Add column
              </button>
            )}
          </div>
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
    </NodeViewWrapper>
  );
});

ComparisonTableNodeView.displayName = 'ComparisonTableNodeView';

// --- Node Definition ----------------------------------------------------------

export const ComparisonTableNode = Node.create({
  name: 'comparisonTable',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: DEFAULT_COMPARISON_TABLE.title },
      columns: { default: DEFAULT_COMPARISON_TABLE.columns },
      rows: { default: DEFAULT_COMPARISON_TABLE.rows },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="comparison-table"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'comparison-table' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ComparisonTableNodeView);
  },
});
