import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect } from 'react';
import { renderSystemRequirements, SystemRequirementsAttrs } from '../../lib/gaming-block-renderers';
import { Monitor, X, Trash2, Save, Settings2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const SystemRequirementsNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const attrs = node.attrs as SystemRequirementsAttrs;

  // Auto-open edit panel when freshly inserted (minimum OS is still the default)
  useEffect(() => {
    if (attrs.minimum?.['OS'] === 'Windows 10 64-bit') {
      setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReqChange = (section: 'minimum' | 'recommended', key: string, value: string) => {
    const newSection = { ...attrs[section], [key]: value };
    updateAttributes({ [section]: newSection });
  };

  const handleKeyChange = (section: 'minimum' | 'recommended', oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const newSection = { ...attrs[section] };
    const value = newSection[oldKey];
    delete newSection[oldKey];
    newSection[newKey] = value;
    updateAttributes({ [section]: newSection });
  };

  const removeReq = (section: 'minimum' | 'recommended', key: string) => {
    const newSection = { ...attrs[section] };
    delete newSection[key];
    updateAttributes({ [section]: newSection });
  };

  const addReq = (section: 'minimum' | 'recommended') => {
    // Add a new requirement with a unique default key
    const baseKey = 'New Requirement';
    let key = baseKey;
    let counter = 1;
    while (attrs[section][key] !== undefined) {
      key = `${baseKey} ${counter++}`;
    }
    handleReqChange(section, key, 'TBD');
  };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    // Prevent ProseMirror from stealing focus if it's a mousedown on a non-input element
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) {
      e.stopPropagation();
      // Prevent ProseMirror from stealing focus
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
      }
    }
  };

  return (
    <NodeViewWrapper className="system-req-node-wrapper relative group" onMouseDown={handleMouseDown}>
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-blue-500 rounded-lg shadow-lg"
        )}
        dangerouslySetInnerHTML={{ __html: renderSystemRequirements(attrs) }} 
      />

      <div className={cn(
        "absolute top-4 right-4 flex gap-2 transition-opacity duration-200",
        (selected || isEditing) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            onMouseDown={stopProp}
          >
            <Settings2 className="w-4 h-4" />
            Edit Requirements
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-2 bg-green-500/80 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            onMouseDown={stopProp}
          >
            <Save className="w-4 h-4" />
            Done
          </button>
        )}
        <button
          type="button"
          onClick={deleteNode}
          className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md"
          onMouseDown={stopProp}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isEditing && (
        <div 
          className="absolute z-50 top-full left-0 right-0 mt-4 p-6 bg-[#0d1527] border border-cyan-500/30 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2"
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Specs Configuration</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(['minimum', 'recommended'] as const).map(section => (
              <div key={section} className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider capitalize">{section} Specs</label>
                  <button 
                    onClick={() => addReq(section)}
                    className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded"
                    onMouseDown={stopProp}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(attrs[section]).map(([key, val]) => (
                    <div key={key} className="flex gap-2 items-center group/row">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => handleKeyChange(section, key, e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase outline-none focus:border-cyan-500/30"
                        onFocus={stopProp}
                      />
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleReqChange(section, key, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/30"
                        onFocus={stopProp}
                      />
                      <button 
                        onClick={() => removeReq(section, key)}
                        className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const SystemRequirementsNode = Node.create({
  name: 'systemRequirements',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      minimum: {
        default: {
          'OS': 'Windows 10 64-bit',
          'CPU': 'Intel i5-8600K',
          'RAM': '8 GB',
          'GPU': 'GTX 1060 6GB',
          'Storage': '50 GB SSD',
        },
      },
      recommended: {
        default: {
          'OS': 'Windows 11 64-bit',
          'CPU': 'Intel i7-12700K',
          'RAM': '16 GB',
          'GPU': 'RTX 3080 10GB',
          'Storage': '50 GB NVMe',
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="system-req"]',
        getAttrs: (el: string | HTMLElement) => {
          if (typeof el === 'string') return null;
          
          const parseSection = (sel: string) => {
            const section = el.querySelector(sel);
            const reqs: Record<string, string> = {};
            section?.querySelectorAll('.req-row').forEach(row => {
              const key = row.querySelector('.req-key')?.textContent || '';
              const val = row.querySelector('.req-val')?.textContent || '';
              if (key) reqs[key] = val;
            });
            return reqs;
          };

          return {
            minimum: parseSection('.minimum'),
            recommended: parseSection('.recommended'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'system-req' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SystemRequirementsNodeView);
  },
});
