import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderBossCard, BossCardAttrs } from '../../lib/gaming-block-renderers';
import { Skull, X, Settings2, Trash2, Save, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Node View Component ------------------------------------------------------

const BossCardNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  
  const attrs = node.attrs as BossCardAttrs;

  // Auto-open edit panel when freshly inserted (name still has default value)
  useEffect(() => {
    if (attrs.name === 'Boss Name') {
      setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleChange = (key: keyof BossCardAttrs, value: any) => {
    updateAttributes({ [key]: value });
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
    // NOTE: NodeViewWrapper must NOT have overflow-hidden — the toolbar and edit panel
    // are positioned absolute and need to escape the card's overflow:hidden boundary.
    <NodeViewWrapper
      className="boss-card-node-wrapper relative group"
      style={{ isolation: 'isolate' }}
      onMouseDown={handleMouseDown}
    >
      {/* Rendered card — wrap in a div that has the selection ring but NOT overflow:hidden */}
      <div
        className={cn(
          'transition-all duration-200',
          selected && !isEditing && 'ring-2 ring-blue-500 rounded-[20px] shadow-lg'
        )}
        dangerouslySetInnerHTML={{ __html: renderBossCard(attrs) }}
      />

      {/* -- Floating toolbar — positioned relative to the NodeViewWrapper, NOT the card */}
      <div
        className={cn(
          'absolute top-3 right-3 flex gap-2 z-20 transition-opacity duration-200',
          selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            onMouseDown={stopProp}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Edit Boss
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 bg-green-600/90 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            onMouseDown={stopProp}
          >
            <Save className="w-3.5 h-3.5" />
            Done
          </button>
        )}
        <button
          type="button"
          onClick={deleteNode}
          className="px-2 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md"
          onMouseDown={stopProp}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* -- Edit panel — sibling to the card, not inside it, so overflow:hidden doesn't clip it */}
      {isEditing && (
        <div
          className="relative z-50 mt-3 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
          style={{
            background: 'var(--ed-elevated, #0d1527)',
            border: '1px solid rgba(0,229,255,0.2)',
          }}
          onMouseDown={stopProp}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Skull className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--ed-text, #fff)' }}>Boss Card Configuration</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              onMouseDown={stopProp}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* -- Left column ------------------------- */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>Boss Name</label>
                <input
                  type="text"
                  value={attrs.name ?? ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
                  onFocus={stopProp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>Subtitle / Game Name</label>
                <input
                  type="text"
                  value={attrs.subtitle ?? ''}
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                  placeholder="e.g. Elden Ring — Field Boss"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
                  onFocus={stopProp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>Image URL</label>
                <input
                  type="text"
                  value={attrs.imageUrl ?? ''}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
                  onFocus={stopProp}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>HP</label>
                  <input
                    type="text"
                    value={attrs.hp ?? ''}
                    onChange={(e) => handleChange('hp', e.target.value)}
                    placeholder="e.g. 12,450"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
                    onFocus={stopProp}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>Difficulty</label>
                  <select
                    value={attrs.difficulty ?? 0}
                    onChange={(e) => handleChange('difficulty', parseInt(e.target.value))}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
                  >
                    <option value="0">— Unknown</option>
                    <option value="1">1 — Easy</option>
                    <option value="2">2 — Normal</option>
                    <option value="3">3 — Hard</option>
                    <option value="4">4 — Very Hard</option>
                    <option value="5">5 — Legendary</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>Reward / Souls</label>
                <input
                  type="text"
                  value={attrs.reward ?? ''}
                  onChange={(e) => handleChange('reward', e.target.value)}
                  placeholder="e.g. 24,000 Runes"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
                  onFocus={stopProp}
                />
              </div>
            </div>

            {/* -- Right column ------------------------ */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>Location</label>
                <input
                  type="text"
                  value={attrs.location ?? ''}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g. Stormveil Gate"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
                  onFocus={stopProp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #22c55e)' }}>Weaknesses (comma-separated)</label>
                <input
                  type="text"
                  value={attrs.weaknesses ?? ''}
                  onChange={(e) => handleChange('weaknesses', e.target.value)}
                  placeholder="Fire, Holy, Lightning"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(74,222,128,0.25)', color: 'var(--ed-input-text, #fff)' }}
                  onFocus={stopProp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #f87171)' }}>Resistances (comma-separated)</label>
                <input
                  type="text"
                  value={attrs.resistances ?? ''}
                  onChange={(e) => handleChange('resistances', e.target.value)}
                  placeholder="Magic, Fire, Rot"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--ed-input-text, #fff)' }}
                  onFocus={stopProp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #8090a8)' }}>Attacks (comma-separated)</label>
                <input
                  type="text"
                  value={attrs.attacks ?? ''}
                  onChange={(e) => handleChange('attacks', e.target.value)}
                  placeholder="Slam, Sweeping Claw, Projectile"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' }}
                  onFocus={stopProp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ed-text-muted, #67e8f9)' }}>Strategy Note</label>
                <textarea
                  value={attrs.strategy ?? ''}
                  onChange={(e) => handleChange('strategy', e.target.value)}
                  placeholder="Describe the key tactic to defeat this boss…"
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(103,232,249,0.25)', color: 'var(--ed-input-text, #fff)' }}
                  onFocus={stopProp}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

// --- Node Definition ---------------------------------------------------------

export const BossCardNode = Node.create({
  name: 'bossCard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      name: { default: 'Boss Name' },
      subtitle: { default: '' },
      imageUrl: { default: '' },
      hp: { default: '' },
      reward: { default: '' },
      location: { default: '' },
      weaknesses: { default: '' },
      resistances: { default: '' },
      attacks: { default: '' },
      difficulty: { default: 0 },
      strategy: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="boss-card"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;

          // New structure selectors (primary)
          const name =
            el.querySelector('.boss-name')?.textContent?.trim() || 'Boss Name';
          const subtitle =
            el.querySelector('.boss-eyebrow')?.textContent?.trim() ||
            el.querySelector('.boss-subtitle')?.textContent?.trim() || '';

          // Portrait image (new) or legacy thumbnail image
          const portrait = el.querySelector('.boss-portrait img') as HTMLImageElement | null;
          const legacyImg = el.querySelector('.boss-image-container img') as HTMLImageElement | null;
          const imageUrl = (portrait ?? legacyImg)?.getAttribute('src') || '';

          // Meta strip (new) vs legacy stats-grid
          const metaItems = el.querySelectorAll('.boss-meta-item');
          let hp = '', location = '', reward = '';
          if (metaItems.length > 0) {
            metaItems.forEach(item => {
              const lbl = item.querySelector('.boss-meta-label')?.textContent?.trim().toLowerCase() || '';
              const val = item.querySelector('.boss-meta-value')?.textContent?.trim() || '';
              if (lbl === 'hp') hp = val;
              else if (lbl === 'location') location = val;
              else if (lbl === 'reward') reward = val;
            });
          } else {
            // Legacy fallback
            hp       = el.querySelector('.boss-stat:nth-child(1) span')?.textContent?.trim() || '';
            reward   = el.querySelector('.boss-stat:nth-child(2) span')?.textContent?.trim() || '';
            location = el.querySelector('.boss-stat:nth-child(3) span')?.textContent?.trim() || '';
          }

          // Tags — new structure uses .boss-tag--weak / .boss-tag--resist
          const weakTags = el.querySelectorAll('.boss-tag--weak');
          const resistTags = el.querySelectorAll('.boss-tag--resist');
          const weaknesses = weakTags.length > 0
            ? Array.from(weakTags).map(t => t.textContent?.trim()).filter(Boolean).join(', ')
            : Array.from(el.querySelectorAll('.boss-meta-section:nth-of-type(1) .boss-tag'))
                .map(t => t.textContent?.trim()).join(', ');
          const resistances = resistTags.length > 0
            ? Array.from(resistTags).map(t => t.textContent?.trim()).filter(Boolean).join(', ')
            : Array.from(el.querySelectorAll('.boss-meta-section:nth-of-type(2) .boss-tag'))
                .map(t => t.textContent?.trim()).join(', ');

          // Attacks — new uses .boss-attack-item, legacy uses li
          const attackItems = el.querySelectorAll('.boss-attack-item');
          const attacks = attackItems.length > 0
            ? Array.from(attackItems).map(li => {
                const bullet = li.querySelector('.boss-attack-bullet');
                if (bullet) bullet.remove();
                return li.textContent?.trim();
              }).filter(Boolean).join(', ')
            : Array.from(el.querySelectorAll('.boss-attack-list li'))
                .map(li => li.textContent?.replace('✦', '').replace('›', '').trim()).filter(Boolean).join(', ');

          // Difficulty from threat meter segments or legacy data-diff attribute
          const filledSegs = el.querySelectorAll('.boss-threat-seg.filled').length;
          const legacyDiff = parseInt(el.querySelector('.boss-difficulty')?.getAttribute('data-diff') || '0');
          const difficulty = filledSegs > 0 ? filledSegs : legacyDiff;

          // Strategy — new uses .boss-strategy-text, legacy uses .boss-strategy-box p
          const strategy =
            el.querySelector('.boss-strategy-text')?.textContent?.trim() ||
            el.querySelector('.boss-strategy-box p')?.textContent?.replace(/^"|"$/g, '').trim() || '';

          return { name, subtitle, imageUrl, hp, reward, location, weaknesses, resistances, attacks, difficulty, strategy };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'boss-card' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BossCardNodeView);
  },
});
