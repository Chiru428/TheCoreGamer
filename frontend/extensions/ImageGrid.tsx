import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useState } from 'react'
import { uploadImage } from '@/lib/api' // using the existing api upload

const ImageGridComponent = (props: any) => {
  const { node, updateAttributes, deleteNode } = props
  const { src1, alt1, caption1, src2, alt2, caption2 } = node.attrs
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState('');

  const handleUpload = async (slot: 1 | 2) => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const res = await uploadImage(file)
        if (res.data?.url) {
          if (slot === 1) updateAttributes({ src1: res.data.url })
          else updateAttributes({ src2: res.data.url })
        }
      } catch (err) {
        console.error('Failed to upload image', err)
      }
    }
    fileInput.click()
  }

  const handleUrlSubmit = (slot: number) => {
    if (urlInput) {
      updateAttributes(slot === 1 ? { src1: urlInput } : { src2: urlInput })
    }
    setEditingSlot(null);
    setUrlInput('');
  }

  const renderSlot = (slot: 1 | 2) => {
    const src = slot === 1 ? src1 : src2
    const alt = slot === 1 ? alt1 : alt2
    const caption = slot === 1 ? caption1 : caption2

    if (src) {
      return (
        <figure className="relative group m-0">
          <img src={src} alt={alt} className="w-full aspect-video rounded-none object-cover block" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity rounded-none p-4">
            <input 
              type="text"
              value={alt || ''}
              onChange={e => updateAttributes(slot === 1 ? { alt1: e.target.value } : { alt2: e.target.value })}
              placeholder="Accessibility alt text..."
              className="w-full bg-slate-900/90 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              onClick={e => e.stopPropagation()}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => handleUpload(slot)} className="px-2 py-1 bg-gray-800 text-white rounded text-xs">Replace</button>
              <button type="button" onClick={() => updateAttributes(slot === 1 ? { src1: '' } : { src2: '' })} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Remove</button>
            </div>
          </div>
          <input
            type="text"
            value={caption || ''}
            onChange={(e) => updateAttributes(slot === 1 ? { caption1: e.target.value } : { caption2: e.target.value })}
            placeholder="Add a caption..."
            className="w-full mt-1 text-xs text-center bg-transparent border-none focus:outline-none text-gray-400"
          />
        </figure>
      )
    }

    if (editingSlot === slot) {
      return (
        <div className="flex flex-col items-center justify-center p-4 border-2 border-cyan-500/50 rounded-none bg-slate-900 aspect-video gap-2 animate-in fade-in duration-200">
          <input 
            autoFocus
            type="url"
            placeholder="Paste URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUrlSubmit(slot);
              if (e.key === 'Escape') setEditingSlot(null);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500/30"
          />
          <div className="flex w-full gap-2">
            <button onClick={() => handleUrlSubmit(slot)} className="flex-1 bg-cyan-600 text-white text-xs py-1.5 rounded font-bold">Add Image</button>
            <button onClick={() => setEditingSlot(null)} className="flex-1 bg-slate-700 text-white text-xs py-1.5 rounded font-bold">Cancel</button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-600 rounded-none bg-gray-800/50 aspect-video">
        <button type="button" onClick={() => handleUpload(slot)} className="px-3 py-1.5 mb-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
          📁 Upload Image
        </button>
        <button type="button" onClick={() => { setEditingSlot(slot); setUrlInput(''); }} className="text-xs text-blue-400 hover:underline transition-colors">
          🔗 Enter URL
        </button>
      </div>
    )
  }

  return (
    <NodeViewWrapper className="relative image-grid-node" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '16px 0' }} data-drag-handle>
      <button 
        type="button"
        contentEditable={false}
        onClick={deleteNode} 
        className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 hover:opacity-100 z-10 transition-opacity"
        style={{ opacity: 0.5 }}
      >✕</button>
      {renderSlot(1)}
      {renderSlot(2)}
    </NodeViewWrapper>
  )
}

const ImageGrid = Node.create({
  name: 'imageGrid',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src1: { default: '' },
      alt1: { default: '' },
      caption1: { default: '' },
      src2: { default: '' },
      alt2: { default: '' },
      caption2: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.image-grid-node',
        getAttrs: (node) => {
          if (typeof node === 'string') return {}
          const figures = (node as HTMLElement).querySelectorAll('figure')
          const img1 = figures[0]?.querySelector('img')
          const img2 = figures[1]?.querySelector('img')
          const cap1 = figures[0]?.querySelector('figcaption')
          const cap2 = figures[1]?.querySelector('figcaption')
          return {
            src1: img1?.getAttribute('src') || '',
            alt1: img1?.getAttribute('alt') || '',
            caption1: cap1?.textContent || '',
            src2: img2?.getAttribute('src') || '',
            alt2: img2?.getAttribute('alt') || '',
            caption2: cap2?.textContent || '',
          }
        }
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'image-grid-node', style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px' }),
      ['figure', {}, 
        ['img', { src: HTMLAttributes.src1, alt: HTMLAttributes.alt1 }],
        HTMLAttributes.caption1 ? ['figcaption', {}, HTMLAttributes.caption1] : ''
      ],
      ['figure', {}, 
        ['img', { src: HTMLAttributes.src2, alt: HTMLAttributes.alt2 }],
        HTMLAttributes.caption2 ? ['figcaption', {}, HTMLAttributes.caption2] : ''
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageGridComponent)
  },
})

export default ImageGrid
