import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useRef, memo } from 'react';
import {
  InteractiveMapAttrs,
  MapPin,
  PinCategory,
  PIN_CATEGORY_COLORS,
  PIN_CATEGORIES,
  DEFAULT_INTERACTIVE_MAP,
} from '../../lib/gaming-block-renderers';
import { uploadImage } from '@/lib/api';
import InteractiveMapRenderer from '@/components/public/blocks/InteractiveMapRenderer';
import { Upload, Plus, X, Trash2, MapPin as MapPinIcon, ZoomIn, ZoomOut, RotateCcw, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const genId = () => Math.random().toString(36).slice(2, 10);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface PinFormState {
  label: string;
  description: string;
  category: PinCategory;
}

const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ed-input-text, #fff)' } as const;
const labelStyle = { color: 'var(--ed-text-muted, #8090a8)' } as const;

// --- Shared pin form fields ------------------------------------------------

const PinFields = ({ form, setForm, stopProp }: {
  form: PinFormState;
  setForm: React.Dispatch<React.SetStateAction<PinFormState>>;
  stopProp: (e: React.MouseEvent | React.FocusEvent) => void;
}) => (
  <div className="space-y-2.5">
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>Label</label>
      <input
        type="text"
        value={form.label}
        onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
        onFocus={stopProp}
        placeholder="e.g. Hidden Chest"
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={inputStyle}
      />
    </div>
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>Description</label>
      <textarea
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        onFocus={stopProp}
        rows={2}
        placeholder="What's here?"
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
        style={inputStyle}
      />
    </div>
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>Category</label>
      <select
        value={form.category}
        onChange={e => setForm(f => ({ ...f, category: e.target.value as PinCategory }))}
        onFocus={stopProp}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={inputStyle}
      >
        {PIN_CATEGORIES.map(cat => (
          <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
        ))}
      </select>
    </div>
  </div>
);

// --- Node View Component ------------------------------------------------------

const InteractiveMapNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode, editor } = props;
  const attrs = node.attrs as InteractiveMapAttrs;
  const pins: MapPin[] = Array.isArray(attrs.pins) ? attrs.pins : [];

  const [uploading, setUploading] = useState(false);
  const [addPinMode, setAddPinMode] = useState(false);
  const [scale, setScale] = useState(1);
  const [newPinPos, setNewPinPos] = useState<{ x: number; y: number } | null>(null);
  const [newPinForm, setNewPinForm] = useState<PinFormState>({ label: '', description: '', category: 'LOCATION' });
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PinFormState>({ label: '', description: '', category: 'LOCATION' });

  const stageRef = useRef<HTMLDivElement>(null);

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  // -- Reader view ----------------------------------------------------------
  if (!editor.isEditable) {
    return (
      <NodeViewWrapper className="interactive-map-node-wrapper" style={{ isolation: 'isolate' }}>
        <InteractiveMapRenderer mapData={{ mapImageUrl: attrs.mapImageUrl, title: attrs.title, pins }} />
      </NodeViewWrapper>
    );
  }

  // -- Editor view helpers --------------------------------------------------
  const handleUpload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const res = await uploadImage(file);
        if (res.data?.url) updateAttributes({ mapImageUrl: res.data.url });
      } catch (err) {
        console.error('Failed to upload map image', err);
      } finally {
        setUploading(false);
      }
    };
    fileInput.click();
  };

  const setTitle = (title: string) => updateAttributes({ title });

  const handleStageClick = (e: React.MouseEvent) => {
    if (!addPinMode || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
    setEditingPinId(null);
    setNewPinForm({ label: '', description: '', category: 'LOCATION' });
    setNewPinPos({ x, y });
  };

  const submitNewPin = () => {
    if (!newPinPos || !newPinForm.label.trim()) return;
    const pin: MapPin = {
      id: genId(),
      x: newPinPos.x,
      y: newPinPos.y,
      label: newPinForm.label.trim(),
      description: newPinForm.description.trim(),
      category: newPinForm.category,
    };
    updateAttributes({ pins: [...pins, pin] });
    setNewPinPos(null);
  };

  const startEditPin = (pin: MapPin) => {
    setNewPinPos(null);
    setEditForm({ label: pin.label, description: pin.description, category: pin.category });
    setEditingPinId(pin.id);
  };

  const saveEditPin = () => {
    if (!editingPinId || !editForm.label.trim()) return;
    updateAttributes({
      pins: pins.map(p => (p.id === editingPinId ? { ...p, ...editForm, label: editForm.label.trim() } : p)),
    });
    setEditingPinId(null);
  };

  const deletePin = (id: string) => {
    updateAttributes({ pins: pins.filter(p => p.id !== id) });
    if (editingPinId === id) setEditingPinId(null);
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  const toolbarBtnStyle = { color: 'var(--ed-text-muted, #8090a8)', borderColor: 'rgba(255,255,255,0.15)' } as const;

  return (
    <NodeViewWrapper className="interactive-map-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div
        className={cn('rounded-2xl border overflow-hidden transition-all duration-200', selected && 'ring-2 ring-blue-500/60')}
        style={{ background: 'var(--ed-elevated, #0d1527)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {/* Title */}
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <MapPinIcon className="w-4 h-4 flex-shrink-0" style={labelStyle} />
          <input
            type="text"
            value={attrs.title}
            onChange={e => setTitle(e.target.value)}
            onFocus={stopProp}
            placeholder="Map Title"
            className="flex-1 bg-transparent text-base font-bold uppercase tracking-wide focus:outline-none"
            style={{ color: 'var(--ed-text, #fff)', fontFamily: 'var(--gc-font-heading, inherit)' }}
          />
        </div>

        {/* Map area */}
        {!attrs.mapImageUrl ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3 border-2 border-dashed m-3 rounded-xl" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            <ImageIcon className="w-8 h-8" style={labelStyle} />
            <p className="text-sm" style={labelStyle}>Upload a map image to get started</p>
            <button
              type="button"
              onClick={handleUpload}
              onMouseDown={stopProp}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-600/90 hover:bg-blue-600 text-white disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : 'Upload Map Image'}
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <button
                type="button"
                onClick={() => { setAddPinMode(m => !m); setNewPinPos(null); setEditingPinId(null); }}
                onMouseDown={stopProp}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border',
                  addPinMode ? 'bg-blue-600 text-white border-blue-400/50' : 'border-dashed'
                )}
                style={!addPinMode ? toolbarBtnStyle : undefined}
              >
                <Plus className="w-3.5 h-3.5" /> {addPinMode ? 'Click map to place pin' : 'Add Pin'}
              </button>

              <div className="flex items-center gap-1.5">
                <button type="button" onClick={zoomOut} onMouseDown={stopProp} className="p-1.5 rounded-lg border" style={toolbarBtnStyle} title="Zoom out">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono w-12 text-center" style={labelStyle}>{Math.round(scale * 100)}%</span>
                <button type="button" onClick={zoomIn} onMouseDown={stopProp} className="p-1.5 rounded-lg border" style={toolbarBtnStyle} title="Zoom in">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={resetZoom} onMouseDown={stopProp} className="p-1.5 rounded-lg border" style={toolbarBtnStyle} title="Reset zoom">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={handleUpload} onMouseDown={stopProp} disabled={uploading} className="p-1.5 rounded-lg border" style={toolbarBtnStyle} title="Replace map image">
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Map stage */}
            <div className="overflow-auto" style={{ maxHeight: 480 }}>
              <div
                ref={stageRef}
                onClick={handleStageClick}
                className="relative"
                style={{ transform: `scale(${scale})`, transformOrigin: '0 0', cursor: addPinMode ? 'crosshair' : 'default', width: 'fit-content' }}
              >
                <img src={attrs.mapImageUrl} alt={attrs.title} className="block max-w-none" draggable={false} />
                {pins.map(pin => (
                  <div
                    key={pin.id}
                    onClick={e => { e.stopPropagation(); startEditPin(pin); }}
                    onMouseDown={stopProp}
                    title={pin.label}
                    className="absolute rounded-full border-2 border-white/85 cursor-pointer flex items-center justify-center text-[10px] text-white"
                    style={{
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                      width: 20,
                      height: 20,
                      transform: 'translate(-50%, -50%)',
                      background: PIN_CATEGORY_COLORS[pin.category],
                      boxShadow: editingPinId === pin.id ? `0 0 0 2px #fff, 0 0 0 4px ${PIN_CATEGORY_COLORS[pin.category]}` : undefined,
                      zIndex: 2,
                    }}
                  >
                    {pin.icon || ''}
                  </div>
                ))}
                {newPinPos && (
                  <div
                    className="absolute rounded-full border-2 border-white animate-pulse"
                    style={{
                      left: `${newPinPos.x}%`,
                      top: `${newPinPos.y}%`,
                      width: 20,
                      height: 20,
                      transform: 'translate(-50%, -50%)',
                      background: PIN_CATEGORY_COLORS[newPinForm.category],
                      zIndex: 3,
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* New pin form */}
        {newPinPos && (
          <div className="p-4 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }} onMouseDown={stopProp}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ed-text, #fff)' }}>New Pin</h4>
              <button type="button" onClick={() => setNewPinPos(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <PinFields form={newPinForm} setForm={setNewPinForm} stopProp={stopProp} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNewPinPos(null)} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg" style={labelStyle}>
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNewPin}
                disabled={!newPinForm.label.trim()}
                className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
              >
                Add Pin
              </button>
            </div>
          </div>
        )}

        {/* Edit pin form */}
        {editingPinId && (
          <div className="p-4 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }} onMouseDown={stopProp}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ed-text, #fff)' }}>Edit Pin</h4>
              <button type="button" onClick={() => setEditingPinId(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <PinFields form={editForm} setForm={setEditForm} stopProp={stopProp} />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => deletePin(editingPinId)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingPinId(null)} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg" style={labelStyle}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditPin}
                  disabled={!editForm.label.trim()}
                  className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete node button */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity duration-200', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        <button
          type="button"
          onClick={deleteNode}
          onMouseDown={stopProp}
          className="px-2 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </NodeViewWrapper>
  );
});

InteractiveMapNodeView.displayName = 'InteractiveMapNodeView';

// --- Node Definition ----------------------------------------------------------

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    interactiveMap: {
      insertInteractiveMap: () => ReturnType;
    };
  }
}

export const InteractiveMapNode = Node.create({
  name: 'interactiveMap',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      mapImageUrl: { default: DEFAULT_INTERACTIVE_MAP.mapImageUrl },
      title: { default: DEFAULT_INTERACTIVE_MAP.title },
      pins: { default: DEFAULT_INTERACTIVE_MAP.pins },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="interactive-map"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'interactive-map' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InteractiveMapNodeView);
  },

  addCommands() {
    return {
      insertInteractiveMap: () => ({ commands }) => {
        return commands.insertContent({ type: this.name });
      },
    };
  },
});
