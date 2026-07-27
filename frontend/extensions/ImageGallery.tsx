import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect } from 'react'
import { uploadImage } from '@/lib/api'

const ImageGalleryComponent = (props: any) => {
  const { node, updateAttributes, deleteNode } = props
  const images = node.attrs.images || []

  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [urlInput, setUrlInput] = useState('')

  // Lightbox state
  const [lbOpen, setLbOpen] = useState(false)
  const [lbIndex, setLbIndex] = useState(0)
  const [imgVisible, setImgVisible] = useState(true)

  // Build image pool from all filled slots
  const lbImages = images.filter((img: any) => img.src)

  const openLightbox = (index: number) => {
    setLbIndex(index)
    setLbOpen(true)
  }

  const closeLightbox = () => setLbOpen(false)

  const goTo = (index: number) => {
    const next = (index + lbImages.length) % lbImages.length
    setImgVisible(false)
    setTimeout(() => {
      setLbIndex(next)
      setImgVisible(true)
    }, 180)
  }

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lbOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(lbIndex - 1)
      if (e.key === 'ArrowRight') goTo(lbIndex + 1)
      if (e.key === 'Escape') closeLightbox()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lbOpen, lbIndex, lbImages.length])

  const updateImage = (index: number, updates: any) => {
    const newImages = [...images]
    if (!newImages[index]) newImages[index] = {}
    newImages[index] = { ...newImages[index], ...updates }
    updateAttributes({ images: newImages })
  }

  const removeImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    updateAttributes({ images: newImages })
  }

  const handleUpload = async (index: number) => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const res = await uploadImage(file)
        if (res.data?.url) {
          updateImage(index, { src: res.data.url })
        }
      } catch (err) {
        console.error('Failed to upload image', err)
      }
    }
    fileInput.click()
  }

  const handleUrlSubmit = (index: number) => {
    if (urlInput) {
      updateImage(index, { src: urlInput })
    }
    setEditingSlot(null)
    setUrlInput('')
  }

  const renderSlot = (index: number, isPlaceholder = false) => {
    const imgData = images[index] || {}
    const src = imgData.src
    const alt = imgData.alt || ''
    const caption = imgData.caption || ''
    const credit = imgData.credit || ''

    if (src) {
      const lbIdxForSlot = lbImages.findIndex((img: any) => img.src === src)
      return (
        <div key={index} className="flex flex-col gap-2 w-64 shrink-0 bg-gray-800/40 p-2 rounded-md border border-gray-700/50 h-full">
          <div className="relative group w-full h-36">
            <img
              src={src}
              alt={alt}
              onClick={() => openLightbox(lbIdxForSlot)}
              className="w-full h-full object-cover block rounded cursor-pointer"
            />
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); handleUpload(index); }}
                className="w-6 h-6 bg-blue-600/90 hover:bg-blue-500 text-white rounded flex items-center justify-center text-xs"
                title="Replace image"
              >📁</button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="w-6 h-6 bg-red-600/90 hover:bg-red-500 text-white rounded flex items-center justify-center"
                title="Remove image"
              >✕</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <input
              type="text"
              placeholder="Alt Text (Required)"
              value={alt}
              onChange={e => updateImage(index, { alt: e.target.value })}
              onKeyDown={e => e.stopPropagation()}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:border-cyan-500/50 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Caption (Optional)"
              value={caption}
              onChange={e => updateImage(index, { caption: e.target.value })}
              onKeyDown={e => e.stopPropagation()}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:border-cyan-500/50 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Credit (Optional)"
              value={credit}
              onChange={e => updateImage(index, { credit: e.target.value })}
              onKeyDown={e => e.stopPropagation()}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>
      )
    }

    if (editingSlot === index) {
      return (
        <div key={index} className="flex flex-col justify-center gap-2 p-3 border-2 border-cyan-500/50 rounded-md bg-slate-900 w-64 shrink-0 h-36">
          <input
            autoFocus
            type="url"
            placeholder="Paste URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUrlSubmit(index)
              if (e.key === 'Escape') setEditingSlot(null)
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-cyan-500/30"
          />
          <div className="flex w-full gap-1">
            <button onClick={() => handleUrlSubmit(index)} className="flex-1 bg-cyan-600 text-white text-[10px] py-1 rounded">Add</button>
            <button onClick={() => setEditingSlot(null)} className="flex-1 bg-slate-700 text-white text-[10px] py-1 rounded">Cancel</button>
          </div>
        </div>
      )
    }

    return (
      <div key={index} className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-600 rounded-md bg-gray-800/40 w-64 shrink-0 h-36">
        <button type="button" onClick={() => handleUpload(index)} className="px-2.5 py-1.5 mb-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-colors">
          📁 Upload
        </button>
        <button type="button" onClick={() => { setEditingSlot(index); setUrlInput('') }} className="text-[10px] text-blue-400 hover:underline transition-colors">
          🔗 Enter URL
        </button>
      </div>
    )
  }

  const currentImg = lbImages[lbIndex]

  return (
    <NodeViewWrapper className="relative image-gallery-node" data-drag-handle>
      {/* Delete button */}
      <button
        type="button"
        contentEditable={false}
        onClick={deleteNode}
        className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs z-10 transition-opacity"
        style={{ opacity: 0.5 }}
      >✕</button>

      {/* Horizontal scrollable row */}
      <div
        contentEditable={false}
        className="flex overflow-x-auto gap-4 p-2 items-start"
        style={{ scrollbarWidth: 'thin' }}
      >
        {images.map((_: any, idx: number) => renderSlot(idx))}
        {/* Placeholder slot for adding a new image */}
        {renderSlot(images.length, true)}
      </div>

      {/* Lightbox */}
      {lbOpen && (
        <div
          contentEditable={false}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.80)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={closeLightbox}
        >
          <div
            style={{
              position: 'relative',
              background: '#0f172a',
              borderRadius: 12,
              overflow: 'hidden',
              maxWidth: 672,
              width: 'calc(100% - 32px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              style={{
                position: 'absolute', top: 10, right: 10, zIndex: 3,
                background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>

            {/* Image area */}
            <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: '#000', position: 'relative' }}>
              {/* Prev */}
              <button
                onClick={() => goTo(lbIndex - 1)}
                style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
                  background: 'rgba(0,0,0,0.50)', border: 'none', borderRadius: '50%',
                  width: 40, height: 40, cursor: 'pointer', color: '#fff', fontSize: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >‹</button>

              <img
                src={currentImg?.src}
                alt={currentImg?.alt}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  opacity: imgVisible ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                  display: 'block',
                }}
              />

              {/* Next */}
              <button
                onClick={() => goTo(lbIndex + 1)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
                  background: 'rgba(0,0,0,0.50)', border: 'none', borderRadius: '50%',
                  width: 40, height: 40, cursor: 'pointer', color: '#fff', fontSize: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >›</button>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 13, color: '#94a3b8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentImg?.alt}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '0 12px' }}>
                {lbImages.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    style={{
                      width: 6, height: 6, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: i === lbIndex ? '#E2A83A' : 'rgba(255,255,255,0.25)',
                      transform: i === lbIndex ? 'scale(1.4)' : 'scale(1)',
                      transition: 'background 0.2s, transform 0.2s',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', flexShrink: 0 }}>
                {lbIndex + 1} / {lbImages.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}

const ImageGallery = Node.create({
  name: 'imageGallery',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      images: { default: [] },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.gc-gallery',
        getAttrs: (node) => {
          if (typeof node === 'string') return {}
          const imgs = (node as HTMLElement).querySelectorAll('img')
          const images = Array.from(imgs).map(img => ({
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
            caption: img.getAttribute('data-caption') || '',
            credit: img.getAttribute('data-credit') || '',
          }))
          return { images }
        }
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const imagesAttr = HTMLAttributes.images || []
    const renderedImages = imagesAttr.map((img: any, i: number) => {
      const attrs: any = { src: img.src, alt: img.alt || `Image ${i+1}`, loading: 'lazy', decoding: 'async' }
      if (img.caption) attrs['data-caption'] = img.caption
      if (img.credit) attrs['data-credit'] = img.credit
      return ['img', attrs]
    })

    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'gc-gallery', 'data-type': 'gallery' }),
      ...renderedImages
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageGalleryComponent)
  },
})

export default ImageGallery
