import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React from 'react';
import { Loader2, FileImage } from 'lucide-react';

const ImagePlaceholderView = (props: NodeViewProps) => {
  const { node } = props;
  const { filename, previewUrl } = node.attrs;

  return (
    <NodeViewWrapper className="image-placeholder-wrapper my-6">
      <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-cyan-500/30 bg-slate-900/50 min-h-[200px] flex flex-col items-center justify-center gap-3 group">
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Uploading..." 
            className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale blur-[2px]"
          />
        ) : (
          <FileImage className="w-10 h-10 text-slate-700" />
        )}
        
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="p-3 bg-slate-950/80 rounded-full border border-cyan-500/20 shadow-2xl">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-white uppercase tracking-widest m-0">Uploading Image</p>
            <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px] m-0 mt-1">{filename}</p>
          </div>
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const ImagePlaceholderNode = Node.create({
  name: 'imagePlaceholder',
  group: 'block',
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      filename: { default: '' },
      previewUrl: { default: null },
      uploadId: { default: null }, // Unique ID to find this specific node later
    };
  },

  parseHTML() {
    return []; // Never parsed from existing HTML
  },

  renderHTML() {
    return ['div', { 'data-type': 'image-placeholder', class: 'image-placeholder' }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImagePlaceholderView);
  },
});
