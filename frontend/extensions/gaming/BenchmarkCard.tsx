import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderBenchmarkCard, BenchmarkCardAttrs } from '../../lib/gaming-block-renderers';
import { BarChart, Plus, X, Trash2, Save, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const BenchmarkCardNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as BenchmarkCardAttrs;

  // Auto-open edit panel when freshly inserted (default title not yet changed)
  useEffect(() => {
    if (attrs.title === 'Performance Benchmarks') {
      setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ title: e.target.value });
  };

  const handleBenchmarkChange = (index: number, key: 'label' | 'value' | 'percentage', val: string | number) => {
    const newBenchmarks = [...attrs.benchmarks];
    newBenchmarks[index] = { ...newBenchmarks[index], [key]: val };
    updateAttributes({ benchmarks: newBenchmarks });
  };

  const addBenchmark = () => {
    updateAttributes({ benchmarks: [...attrs.benchmarks, { label: 'New Metric', value: '60 FPS', percentage: 50 }] });
  };

  const removeBenchmark = (index: number) => {
    const newBenchmarks = [...attrs.benchmarks];
    newBenchmarks.splice(index, 1);
    updateAttributes({ benchmarks: newBenchmarks });
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
    <NodeViewWrapper className="benchmark-card-node-wrapper relative group" onMouseDown={handleMouseDown}>
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-lg shadow-lg"
        )}
        dangerouslySetInnerHTML={{ __html: renderBenchmarkCard(attrs) }} 
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
            Edit Benchmarks
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
              <BarChart className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Benchmark Configuration</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={attrs.title}
                onChange={handleTitleChange}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/30"
                onFocus={stopProp}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-slate-600 uppercase">Metrics</label>
                <button onClick={addBenchmark} className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {attrs.benchmarks.map((b: any, i: number) => (
                  <div key={i} className="flex gap-2 group/row items-center">
                    <input
                      type="text"
                      value={b.label}
                      onChange={(e) => handleBenchmarkChange(i, 'label', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none w-1/3"
                      placeholder="Label"
                      onFocus={stopProp}
                    />
                    <input
                      type="text"
                      value={b.value}
                      onChange={(e) => handleBenchmarkChange(i, 'value', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none w-1/4"
                      placeholder="Value"
                      onFocus={stopProp}
                    />
                    <div className="flex items-center gap-1 w-1/4">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={b.percentage}
                        onChange={(e) => handleBenchmarkChange(i, 'percentage', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none"
                        onFocus={stopProp}
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                    <button onClick={() => removeBenchmark(i)} className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
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

export const BenchmarkCardNode = Node.create({
  name: 'benchmarkCard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Performance Benchmarks' },
      benchmarks: { 
        default: [
          { label: '4K Ultra (Native)', value: '45 FPS', percentage: 45 },
          { label: '4K Ultra (DLSS Performance)', value: '82 FPS', percentage: 82 },
          { label: '1440p High (Native)', value: '110 FPS', percentage: 100 },
        ] 
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="benchmark-card"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          const title = el.querySelector('h4')?.textContent || 'Benchmarks';
          const benchmarks: any[] = [];
          el.querySelectorAll('.benchmark-row').forEach(row => {
            const label = row.querySelector('.label')?.textContent || '';
            const value = row.querySelector('.value')?.textContent || '';
            const fillStyle = (row.querySelector('.bar-fill') as HTMLElement)?.style.width || '0%';
            const percentage = parseFloat(fillStyle) || 0;
            if (label) benchmarks.push({ label, value, percentage });
          });
          return { title, benchmarks };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'benchmark-card' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BenchmarkCardNodeView);
  },
});
