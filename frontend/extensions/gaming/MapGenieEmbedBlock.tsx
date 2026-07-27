import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo } from 'react';
import { renderMapGenieEmbed, MapGenieEmbedAttrs, isValidMapGenieUrl, toEmbedUrl } from '../../lib/gaming-block-renderers';
import { Map, Settings2, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const MapGenieEmbedNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const attrs = node.attrs as MapGenieEmbedAttrs;

  const [isEditing, setIsEditing] = useState(!attrs.url);
  const [urlInput, setUrlInput] = useState(attrs.url ?? '');
  const [titleInput, setTitleInput] = useState(attrs.title ?? '');
  const [error, setError] = useState('');

  const inputStyle = { background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };
  const labelStyle = { color: 'var(--ed-text-muted, #8090a8)' } as const;

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'BUTTON', 'TEXTAREA'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const handleSave = () => {
    const trimmed = urlInput.trim();
    if (!isValidMapGenieUrl(trimmed)) {
      setError('Please paste a valid mapgenie.io map URL (e.g. https://mapgenie.io/game-name/maps/region)');
      return;
    }
    setError('');
    updateAttributes({ url: toEmbedUrl(trimmed), title: titleInput.trim() });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="mapgenie-embed-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      {/* Editor-only preview card — avoids Cloudflare iframe block on non-production origins */}
      <div className={cn(
        'flex flex-col rounded-xl border overflow-hidden transition-all duration-200',
        selected && !isEditing ? 'ring-2 ring-sky-500/50' : '',
      )} style={{ border: '1px solid rgba(56,189,248,0.25)', background: 'var(--ed-elevated, #0d1527)' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(56,189,248,0.12)', background: 'rgba(14,165,233,0.08)' }}>
          <Map className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-sm font-bold text-white truncate">
            {attrs.title || 'MapGenie Map'}
          </span>
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-sky-500/60 shrink-0">MapGenie</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-6" style={{ aspectRatio: '16/9' }}>
          {attrs.url ? (
            <>
              <Map className="w-10 h-10 text-sky-400/40" />
              <p className="text-sm text-slate-300 font-medium text-center">Interactive map will appear here when published</p>
              <a
                href={attrs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-sky-400 hover:underline break-all text-center max-w-md"
                onMouseDown={stopProp}
              >
                {attrs.url}
              </a>
            </>
          ) : (
            <>
              <Map className="w-10 h-10 text-slate-600" />
              <p className="text-sm text-slate-500 italic">No map URL set — click Edit to add one</p>
            </>
          )}
        </div>
        <div className="px-4 py-2 text-right text-[11px] text-slate-500" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          Map data via <span className="text-sky-400">MapGenie</span> · Live map visible on published article
        </div>
      </div>

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => { setUrlInput(attrs.url ?? ''); setTitleInput(attrs.title ?? ''); setIsEditing(true); }} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-sky-400 rounded-lg border border-sky-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Settings2 className="w-3.5 h-3.5" /> Edit
          </button>
        ) : (
          <button type="button" onClick={handleSave} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-green-600/90 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        )}
        <button type="button" onClick={deleteNode} onMouseDown={stopProp}
          className="px-2 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Edit panel */}
      {isEditing && (
        <div
          className="relative z-50 mt-3 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(56,189,248,0.2)' }}
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">MapGenie Embed</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={labelStyle}>MapGenie Map URL</p>
              <input
                type="text"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setError(''); }}
                placeholder="https://mapgenie.io/game-name/maps/region"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
                onFocus={stopProp}
              />
              <p className="text-[11px] mt-1.5" style={labelStyle}>
                Copy the map URL from mapgenie.io — only mapgenie.io links are accepted.
              </p>
              {error && (
                <p className="flex items-center gap-1.5 text-[11px] mt-1.5 text-red-400">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={labelStyle}>Title (optional)</p>
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                placeholder="e.g. Forza Horizon 6 — Japan Map"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
                onFocus={stopProp}
              />
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

MapGenieEmbedNodeView.displayName = 'MapGenieEmbedNodeView';

// --- Node Definition ----------------------------------------------------------

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mapGenieEmbed: {
      insertMapGenieEmbed: () => ReturnType;
    };
  }
}

export const MapGenieEmbedNode = Node.create({
  name: 'mapGenieEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: '' },
      title: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mapgenie-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mapgenie-embed' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MapGenieEmbedNodeView);
  },

  addCommands() {
    return {
      insertMapGenieEmbed: () => ({ commands }) => {
        return commands.insertContent({ type: this.name });
      },
    };
  },
});
