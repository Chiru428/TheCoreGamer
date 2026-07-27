import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { renderNewsletterCta, NewsletterCtaAttrs } from '../../lib/gaming-block-renderers';
import { Mail, Settings2, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANTS = ['card', 'minimal'] as const;

// --- Node View ----------------------------------------------------------------

const NewsletterCtaNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as NewsletterCtaAttrs;

  const [variant, setVariant] = useState<'card' | 'minimal'>((attrs.variant as 'card' | 'minimal') ?? 'card');
  const [headline, setHeadline] = useState(attrs.headline ?? 'Subscribe to Our Newsletter');
  const [description, setDescription] = useState(attrs.description ?? 'Get the latest gaming news, reviews, and exclusive guides delivered directly to your inbox.');
  const [ctaLabel, setCtaLabel] = useState(attrs.ctaLabel ?? 'Subscribe');

  const persist = () => {
    updateAttributes({ variant, headline, description, ctaLabel });
  };

  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const previewAttrs: NewsletterCtaAttrs = { variant, headline, description, ctaLabel };

  const input = (lbl: string, value: string, onChange: (v: string) => void, placeholder = '') => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">{lbl}</p>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
        onFocus={stopProp} />
    </div>
  );

  return (
    <NodeViewWrapper className="newsletter-cta-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-violet-500/50 rounded-2xl shadow-lg')}
        dangerouslySetInnerHTML={{ __html: renderNewsletterCta(previewAttrs) }} />

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-violet-400 rounded-lg border border-violet-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
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
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(167,139,250,0.2)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Newsletter CTA</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">Variant</p>
              <div className="flex gap-3">
                {VARIANTS.map(v => (
                  <button key={v} type="button" onClick={() => setVariant(v)} onMouseDown={stopProp}
                    className={cn('flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors capitalize',
                      variant === v
                        ? 'bg-violet-600/90 border-violet-500 text-white'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-violet-500/50')}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {input('Headline', headline, setHeadline, 'e.g. Subscribe to Our Newsletter')}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Description</p>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Brief tagline for the newsletter…"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                onFocus={stopProp} />
            </div>
            {input('CTA Button Label', ctaLabel, setCtaLabel, 'e.g. Subscribe')}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

NewsletterCtaNodeView.displayName = 'NewsletterCtaNodeView';

// --- Node Definition ----------------------------------------------------------

export const NewsletterCtaNode = Node.create({
  name: 'newsletterCta',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      variant: { default: 'card' },
      headline: { default: 'Subscribe to Our Newsletter' },
      description: { default: 'Get the latest gaming news, reviews, and exclusive guides delivered directly to your inbox.' },
      ctaLabel: { default: 'Subscribe' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="newsletter-cta"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'newsletter-cta' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NewsletterCtaNodeView);
  },
});
