import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { renderReviewCard, ReviewCardAttrs } from '../../lib/gaming-block-renderers';
import { Star, X, Settings2, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Node View Component ------------------------------------------------------

const ReviewCardNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  
  const attrs = node.attrs as ReviewCardAttrs;

  // Auto-open the edit panel when the node is freshly inserted (title still
  // has the default placeholder value).  This runs once on mount only.
  useEffect(() => {
    if (attrs.title === 'Game Title') {
      setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only run on first mount

  const handleChange = (key: keyof ReviewCardAttrs, value: any) => {
    // Score clamping logic as requested
    let finalValue = value;
    if (typeof value === 'number' && ['score', 'gameplay', 'graphics', 'story', 'audio'].includes(key)) {
      finalValue = Math.min(10, Math.max(0, value));
    }
    updateAttributes({ [key]: finalValue });
  };

  const handleListChange = (key: 'pros' | 'cons', index: number, value: string) => {
    const newList = [...(attrs[key] || [])];
    newList[index] = value;
    updateAttributes({ [key]: newList });
  };

  const addItem = (key: 'pros' | 'cons') => {
    const newList = [...(attrs[key] || []), ''];
    updateAttributes({ [key]: newList });
  };

  const removeItem = (key: 'pros' | 'cons', index: number) => {
    const newList = [...(attrs[key] || [])];
    newList.splice(index, 1);
    updateAttributes({ [key]: newList });
  };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    // Prevent ProseMirror from stealing focus if it's a mousedown on a non-input element
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) {
      e.stopPropagation();
      // Prevent ProseMirror from stealing focus
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
      }
    }
  };

  return (
    <NodeViewWrapper className="review-card-node-wrapper relative group" onMouseDown={handleMouseDown}>
      {/* Visual Parity Rendering */}
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-2xl shadow-lg scale-[1.01]"
        )}
        dangerouslySetInnerHTML={{ __html: renderReviewCard(attrs) }} 
      />

      {/* Action Buttons Overlay (Visible on Hover/Selection) */}
      <div className={cn(
        "absolute top-4 right-4 flex gap-2 transition-opacity duration-200",
        (selected || isEditing) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
            onMouseDown={stopProp}
          >
            <Settings2 className="w-4 h-4" />
            Edit Card
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-2 bg-green-500/80 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
            onMouseDown={stopProp}
          >
            <Save className="w-4 h-4" />
            Done
          </button>
        )}
        <button
          type="button"
          onClick={deleteNode}
          className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md transition-all"
          onMouseDown={stopProp}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Edit Panel (Conditional Mounting) */}
      {isEditing && (
        <div 
          className="absolute z-50 top-full left-0 right-0 mt-4 p-6 bg-[#0d1527] border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-6 border-bottom border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Review Card Configuration</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Basic Info & Scores */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Game Title</label>
                <input
                  type="text"
                  value={attrs.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                  onFocus={stopProp}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Platform</label>
                  <select
                    value={attrs.platform}
                    onChange={(e) => handleChange('platform', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none transition-colors"
                  >
                    <option value="PC">PC</option>
                    <option value="PS5">PlayStation 5</option>
                    <option value="Xbox">Xbox Series X|S</option>
                    <option value="Switch">Nintendo Switch</option>
                    <option value="Multi">Multi-Platform</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overall Score ({attrs.score})</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={attrs.score}
                    onChange={(e) => handleChange('score', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="grid grid-cols-2 gap-6">
                  {['gameplay', 'graphics', 'story', 'audio'].map((cat) => (
                    <div key={cat} className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight capitalize">{cat}</label>
                        <span className="text-[10px] font-bold text-cyan-400">{(attrs as any)[cat]}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={(attrs as any)[cat]}
                        onChange={(e) => handleChange(cat as any, parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Pros, Cons & Summary */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verdict Summary</label>
                <textarea
                  value={attrs.summary}
                  onChange={(e) => handleChange('summary', e.target.value)}
                  className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                  onFocus={stopProp}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Pros List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Pros</label>
                    <button onClick={() => addItem('pros')} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {attrs.pros?.map((pro, i) => (
                      <div key={i} className="flex gap-1 group/item">
                        <input
                          type="text"
                          value={pro}
                          onChange={(e) => handleListChange('pros', i, e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                          onFocus={stopProp}
                        />
                        <button onClick={() => removeItem('pros', i)} className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cons List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Cons</label>
                    <button onClick={() => addItem('cons')} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {attrs.cons?.map((con, i) => (
                      <div key={i} className="flex gap-1 group/item">
                        <input
                          type="text"
                          value={con}
                          onChange={(e) => handleListChange('cons', i, e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                          onFocus={stopProp}
                        />
                        <button onClick={() => removeItem('cons', i)} className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

// --- Node Definition ---------------------------------------------------------

export const ReviewCardNode = Node.create({
  name: 'reviewCard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Game Title' },
      score: { default: 8.5 },
      platform: { default: 'PC' },
      gameplay: { default: 8.0 },
      graphics: { default: 8.0 },
      story: { default: 8.0 },
      audio: { default: 8.0 },
      summary: { 
        default: 'Write your review summary here. Describe the overall experience, standout moments, and who this game is for.' 
      },
      pros: { default: ['Excellent gameplay loop', 'Stunning visuals'] },
      cons: { default: ['Short campaign', 'Limited customization'] },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="review-score-card"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          
          try {
            const title = el.querySelector('.rsc-title')?.textContent?.trim() || 'Game Title';
            const score = parseFloat(el.querySelector('.rsc-score-value')?.textContent || '8.5');
            const platform = el.querySelector('.rsc-platform')?.textContent?.trim() || 'PC';
            
            const getCategoryScore = (label: string) => {
              const rows = Array.from(el.querySelectorAll('.review-category-row'));
              const row = rows.find(r => r.querySelector('.review-category-label')?.textContent?.trim().toLowerCase() === label.toLowerCase());
              return parseFloat(row?.querySelector('.review-category-score')?.textContent || '8.0');
            };

            const summary = el.querySelector('.rsc-summary p')?.textContent?.trim() || '';
            
            const pros = Array.from(el.querySelectorAll('.review-score-card div[style*="color:#00E676"]'))
              .map(d => d.textContent?.replace(/^\+\s*/, '').trim())
              .filter(Boolean) as string[];

            const cons = Array.from(el.querySelectorAll('.review-score-card div[style*="color:#FF4D4D"]'))
              .map(d => d.textContent?.replace(/^[−-]\s*/, '').trim())
              .filter(Boolean) as string[];

            return {
              title,
              score: isNaN(score) ? 8.5 : score,
              platform,
              gameplay: getCategoryScore('Gameplay'),
              graphics: getCategoryScore('Graphics'),
              story: getCategoryScore('Story'),
              audio: getCategoryScore('Audio'),
              summary,
              pros: pros.length ? pros : ['Excellent gameplay loop', 'Stunning visuals'],
              cons: cons.length ? cons : ['Short campaign', 'Limited customization'],
            };
          } catch (e) {
            console.warn('[ReviewCardNode] Migration failed for legacy HTML:', e);
            return null;
          }
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Generate the same HTML as the pure renderer for serialization parity
    // We wrap it in a div that TipTap can identify
    return [
      'div', 
      mergeAttributes(HTMLAttributes, { 'data-type': 'review-score-card' }), 
      // We don't use the second element for content since it's an atom
      // Instead, the article renderer will use the shared utility
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ReviewCardNodeView);
  },
});
