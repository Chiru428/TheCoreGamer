import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { renderFAQ, FAQAttrs } from '../../lib/gaming-block-renderers';
import { HelpCircle, Plus, X, Trash2, Save, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as FAQAttrs;

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...attrs.items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateAttributes({ items: newItems });
  };

  const addItem = () => {
    updateAttributes({
      items: [...attrs.items, { question: 'New Question?', answer: 'Answer here.' }]
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
    <NodeViewWrapper className="faq-node-wrapper relative group" onMouseDown={handleMouseDown}>
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-lg shadow-lg"
        )}
        dangerouslySetInnerHTML={{ __html: renderFAQ(attrs) }} 
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
            Edit FAQ
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
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">FAQ Configuration</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Questions & Answers</label>
              <button 
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                onMouseDown={stopProp}
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {attrs.items.map((item, i) => (
                <div key={i} className="space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-800 relative group/row">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Question</label>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => handleItemChange(i, 'question', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500/30"
                      onFocus={stopProp}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Answer</label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => handleItemChange(i, 'answer', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none resize-none h-24 focus:border-cyan-500/30"
                      onFocus={stopProp}
                      placeholder={"Single answer, or use - for bullets:\n- Point one\n- Point two"}
                    />
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                      Tip: Start lines with <span className="text-slate-400 font-mono">-</span> to create bullet points
                    </p>
                  </div>
                  <button 
                    type="button"
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
      )}
    </NodeViewWrapper>
  );
});

export const FAQNode = Node.create({
  name: 'faq',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: {
        default: [
          { question: 'Frequently asked question goes here?', answer: 'Answer to the question goes here.' },
          { question: 'Another common question?', answer: 'Answer here.' },
        ],
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="faq"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          const items = Array.from(el.querySelectorAll('.gc-accordion-item')).map(div => {
            const qEl = div.querySelector('.faq-q') || div.querySelector('.gc-accordion-header');
            const question = qEl?.textContent?.replace(' ▾', '').trim() || '';
            const aEl = div.querySelector('.faq-body-inner') || div.querySelector('.gc-accordion-body p') || div.querySelector('.gc-accordion-body');
            const answer = aEl?.innerHTML || aEl?.textContent || '';
            return { question, answer };
          });
          return { items };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'faq' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FAQNodeView);
  },
});