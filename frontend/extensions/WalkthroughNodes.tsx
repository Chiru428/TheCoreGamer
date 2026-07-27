import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import React, { memo } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export const WalkthroughContainerNode = Node.create({
  name: 'walkthroughContainer',
  group: 'block',
  content: 'walkthroughStep+',
  
  addAttributes() {
    return {
      title: {
        default: 'Walkthrough Guide',
      }
    };
  },
  
  parseHTML() {
    return [
      { tag: 'div[data-type="walkthrough-container"]' }
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'walkthrough-container' }), 0];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(WalkthroughContainerNodeView);
  }
});

const WalkthroughContainerNodeView = memo(({ node, updateAttributes, getPos, editor }: NodeViewProps) => {
  const addStep = () => {
    if (typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos === 'number') {
        const insertPos = pos + node.nodeSize - 1;
        editor.chain().insertContentAt(insertPos, { 
          type: 'walkthroughStep',
          content: [{ type: 'paragraph' }]
        }).focus().run();
      }
    }
  };

  return (
    <NodeViewWrapper className="walkthrough-container-editor border-2 border-slate-700/50 rounded-xl my-8 bg-slate-900/20 overflow-hidden relative group">
      <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <input 
          value={node.attrs.title}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          className="bg-transparent border-none text-lg font-bold text-white focus:outline-none focus:ring-0 w-full placeholder-slate-500"
          placeholder="Walkthrough Title..."
        />
        <div className="text-xs text-slate-400 whitespace-nowrap px-3 py-1 bg-slate-900 rounded-full font-medium">
          {node.childCount} Steps
        </div>
      </div>
      
      <div className="p-4 flex flex-col gap-4">
        <NodeViewContent className="walkthrough-steps-content min-h-[50px]" />
      </div>

      <div className="bg-slate-800/50 p-2 flex justify-center border-t border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={addStep}
          className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Step
        </button>
      </div>
    </NodeViewWrapper>
  );
});
WalkthroughContainerNodeView.displayName = 'WalkthroughContainerNodeView';

export const WalkthroughStepNode = Node.create({
  name: 'walkthroughStep',
  content: 'block+',
  
  addAttributes() {
    return {
      title: {
        default: 'New Step',
      }
    };
  },
  
  parseHTML() {
    return [
      { tag: 'div[data-type="walkthrough-step"]' }
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'walkthrough-step' }), 0];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(WalkthroughStepNodeView);
  }
});

const WalkthroughStepNodeView = memo(({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  return (
    <NodeViewWrapper className="walkthrough-step-editor flex gap-3 relative group">
      <div className="flex-none pt-1">
        <div contentEditable="false" className="cursor-grab text-slate-500 hover:text-white transition-colors p-1 drag-handle" data-drag-handle>
          <GripVertical className="w-4 h-4" />
        </div>
      </div>
      
      <div className="flex-1 border border-slate-700/50 rounded-lg bg-slate-900/50 overflow-hidden">
        <div className="flex items-center border-b border-slate-700/50 bg-slate-800/80 px-3 py-2">
          <input
            value={node.attrs.title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            className="bg-transparent border-none text-sm font-bold text-white focus:outline-none focus:ring-0 w-full placeholder-slate-500"
            placeholder="Step Title..."
          />
          <button 
            onClick={deleteNode}
            className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove Step"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-3">
          <NodeViewContent className="walkthrough-step-content min-h-[40px] prose-sm prose-invert" />
        </div>
      </div>
    </NodeViewWrapper>
  );
});
WalkthroughStepNodeView.displayName = 'WalkthroughStepNodeView';

import { slashRegistry, SlashItem } from '@/lib/slash-registry';

export const WalkthroughSlashCommand: SlashItem = {
  id: 'walkthrough',
  label: 'Walkthrough Guide',
  icon: '📚',
  group: 'Gaming',
  action: (editor) => {
    editor.chain().focus().insertContent({
      type: 'walkthroughContainer',
      attrs: { title: 'Complete Walkthrough' },
      content: [
        { type: 'walkthroughStep', attrs: { title: 'Getting Started' }, content: [{ type: 'paragraph' }] },
        { type: 'walkthroughStep', attrs: { title: 'Next Steps' }, content: [{ type: 'paragraph' }] },
        { type: 'walkthroughStep', attrs: { title: 'Completion' }, content: [{ type: 'paragraph' }] }
      ]
    }).run();
  }
};

slashRegistry.register([WalkthroughSlashCommand]);
