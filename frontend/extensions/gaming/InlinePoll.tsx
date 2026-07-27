import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { renderInlinePoll, InlinePollAttrs } from '../../lib/gaming-block-renderers';
import { BarChart2, Settings2, Trash2, Save, X, Plus, Loader2 } from 'lucide-react';
import PollWidget from '@/components/blog/PollWidget';
import { createPoll } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

// --- Node View ----------------------------------------------------------------

const InlinePollNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const { addToast } = useUIStore();

  const attrs = node.attrs as InlinePollAttrs;

  const set = (key: keyof InlinePollAttrs, value: string) => updateAttributes({ [key]: value });

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const [showAttachExisting, setShowAttachExisting] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<{text: string, allowCustomInput: boolean}[]>([
    {text: '', allowCustomInput: false}, 
    {text: '', allowCustomInput: false}
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [creating, setCreating] = useState(false);

  const addOption = () => { if (options.length < 10) setOptions(prev => [...prev, {text: '', allowCustomInput: false}]); };
  const removeOption = (i: number) => setOptions(prev => prev.filter((_, idx) => idx !== i));
  const updateOptionText = (i: number, value: string) => setOptions(prev => prev.map((o, idx) => idx === i ? {...o, text: value} : o));
  const updateOptionCustomInput = (i: number, value: boolean) => setOptions(prev => prev.map((o, idx) => idx === i ? {...o, allowCustomInput: value} : o));

  const handleCreatePoll = async () => {
    const validOptions = options.map(o => ({ text: o.text.trim(), allowCustomInput: o.allowCustomInput })).filter(o => o.text);
    if (!question.trim()) {
      addToast({ type: 'error', message: 'Poll question is required' });
      return;
    }
    if (validOptions.length < 2) {
      addToast({ type: 'error', message: 'At least 2 options are required' });
      return;
    }

    setCreating(true);
    const res = await createPoll({ question: question.trim(), options: validOptions, allowMultiple });
    setCreating(false);

    if (res.success && res.data) {
      updateAttributes({ pollId: res.data.id });
      addToast({ type: 'success', message: 'Poll created and attached' });
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to create poll' });
    }
  };

  const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

  return (
    <NodeViewWrapper className="inline-poll-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      {/* Preview / placeholder */}
      <div className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-cyan-500/50 rounded-2xl shadow-lg')}>
        {attrs.pollId ? (
          <div className="pointer-events-none">
            <PollWidget pollId={attrs.pollId} />
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderInlinePoll(attrs) }} />
        )}
      </div>

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Settings2 className="w-3.5 h-3.5" /> Configure Poll
          </button>
        ) : (
          <button type="button" onClick={() => setIsEditing(false)} onMouseDown={stopProp}
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
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(0,229,255,0.2)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Inline Poll</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4">
            {attrs.pollId ? (
              <div className="flex items-center justify-between gap-3 rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,229,255,0.2)' }}>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attached Poll</p>
                  <p className="text-sm font-mono text-white truncate">{attrs.pollId}</p>
                </div>
                <button type="button" onClick={() => set('pollId', '')} onMouseDown={stopProp}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10">
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Poll Question</label>
                  <textarea value={question} onChange={e => setQuestion(e.target.value)}
                    placeholder="What is your favourite platform?" rows={2}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                    style={inputStyle} onFocus={stopProp} />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Options</label>
                  <div className="space-y-2">
                    {options.map((opt, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <input type="text" value={opt.text} onChange={e => updateOptionText(i, e.target.value)}
                            placeholder={`Option ${i + 1}`}
                            className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm focus:outline-none"
                            style={inputStyle} onFocus={stopProp} />
                          {options.length > 2 && (
                            <button type="button" onClick={() => removeOption(i)} onMouseDown={stopProp}
                              className="shrink-0 p-1.5 text-red-400 hover:text-red-300">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <label className="flex items-center gap-2 text-[10px] text-slate-400 ml-1 cursor-pointer">
                          <input type="checkbox" checked={opt.allowCustomInput} onChange={e => updateOptionCustomInput(i, e.target.checked)} onFocus={stopProp} className="w-3 h-3 accent-cyan-500" />
                          Allow custom input (e.g. for "Other")
                        </label>
                      </div>
                    ))}
                  </div>
                  {options.length < 10 && (
                    <button type="button" onClick={addOption} onMouseDown={stopProp}
                      className="mt-2 w-full py-2 rounded-lg border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                      style={{ borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)' }}>
                      <Plus className="w-3.5 h-3.5" /> Add Option ({options.length}/10)
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} onFocus={stopProp} />
                  Allow selecting multiple options
                </label>

                <button type="button" onClick={handleCreatePoll} disabled={creating} onMouseDown={stopProp}
                  className="w-full py-2.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-600 text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                  {creating ? 'Creating…' : 'Create Poll'}
                </button>

                <button type="button" onClick={() => setShowAttachExisting(v => !v)} onMouseDown={stopProp}
                  className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2">
                  {showAttachExisting ? 'Cancel' : 'Attach an existing poll by ID instead'}
                </button>

                {showAttachExisting && (
                  <div>
                    <input type="text" value={attrs.pollId ?? ''} onChange={e => set('pollId', e.target.value)}
                      placeholder="e.g. poll_abc123"
                      className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
                      style={inputStyle} onFocus={stopProp} />
                    <p className="text-[10px] text-slate-500 mt-1">Paste the ID of a poll already created in the Polls admin section.</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Headline Override (optional)</label>
              <input type="text" value={attrs.headline ?? ''} onChange={e => set('headline', e.target.value)}
                placeholder="Override the poll question display text"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
                onFocus={stopProp} />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Display Style</label>
              <select value={attrs.displayStyle ?? 'bar'} onChange={e => set('displayStyle', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}>
                <option value="bar">Bar — horizontal bars with vote % (default)</option>
                <option value="minimal">Minimal — question + Vote Now link</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

InlinePollNodeView.displayName = 'InlinePollNodeView';

// --- Node Definition ----------------------------------------------------------

export const InlinePollNode = Node.create({
  name: 'inlinePoll',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      pollId: { default: '' },
      headline: { default: '' },
      displayStyle: { default: 'bar' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="inline-poll"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-poll' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlinePollNodeView);
  },
});
