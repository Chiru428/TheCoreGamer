import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderControversyBlock, ControversyBlockAttrs } from '../../lib/gaming-block-renderers';
import { Zap, Settings2, Trash2, Save, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTOR_TYPES = ['developer', 'publisher', 'community', 'press', 'regulator'] as const;
type ActorType = typeof ACTOR_TYPES[number];
const SENTIMENTS = ['neutral', 'negative', 'positive', 'resolution'] as const;
type Sentiment = typeof SENTIMENTS[number];
const OUTCOME_SENTIMENTS = ['positive', 'negative', 'mixed', 'ongoing'] as const;
type OutcomeSentiment = typeof OUTCOME_SENTIMENTS[number];

interface EventEntry {
  date: string;
  actor: string;
  actorType: ActorType;
  description: string;
  sentiment: Sentiment;
}

// --- Node View ----------------------------------------------------------------

const ControversyBlockNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as ControversyBlockAttrs;

  const [title, setTitle] = useState(attrs.title ?? 'The Controversy');
  const [summary, setSummary] = useState(attrs.summary ?? '');
  const [outcome, setOutcome] = useState(attrs.outcome ?? '');
  const [outcomeSentiment, setOutcomeSentiment] = useState<OutcomeSentiment>((attrs.outcomeSentiment as OutcomeSentiment) ?? 'mixed');
  const [events, setEvents] = useState<EventEntry[]>(() => {
    try {
      const p = JSON.parse(attrs.events as unknown as string);
      return Array.isArray(p) ? p : [];
    } catch { return Array.isArray(attrs.events) ? (attrs.events as unknown as EventEntry[]) : []; }
  });

  useEffect(() => {
    if (events.length === 0) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => updateAttributes({ title, summary, outcome, outcomeSentiment, events: JSON.stringify(events) });
  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const addEvent = () => setEvents(prev => [...prev, {
    date: '', actor: '', actorType: 'developer', description: '', sentiment: 'neutral',
  }]);
  const removeEvent = (i: number) => setEvents(prev => prev.filter((_, idx) => idx !== i));
  const updateEvent = <K extends keyof EventEntry>(i: number, key: K, val: EventEntry[K]) =>
    setEvents(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));

  const previewAttrs: ControversyBlockAttrs = { title, summary, outcome, outcomeSentiment, events };

  const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

  const sentimentColor: Record<Sentiment, string> = {
    neutral: '#6b7280', negative: '#ef4444', positive: '#22c55e', resolution: '#00e5ff',
  };

  return (
    <NodeViewWrapper className="controversy-block-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-yellow-500/50 rounded-2xl shadow-lg')}
        dangerouslySetInnerHTML={{ __html: renderControversyBlock(previewAttrs) }} />

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-yellow-400 rounded-lg border border-yellow-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
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
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(234,179,8,0.2)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Controversy Timeline</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Title</p>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. The Helldivers 2 PSN Controversy"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle} onFocus={stopProp} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Summary (optional)</p>
              <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2}
                placeholder="Brief context about the controversy…"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                style={inputStyle} onFocus={stopProp} />
            </div>

            {/* Events */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timeline Events</p>
              {events.map((event, i) => (
                <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Event {i + 1}</span>
                    <button type="button" onClick={() => removeEvent(i)} onMouseDown={stopProp}
                      className="p-1 text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Date</p>
                      <input type="text" value={event.date} onChange={e => updateEvent(i, 'date', e.target.value)}
                        placeholder="e.g. May 6, 2024" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                        style={inputStyle} onFocus={stopProp} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Actor</p>
                      <input type="text" value={event.actor} onChange={e => updateEvent(i, 'actor', e.target.value)}
                        placeholder="e.g. Arrowhead Studio" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                        style={inputStyle} onFocus={stopProp} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Actor Type</p>
                      <select value={event.actorType} onChange={e => updateEvent(i, 'actorType', e.target.value as ActorType)}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none capitalize"
                        style={inputStyle}>
                        {ACTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Description</p>
                    <textarea value={event.description} onChange={e => updateEvent(i, 'description', e.target.value)} rows={2}
                      placeholder="What happened…"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                      style={inputStyle} onFocus={stopProp} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Sentiment</p>
                    <div className="flex gap-2 flex-wrap">
                      {SENTIMENTS.map(s => (
                        <button key={s} type="button" onClick={() => updateEvent(i, 'sentiment', s)} onMouseDown={stopProp}
                          className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors capitalize',
                            event.sentiment === s ? 'border-current text-white' : 'border-slate-700 text-slate-500 hover:border-slate-500')}
                          style={event.sentiment === s ? { color: sentimentColor[s], borderColor: sentimentColor[s], background: `${sentimentColor[s]}18` } : {}}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addEvent} onMouseDown={stopProp}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
              style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(234,179,8,0.3)' }}>
              <Plus className="w-4 h-4" /> Add Event
            </button>

            {/* Outcome */}
            <div className="pt-3 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outcome (optional)</p>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Outcome Summary</p>
                <textarea value={outcome} onChange={e => setOutcome(e.target.value)} rows={2}
                  placeholder="How was the controversy resolved?"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                  style={inputStyle} onFocus={stopProp} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Outcome Sentiment</p>
                <div className="flex gap-2 flex-wrap">
                  {OUTCOME_SENTIMENTS.map(s => (
                    <button key={s} type="button" onClick={() => setOutcomeSentiment(s)} onMouseDown={stopProp}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors capitalize',
                        outcomeSentiment === s
                          ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                          : 'border-slate-700 text-slate-500 hover:border-slate-500')}>
                      {s}
                    </button>
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

ControversyBlockNodeView.displayName = 'ControversyBlockNodeView';

// --- Node Definition ----------------------------------------------------------

export const ControversyBlockNode = Node.create({
  name: 'controversyBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'The Controversy' },
      summary: { default: '' },
      outcome: { default: '' },
      outcomeSentiment: { default: 'mixed' },
      events: { default: JSON.stringify([]) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="controversy-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'controversy-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ControversyBlockNodeView);
  },
});
