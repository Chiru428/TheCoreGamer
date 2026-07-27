import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { renderTimeline, TimelineAttrs } from '../../lib/gaming-block-renderers';
import { GitCommit, Plus, X, Trash2, Save, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TimelineNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as TimelineAttrs;

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...attrs.items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateAttributes({ items: newItems });
  };

  const addItem = () => {
    updateAttributes({
      items: [...attrs.items, { label: 'New Phase', title: 'Event Title', description: 'Description here' }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...attrs.items];
    newItems.splice(index, 1);
    updateAttributes({ items: newItems });
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
    <NodeViewWrapper className="timeline-node-wrapper relative group" onMouseDown={handleMouseDown}>
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-lg shadow-lg"
        )}
        dangerouslySetInnerHTML={{ __html: renderTimeline(attrs) }} 
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
            Edit Timeline
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
              <GitCommit className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Timeline Configuration</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timeline Title</label>
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Events</label>
                <button 
                  onClick={addItem}
                  className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                  onMouseDown={stopProp}
                >
                  <Plus className="w-3 h-3" /> Add Event
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {attrs.items.map((item, i) => (
                  <div key={i} className="space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-800 relative group/row">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase">Label (e.g. Date)</label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => handleItemChange(i, 'label', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none"
                          onFocus={stopProp}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase">Title</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleItemChange(i, 'title', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none"
                          onFocus={stopProp}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 uppercase">Description</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(i, 'description', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none resize-none h-16"
                        onFocus={stopProp}
                      />
                    </div>
                    <button 
                      onClick={() => removeItem(i)}
                      className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-opacity"
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

export const TimelineNode = Node.create({
  name: 'timeline',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Timeline' },
      items: {
        default: [
          { label: 'Phase 1', title: 'Event Title', description: 'Description of this timeline event goes here.' },
          { label: 'Phase 2', title: 'Next Event', description: 'Description here.' },
        ],
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="timeline"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          const title = el.querySelector('h4')?.textContent || 'Timeline';
          const items = Array.from(el.querySelectorAll('div[style*="position:relative;padding-left:24px"] > div')).map(div => ({
            label: div.querySelector('div[style*="font-size:0.75rem"]')?.textContent || '',
            title: div.querySelector('div[style*="font-size:0.9rem"]')?.textContent || '',
            description: div.querySelector('div[style*="font-size:0.85rem"]')?.textContent || '',
          }));
          return { title, items };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'timeline' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TimelineNodeView);
  },
});
