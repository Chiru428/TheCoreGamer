import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';

const AdSlotComponent = (props: any) => {
  const { selected, deleteNode, node } = props;
  const zoneId = node.attrs.zoneId || 'ADS-02';

  return (
    <NodeViewWrapper className={`my-8 relative group ${selected ? 'ring-2 ring-cyan-500' : ''}`}>
      <div contentEditable={false} className="w-full max-w-[728px] mx-auto h-[250px] bg-slate-900 border border-dashed border-cyan-500/50 flex flex-col items-center justify-center text-cyan-500/70 select-none">
        <span className="text-sm font-bold tracking-widest uppercase mb-2">In-Feed Ad Slot</span>
        <span className="text-xs opacity-75">Zone: {zoneId}</span>
      </div>
      <button
        type="button"
        onClick={deleteNode}
        className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        Delete
      </button>
    </NodeViewWrapper>
  );
};

export default Node.create({
  name: 'adSlot',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      zoneId: {
        default: 'ADS-02',
        parseHTML: element => element.getAttribute('data-zone-id'),
        renderHTML: attributes => {
          if (!attributes.zoneId) {
            return {};
          }
          return { 'data-zone-id': attributes.zoneId };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div.gc-monetization-zone' },
      { tag: 'div.ad-slot-placeholder' },
      { tag: 'div[data-type="in-article-ad"]' } // backwards compatibility
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'gc-monetization-zone' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AdSlotComponent);
  },
});
