import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderDealCard, DealCardAttrs } from '../../lib/gaming-block-renderers';
import { Tag, X, Trash2, Save, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DealCardNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as DealCardAttrs;

  // Auto-open edit panel when freshly inserted (product name still default)
  useEffect(() => {
    if (attrs.product === 'Product Name') {
      setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: keyof DealCardAttrs, value: string) => {
    updateAttributes({ [field]: value });
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
    <NodeViewWrapper className="deal-card-node-wrapper relative group" onMouseDown={handleMouseDown}>
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-xl shadow-lg"
        )}
        dangerouslySetInnerHTML={{ __html: renderDealCard(attrs) }} 
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
            Edit Deal
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
              <Tag className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Deal Configuration</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Store</label>
                <input
                  type="text"
                  value={attrs.store}
                  onChange={(e) => handleChange('store', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g. Steam, Epic"
                  onFocus={stopProp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Platform</label>
                <select
                  value={attrs.platform || ''}
                  onChange={(e) => handleChange('platform', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  onFocus={stopProp}
                >
                  <option value="">Any Platform</option>
                  <option value="PC">PC</option>
                  <option value="PS5">PlayStation 5</option>
                  <option value="PS4">PlayStation 4</option>
                  <option value="Xbox Series X">Xbox Series X</option>
                  <option value="Nintendo Switch">Nintendo Switch</option>
                  <option value="Mobile">Mobile</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Name</label>
              <input
                type="text"
                value={attrs.product}
                onChange={(e) => handleChange('product', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                onFocus={stopProp}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Price</label>
                <input
                  type="text"
                  value={attrs.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g. $29.99, Free"
                  onFocus={stopProp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Original Price</label>
                <input
                  type="text"
                  value={attrs.originalPrice || ''}
                  onChange={(e) => handleChange('originalPrice', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g. $59.99"
                  onFocus={stopProp}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                <input
                  type="datetime-local"
                  value={attrs.expiryDate ? attrs.expiryDate.slice(0, 16) : ''}
                  onChange={(e) => handleChange('expiryDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  onFocus={stopProp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deal Score (0–10)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={attrs.dealScore ?? ''}
                  onChange={(e) => updateAttributes({ dealScore: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  placeholder="8.5"
                  onFocus={stopProp}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Affiliate URL</label>
              <input
                type="text"
                value={attrs.url}
                onChange={(e) => handleChange('url', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50 font-mono text-[10px]"
                placeholder="https://..."
                onFocus={stopProp}
              />
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

export const DealCardNode = Node.create({
  name: 'dealCard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      store: { default: 'Store' },
      product: { default: 'Product Name' },
      price: { default: 'Free' },
      originalPrice: { default: '' },
      url: { default: '#' },
      expiryDate: { default: '' },
      platform: { default: '' },
      dealScore: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="deal-card"], div.deal-card-block',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          const store = el.querySelector('.deal-store-badge')?.textContent || 'Store';
          const product = el.querySelector('.deal-product-title')?.textContent || 'Product';
          const price = el.querySelector('.deal-price')?.textContent || 'Free';
          const url = el.querySelector('.deal-cta-btn')?.getAttribute('href') || '#';
          return { store, product, price, url };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'deal-card' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DealCardNodeView);
  },
});
