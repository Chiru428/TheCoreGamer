import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderVideoTimestamp, VideoTimestampAttrs } from '../../lib/gaming-block-renderers';
import { Clock, Settings2, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMBED_TYPES = ['youtube', 'mux'] as const;

// --- Node View ----------------------------------------------------------------

const VideoTimestampNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);

  const attrs = node.attrs as VideoTimestampAttrs;

  const [embedType, setEmbedType] = useState<'youtube' | 'mux'>((attrs.embedType as 'youtube' | 'mux') ?? 'youtube');
  const [embedId, setEmbedId] = useState(attrs.embedId ?? '');
  const [timestamp, setTimestamp] = useState(String(attrs.timestamp ?? 0));
  const [label, setLabel] = useState(attrs.label ?? 'Key Moment');
  const [thumbnailUrl, setThumbnailUrl] = useState(attrs.thumbnailUrl ?? '');

  useEffect(() => {
    if (!attrs.embedId) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => {
    updateAttributes({ embedType, embedId, timestamp: Number(timestamp) || 0, label, thumbnailUrl });
  };

  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const previewAttrs: VideoTimestampAttrs = {
    embedType, embedId, timestamp: Number(timestamp) || 0, label, thumbnailUrl,
  };

  const input = (label: string, value: string, onChange: (v: string) => void, placeholder = '', type = 'text') => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">{label}</p>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
        onFocus={stopProp} />
    </div>
  );

  return (
    <NodeViewWrapper className="video-timestamp-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      <div className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-green-500/50 rounded-lg shadow-lg')}
        dangerouslySetInnerHTML={{ __html: renderVideoTimestamp(previewAttrs) }} />

      {/* Toolbar */}
      <div className={cn('absolute top-1 right-1 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-green-400 rounded-lg border border-green-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
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
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(74,222,128,0.2)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Video Timestamp</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Embed Type</p>
                <select value={embedType} onChange={e => setEmbedType(e.target.value as 'youtube' | 'mux')}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                  {EMBED_TYPES.map(o => <option key={o} value={o}>{o === 'youtube' ? 'YouTube' : 'Mux (self-hosted)'}</option>)}
                </select>
              </div>
              {input('Timestamp (seconds)', timestamp, setTimestamp, 'e.g. 183', 'number')}
            </div>
            {input('Video ID', embedId, setEmbedId, embedType === 'youtube' ? 'e.g. dQw4w9WgXcQ' : 'e.g. mux-playback-id')}
            {input('Label (displayed on pill)', label, setLabel, 'e.g. Final Boss Reveal')}
            {input('Thumbnail URL (optional)', thumbnailUrl, setThumbnailUrl, 'https://...')}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

VideoTimestampNodeView.displayName = 'VideoTimestampNodeView';

// --- Node Definition ----------------------------------------------------------

export const VideoTimestampNode = Node.create({
  name: 'videoTimestamp',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      embedType: { default: 'youtube' },
      embedId: { default: '' },
      timestamp: { default: 0 },
      label: { default: 'Key Moment' },
      thumbnailUrl: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video-timestamp"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'video-timestamp' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoTimestampNodeView);
  },
});
