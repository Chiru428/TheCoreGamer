import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';

const VideoEmbedComponent = ({ node, updateAttributes, selected }: any) => {
  const { uploadId, playbackId, status } = node.attrs;

  return (
    <NodeViewWrapper className={`video-embed-node ${selected ? 'ProseMirror-selectednode' : ''}`}>
      <div 
        className="w-full relative rounded-xl overflow-hidden bg-bg-elevated border"
        style={{ borderColor: selected ? 'var(--ed-accent)' : 'var(--ed-border)', minHeight: '300px' }}
      >
        {!playbackId ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <h4 className="font-bold text-text-primary mb-2">Processing Video...</h4>
            <p className="text-xs text-text-muted mb-4">Upload ID: {uploadId}</p>
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] text-text-muted mt-4">
              Status: {status || 'PREPARING'}. The video will appear here once ready.
            </p>
          </div>
        ) : (
          <div className="aspect-video w-full bg-black">
             {/* Note: we use a placeholder or iframe for editor mode to avoid loading heavy players unnecessarily */}
             <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-text-muted text-sm">Mux Video (Playback ID: {playbackId})</span>
             </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      uploadId: { default: null },
      playbackId: { default: null },
      status: { default: null },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-mux-upload-id]' },
      { tag: 'div[data-mux-playback-id]' },
      { tag: 'mux-player' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    if (HTMLAttributes.playbackId) {
      return ['mux-player', { 'playback-id': HTMLAttributes.playbackId }, 0];
    }
    return ['div', mergeAttributes(HTMLAttributes, { class: 'mux-video-placeholder', 'data-mux-upload-id': HTMLAttributes.uploadId }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedComponent);
  },
});
