import { Node, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Check, Info, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/lib/api';

// --- Image Node View Component ------------------------------------------------

const ImageNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes, selected } = props;
  const [altValue, setAltValue] = useState(node.attrs.alt || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with node attributes
  useEffect(() => {
    setAltValue(node.attrs.alt || '');
  }, [node.attrs.alt]);

  const handleBlur = () => {
    setIsFocused(false);
    updateAttributes({ alt: altValue });
  };

  const toggleDecorative = () => {
    if (node.attrs.alt === '') {
      updateAttributes({ alt: null });
      setAltValue('');
    } else {
      updateAttributes({ alt: '' });
      setAltValue('');
    }
  };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
  };

  const handleReplace = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const res = await uploadImage(file);
        if (res.data?.url) {
          updateAttributes({ src: res.data.url });
        }
      } catch (err) {
        console.error('Failed to upload replacement image', err);
      }
    };
    fileInput.click();
  };

  const hasFixedSize = !!(node.attrs.width && node.attrs.height);

  return (
    <NodeViewWrapper className="custom-image-wrapper group relative my-6" style={hasFixedSize ? { width: `${node.attrs.width}px`, maxWidth: 'none' } : undefined}>
      <div className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-200",
        selected ? "ring-2 ring-cyan-500 shadow-2xl" : "ring-1 ring-white/10"
      )}>
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || ''}
          style={hasFixedSize ? { width: `${node.attrs.width}px`, height: `${node.attrs.height}px`, maxWidth: 'none', aspectRatio: 'auto', objectFit: 'cover', margin: 0 } : { margin: 0 }}
          className={hasFixedSize ? "block !m-0" : "w-full h-auto block !m-0"}
        />
        
        {/* Missing Alt Warning Overlay */}
        {!node.attrs.alt && node.attrs.alt !== '' && !selected && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500/90 text-black text-[10px] font-bold rounded flex items-center gap-1 shadow-lg backdrop-blur-sm animate-pulse">
            <AlertCircle className="w-3 h-3" />
            ALT TEXT MISSING
          </div>
        )}
      </div>

      {/* Visual Caption rendering */}
      {(node.attrs.title || node.attrs.credit) && (
        <div className="text-center text-[0.8rem] text-slate-500 mt-2">
          {node.attrs.title && <span className="italic">{node.attrs.title}</span>}
          {node.attrs.title && node.attrs.credit && <span className="inline-block mx-3 text-slate-400/50">|</span>}
          {node.attrs.credit && <span className="text-[0.75rem]">{node.attrs.credit}</span>}
        </div>
      )}

      {/* Alt Text Edit Panel - Visible when selected. Fixed comfortable width,
          independent of the image's own box — a 120x120 thumbnail still gets
          a fully readable panel instead of being squeezed to the image width. */}
      {selected && (
        <div
          className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-72 max-w-[calc(100vw-2rem)] p-4 bg-[#0d1527]/95 border border-cyan-500/30 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2"
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-cyan-400">
              <Info className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Image Settings</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={handleReplace}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold transition-all bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30"
              >
                REPLACE
              </button>
              <button 
                type="button"
                onClick={() => props.deleteNode()}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold transition-all bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
              >
                DELETE
              </button>
              <button 
                type="button"
                onClick={toggleDecorative}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold transition-all border",
                  node.attrs.alt === '' 
                    ? "bg-green-500/20 border-green-500/50 text-green-400" 
                    : "bg-slate-800 border-white/5 text-slate-400 hover:text-white"
                )}
              >
                {node.attrs.alt === '' && <ShieldCheck className="w-3 h-3" />}
                DECORATIVE
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <label className="text-[10px] text-slate-400 block mb-1">Alt Text (Accessibility)</label>
              <input 
                ref={inputRef}
                value={altValue}
                onChange={e => setAltValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                placeholder="Describe this image for screen readers..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors pr-8"
              />
              {altValue && !isFocused && (
                <div className="absolute right-2.5 top-[28px] text-green-500">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <div className="relative">
              <label className="text-[10px] text-slate-400 block mb-1">Caption (Visible under image)</label>
              <input
                value={node.attrs.title || ''}
                onChange={e => updateAttributes({ title: e.target.value })}
                placeholder="Enter a visible caption..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <div className="relative">
              <label className="text-[10px] text-slate-400 block mb-1">Credit</label>
              <input
                value={node.attrs.credit || ''}
                onChange={e => updateAttributes({ credit: e.target.value })}
                placeholder="Enter image credit..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-slate-400">Size (px) — blank keeps natural size</label>
                <button
                  type="button"
                  onClick={() => updateAttributes({ width: 120, height: 120 })}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
                >
                  120 × 120
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={node.attrs.width ?? ''}
                  onChange={e => updateAttributes({ width: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Width"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                <span className="text-slate-500 text-xs">×</span>
                <input
                  type="number"
                  min={1}
                  value={node.attrs.height ?? ''}
                  onChange={e => updateAttributes({ height: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Height"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

// --- Node Extension -----------------------------------------------------------

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: {
        default: null,
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes => {
          if (!attributes.title) {
            return {}
          }
          return { title: attributes.title }
        },
      },
      caption: {
        default: null,
        parseHTML: element => element.getAttribute('data-caption'),
        renderHTML: attributes => {
          if (!attributes.caption) return {};
          return { 'data-caption': attributes.caption };
        },
      },
      credit: {
        default: null,
        parseHTML: element => element.getAttribute('data-credit'),
        renderHTML: attributes => {
          if (!attributes.credit) return {};
          return { 'data-credit': attributes.credit };
        },
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width') || element.style.width || null,
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width, style: `width: ${attributes.width}px` };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height') || element.style.height || null,
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height, style: `height: ${attributes.height}px` };
        },
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
