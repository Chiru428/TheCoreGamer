import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useCallback, useEffect } from 'react';
import { renderBuildCard, BuildCardAttrs } from '../../lib/gaming-block-renderers';
import { Sword, X, Settings2, Trash2, Save, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Node View Component ------------------------------------------------------

const BuildCardNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  
  const attrs = node.attrs as BuildCardAttrs;

  // Auto-open edit panel when freshly inserted (default name not yet changed)
  useEffect(() => {
    if (attrs.buildName === 'New Character Build') {
      setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local state for dynamic lists to avoid serializing on every keystroke
  const [localStats, setLocalStats] = useState(() => {
    try { return JSON.parse(attrs.stats || '[]'); } catch { return []; }
  });
  const [localEquip, setLocalEquip] = useState(() => {
    try { return JSON.parse(attrs.equipment || '[]'); } catch { return []; }
  });

  const syncToAttrs = useCallback(() => {
    updateAttributes({
      stats: JSON.stringify(localStats),
      equipment: JSON.stringify(localEquip),
    });
  }, [localStats, localEquip, updateAttributes]);

  const handleInsert = () => {
    syncToAttrs();
    setIsEditing(false);
  };

  const addStat = () => setLocalStats([...localStats, { key: 'Stat', value: '0' }]);
  const removeStat = (i: number) => setLocalStats(localStats.filter((_: any, idx: number) => idx !== i));
  const updateStat = (i: number, f: string, v: string) => {
    const next = [...localStats];
    next[i] = { ...next[i], [f]: v };
    setLocalStats(next);
  };

  const addEquip = () => setLocalEquip([...localEquip, { slot: 'Slot', name: 'Item Name' }]);
  const removeEquip = (i: number) => setLocalEquip(localEquip.filter((_: any, idx: number) => idx !== i));
  const updateEquip = (i: number, f: string, v: string) => {
    const next = [...localEquip];
    next[i] = { ...next[i], [f]: v };
    setLocalEquip(next);
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
    <NodeViewWrapper className="build-card-node-wrapper relative group" onMouseDown={handleMouseDown}>
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-2xl shadow-lg"
        )}
        dangerouslySetInnerHTML={{ __html: renderBuildCard(attrs) }} 
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
            Edit Build
          </button>
        ) : (
          <button
            type="button"
            onClick={handleInsert}
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
          className="absolute z-50 top-full left-0 right-0 mt-4 p-6 bg-[#0d1527] border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2"
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Sword className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Build Configuration</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Left: General Info */}
            <div className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Build Name</label>
                  <input
                    type="text"
                    value={attrs.buildName}
                    onChange={(e) => updateAttributes({ buildName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Game</label>
                  <input
                    type="text"
                    value={attrs.gameName}
                    onChange={(e) => updateAttributes({ gameName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Patch</label>
                  <input
                    type="text"
                    value={attrs.patchVersion}
                    onChange={(e) => updateAttributes({ patchVersion: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Difficulty</label>
                <select
                  value={attrs.difficulty}
                  onChange={(e) => updateAttributes({ difficulty: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Playstyle Tags (comma-separated)</label>
                <input
                  type="text"
                  value={attrs.playstyle}
                  onChange={(e) => updateAttributes({ playstyle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g. Tank, Fast, Magic"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Overview Description</label>
                <textarea
                  value={attrs.description}
                  onChange={(e) => updateAttributes({ description: e.target.value })}
                  className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>
            </div>

            {/* Right: Stats & Equipment */}
            <div className="space-y-6 text-left">
              {/* Dynamic Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Attributes / Stats</label>
                  <button onClick={addStat} className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded" onMouseDown={stopProp}><Plus className="w-3 h-3" /></button>
                </div>
                <div className="space-y-2">
                  {localStats.map((s: any, i: number) => (
                    <div key={i} className="flex gap-2 group/row">
                      <input 
                        type="text" value={s.key} onChange={(e) => updateStat(i, 'key', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 uppercase font-bold focus:outline-none focus:border-cyan-500/30"
                      />
                      <input 
                        type="text" value={s.value} onChange={(e) => updateStat(i, 'value', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500/30"
                      />
                      <button onClick={() => removeStat(i)} className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-opacity" onMouseDown={stopProp}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Equipment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Equipment / Slots</label>
                  <button onClick={addEquip} className="p-1 text-amber-500 hover:bg-amber-500/10 rounded" onMouseDown={stopProp}><Plus className="w-3 h-3" /></button>
                </div>
                <div className="space-y-2">
                  {localEquip.map((e: any, i: number) => (
                    <div key={i} className="flex gap-2 group/row">
                      <input 
                        type="text" value={e.slot} onChange={(e) => updateEquip(i, 'slot', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 uppercase font-bold focus:outline-none focus:border-amber-500/30"
                      />
                      <input 
                        type="text" value={e.name} onChange={(e) => updateEquip(i, 'name', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500/30"
                      />
                      <button onClick={() => removeEquip(i)} className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-opacity" onMouseDown={stopProp}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
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

export const BuildCardNode = Node.create({
  name: 'buildCard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      buildName: { default: 'New Character Build' },
      gameName: { default: 'Elden Ring' },
      difficulty: { default: 'Intermediate' },
      playstyle: { default: 'Aggressive, Dexterity' },
      stats: { default: '[]' },
      equipment: { default: '[]' },
      description: { default: 'Explain the core loop and main goal of this build.' },
      imageUrl: { default: '' },
      patchVersion: { default: '1.0' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="build-card"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          
          return {
            buildName: el.querySelector('.build-name')?.textContent || 'Build Name',
            gameName: el.querySelector('.build-header span:first-child')?.textContent || 'Game Name',
            difficulty: el.querySelector('.build-header div span:first-child')?.textContent || 'Intermediate',
            playstyle: Array.from(el.querySelectorAll('.build-header div div span'))
              .map(s => s.textContent?.replace('#', '')).join(', '),
            stats: JSON.stringify(Array.from(el.querySelectorAll('.build-stats-grid > div')).reduce((acc: any[], div, i, arr) => {
               if (i % 2 === 0) acc.push({ key: div.textContent, value: arr[i+1]?.textContent });
               return acc;
            }, [])),
            equipment: JSON.stringify(Array.from(el.querySelectorAll('.build-equip-row')).map(row => ({
              slot: row.querySelector('.build-equip-slot')?.textContent,
              name: row.querySelector('.build-equip-name')?.textContent,
            }))),
            description: el.querySelector('.build-description p')?.textContent || '',
            imageUrl: el.querySelector('img')?.getAttribute('src') || '',
            patchVersion: el.querySelector('.build-header span:nth-child(2)')?.textContent?.replace('Ver ', '') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'build-card' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BuildCardNodeView);
  },
});
