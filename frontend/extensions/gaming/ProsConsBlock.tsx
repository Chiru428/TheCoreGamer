import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect } from 'react';
import { renderProsCons, ProsConsAttrs } from '../../lib/gaming-block-renderers';
import { ThumbsUp, Plus, X, Trash2, Save, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ProsConsNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as ProsConsAttrs;

  // Auto-open edit panel when freshly inserted (pros/cons still have placeholder values)
  useEffect(() => {
    if (attrs.pros?.[0] === 'Pro point here' || attrs.cons?.[0] === 'Con point here') {
      setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleItemChange = (type: 'pros' | 'cons', index: number, value: string) => {
    const newList = [...attrs[type]];
    newList[index] = value;
    updateAttributes({ [type]: newList });
  };

  const addItem = (type: 'pros' | 'cons') => {
    updateAttributes({
      [type]: [...attrs[type], 'New point']
    });
  };

  const removeItem = (type: 'pros' | 'cons', index: number) => {
    const newList = [...attrs[type]];
    newList.splice(index, 1);
    updateAttributes({ [type]: newList });
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
    <NodeViewWrapper className="pros-cons-node-wrapper relative group" onMouseDown={handleMouseDown}>
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-xl shadow-lg"
        )}
        dangerouslySetInnerHTML={{ __html: renderProsCons(attrs) }} 
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
            Edit Pros/Cons
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
              <ThumbsUp className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Pros & Cons Configuration</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(['pros', 'cons'] as const).map(type => (
              <div key={type} className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{type}</label>
                  <button 
                    onClick={() => addItem(type)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      type === 'pros' ? "text-green-500 hover:bg-green-500/10" : "text-red-500 hover:bg-red-500/10"
                    )}
                    onMouseDown={stopProp}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {attrs[type].map((item, i) => (
                    <div key={i} className="flex gap-2 items-start group/row">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleItemChange(type, i, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/30"
                        onFocus={stopProp}
                      />
                      <button 
                        onClick={() => removeItem(type, i)}
                        className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const ProsConsNode = Node.create({
  name: 'prosCons',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      pros: { default: ['Pro point here'] },
      cons: { default: ['Con point here'] },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="pros-cons-block"], div.pros-cons-block',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          const pros = Array.from(el.querySelectorAll('.pros li')).map(li => li.textContent || '');
          const cons = Array.from(el.querySelectorAll('.cons li')).map(li => li.textContent || '');
          return { pros, cons };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'pros-cons-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProsConsNodeView);
  },
});
