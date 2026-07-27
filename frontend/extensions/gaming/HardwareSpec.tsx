import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderHardwareSpec, HardwareSpecAttrs } from '../../lib/gaming-block-renderers';
import { Monitor, Settings2, Trash2, Save, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['GPU', 'CPU', 'Monitor', 'Headset', 'Mouse', 'Keyboard', 'Controller', 'SSD', 'RAM', 'Motherboard'] as const;
type Category = typeof CATEGORIES[number];
const VERDICTS = ['Buy', 'Consider', 'Skip'] as const;
type Verdict = typeof VERDICTS[number];

interface SpecRow { label: string; value: string; }

// --- Node View ----------------------------------------------------------------

const HardwareSpecNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as HardwareSpecAttrs;

  const [productName, setProductName] = useState(attrs.productName ?? 'Product Name');
  const [category, setCategory] = useState<Category>((attrs.category as Category) ?? 'GPU');
  const [imageUrl, setImageUrl] = useState(attrs.imageUrl ?? '');
  const [msrp, setMsrp] = useState(attrs.msrp ?? '');
  const [verdict, setVerdict] = useState<Verdict | ''>((attrs.verdict as Verdict) ?? '');
  const [verdictReason, setVerdictReason] = useState(attrs.verdictReason ?? '');
  const [score, setScore] = useState(attrs.score !== undefined ? String(attrs.score) : '');
  const [specs, setSpecs] = useState<SpecRow[]>(() => {
    try { const p = JSON.parse(attrs.specs as unknown as string); return Array.isArray(p) ? p : []; }
    catch { return Array.isArray(attrs.specs) ? (attrs.specs as unknown as SpecRow[]) : []; }
  });
  const [prosRaw, setProsRaw] = useState(() => {
    try { const p = JSON.parse(attrs.pros as unknown as string); return Array.isArray(p) ? p.join('\n') : ''; }
    catch { return Array.isArray(attrs.pros) ? (attrs.pros as string[]).join('\n') : ''; }
  });
  const [consRaw, setConsRaw] = useState(() => {
    try { const p = JSON.parse(attrs.cons as unknown as string); return Array.isArray(p) ? p.join('\n') : ''; }
    catch { return Array.isArray(attrs.cons) ? (attrs.cons as string[]).join('\n') : ''; }
  });

  useEffect(() => {
    if (!attrs.productName || attrs.productName === 'Product Name') setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => {
    const pros = prosRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const cons = consRaw.split('\n').map(l => l.trim()).filter(Boolean);
    updateAttributes({
      productName, category, imageUrl, msrp,
      verdict: verdict || undefined,
      verdictReason,
      score: score !== '' ? Number(score) : undefined,
      specs: JSON.stringify(specs),
      pros: JSON.stringify(pros),
      cons: JSON.stringify(cons),
    });
  };

  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const previewAttrs: HardwareSpecAttrs = {
    productName, category, imageUrl, msrp,
    verdict: verdict as Verdict | undefined,
    verdictReason,
    score: score !== '' ? Number(score) : undefined,
    specs,
    pros: prosRaw.split('\n').map(l => l.trim()).filter(Boolean),
    cons: consRaw.split('\n').map(l => l.trim()).filter(Boolean),
  };

  const addSpec = () => setSpecs(prev => [...prev, { label: '', value: '' }]);
  const removeSpec = (i: number) => setSpecs(prev => prev.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, key: keyof SpecRow, val: string) =>
    setSpecs(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s));

  const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };
  const inp = (lbl: string, val: string, set: (v: string) => void, ph = '', type = 'text') => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">{lbl}</p>
      <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={inputStyle} onFocus={stopProp} />
    </div>
  );

  return (
    <NodeViewWrapper className="hardware-spec-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-cyan-500/50 rounded-2xl shadow-lg')}
        dangerouslySetInnerHTML={{ __html: renderHardwareSpec(previewAttrs) }} />

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
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
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(6,182,212,0.2)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Hardware Spec Card</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              {inp('Product Name', productName, setProductName, 'e.g. RTX 4070 Super')}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Category</p>
                <select value={category} onChange={e => setCategory(e.target.value as Category)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ ...inputStyle, border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {inp('MSRP', msrp, setMsrp, 'e.g. $599')}
              {inp('Product Image URL', imageUrl, setImageUrl, 'https://...')}
            </div>

            {/* Specs */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">Specs</p>
              <div className="space-y-2">
                {specs.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" value={s.label} onChange={e => updateSpec(i, 'label', e.target.value)}
                      placeholder="Label" className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={inputStyle} onFocus={stopProp} />
                    <input type="text" value={s.value} onChange={e => updateSpec(i, 'value', e.target.value)}
                      placeholder="Value" className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={inputStyle} onFocus={stopProp} />
                    <button type="button" onClick={() => removeSpec(i)} onMouseDown={stopProp}
                      className="p-1.5 text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addSpec} onMouseDown={stopProp}
                className="mt-2 w-full py-2 rounded-lg border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 text-cyan-400"
                style={{ borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' }}>
                <Plus className="w-3.5 h-3.5" /> Add Spec Row
              </button>
            </div>

            {/* Pros / Cons */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Pros (one per line)</p>
                <textarea value={prosRaw} onChange={e => setProsRaw(e.target.value)} rows={4}
                  placeholder="Fast performance&#10;Great value&#10;Quiet cooling"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                  style={inputStyle} onFocus={stopProp} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Cons (one per line)</p>
                <textarea value={consRaw} onChange={e => setConsRaw(e.target.value)} rows={4}
                  placeholder="High power draw&#10;Large card size"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                  style={inputStyle} onFocus={stopProp} />
              </div>
            </div>

            {/* Verdict */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Verdict</p>
                <select value={verdict} onChange={e => setVerdict(e.target.value as Verdict | '')}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ ...inputStyle, border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4' }}>
                  <option value="">None</option>
                  {VERDICTS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {inp('Score (0–10)', score, setScore, 'e.g. 8.5', 'number')}
              {inp('Verdict Reason', verdictReason, setVerdictReason, 'Short summary…')}
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

HardwareSpecNodeView.displayName = 'HardwareSpecNodeView';

// --- Node Definition ----------------------------------------------------------

export const HardwareSpecNode = Node.create({
  name: 'hardwareSpec',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      productName: { default: 'Product Name' },
      category: { default: 'GPU' },
      imageUrl: { default: '' },
      msrp: { default: '' },
      verdict: { default: undefined },
      verdictReason: { default: '' },
      score: { default: undefined },
      specs: { default: JSON.stringify([]) },
      pros: { default: JSON.stringify([]) },
      cons: { default: JSON.stringify([]) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="hardware-spec"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'hardware-spec' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HardwareSpecNodeView);
  },
});
