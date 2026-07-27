import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderRelatedArticles, RelatedArticlesAttrs } from '../../lib/gaming-block-renderers';
import { Newspaper, Settings2, Trash2, Save, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArticlePicker, PickedArticle } from './shared/ArticlePicker';

// --- Node View ----------------------------------------------------------------

const RelatedArticlesNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as RelatedArticlesAttrs;

  const [headline, setHeadline] = useState(attrs.headline ?? 'Related');
  const [articles, setArticles] = useState<PickedArticle[]>(() => {
    try {
      const parsed = JSON.parse(attrs.articles as unknown as string);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return Array.isArray(attrs.articles) ? (attrs.articles as unknown as PickedArticle[]) : []; }
  });

  useEffect(() => {
    if (articles.length === 0) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => {
    updateAttributes({ headline, articles: JSON.stringify(articles.slice(0, 20)) });
  };

  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const addArticle = (article: PickedArticle) => {
    if (articles.length >= 20) return;
    setArticles(prev => [...prev, article]);
  };

  const removeArticle = (i: number) => setArticles(prev => prev.filter((_, idx) => idx !== i));

  const moveArticle = (i: number, dir: -1 | 1) => {
    setArticles(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const previewAttrs: RelatedArticlesAttrs = { headline, articles };

  const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

  return (
    <NodeViewWrapper className="related-articles-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-amber-500/50 rounded-2xl shadow-lg')}
        dangerouslySetInnerHTML={{ __html: renderRelatedArticles(previewAttrs) }} />

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-400 rounded-lg border border-amber-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
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
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(251,191,36,0.2)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Related Articles</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Tag Label</p>
              <input type="text" value={headline} onChange={e => setHeadline(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle} onFocus={stopProp} />
            </div>

            {articles.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">Articles ({articles.length})</p>
                <div className="space-y-1.5">
                  {articles.map((article, i) => (
                    <div key={`${article.slug}-${i}`} className="flex items-center gap-2 rounded-lg p-2"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveArticle(i, -1)} disabled={i === 0}
                          className="w-4 h-3 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-20 text-[10px] leading-none"
                          onMouseDown={e => e.preventDefault()}>▲</button>
                        <button type="button" onClick={() => moveArticle(i, 1)} disabled={i === articles.length - 1}
                          className="w-4 h-3 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-20 text-[10px] leading-none"
                          onMouseDown={e => e.preventDefault()}>▼</button>
                      </div>
                      {article.imageUrl ? (
                        <img src={article.imageUrl} alt="" className="w-12 h-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-8 rounded shrink-0" style={{ background: 'var(--ed-input-bg, #0a0f1e)' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{article.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">/{article.slug} · {article.contentType}</p>
                      </div>
                      <button type="button" onClick={() => removeArticle(i)} onMouseDown={stopProp}
                        className="shrink-0 p-1 text-red-400 hover:text-red-300">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {articles.length < 20 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">
                  <Plus className="inline w-3 h-3 mr-1" />Add Article
                </p>
                <ArticlePicker onSelect={addArticle} stopProp={stopProp} />
              </div>
            )}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

RelatedArticlesNodeView.displayName = 'RelatedArticlesNodeView';

// --- Node Definition ----------------------------------------------------------

export const RelatedArticlesNode = Node.create({
  name: 'relatedArticles',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      headline: { default: 'Related' },
      articles: { default: JSON.stringify([]) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="related-articles"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'related-articles' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RelatedArticlesNodeView);
  },
});
