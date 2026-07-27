'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  images: { src: string; alt: string; caption?: string; credit?: string }[];
  initialIndex: number;
  onClose: () => void;
}

export default function GalleryLightbox({ images, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const current = images[index];

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight') setIndex(i => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, images.length]);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  if (!current) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes lb-scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black py-4 md:p-8"
        onClick={onClose}
      >
        <button
          className="absolute top-6 right-6 z-[110] p-3 bg-white/10 hover:bg-red-600 text-white rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-md border border-white/10 shadow-2xl"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close lightbox"
        >
          <X size={28} />
        </button>

        {/* Mobile Nav */}
        <div className="flex md:hidden w-full max-w-5xl justify-between items-center mb-4 px-4 z-[110]">
          {images.length > 1 ? (
            <button
              className="p-2 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all border border-white/20 shadow-lg disabled:opacity-30"
              onClick={(e) => { e.stopPropagation(); setIndex(i => Math.max(0, i - 1)); }}
              disabled={index === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : ( <div className="w-10" /> )}
          
          {images.length > 1 && (
            <span className="text-white/80 text-sm font-medium tracking-wide">
              {index + 1} of {images.length}
            </span>
          )}

          {images.length > 1 ? (
            <button
              className="p-2 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all border border-white/20 shadow-lg disabled:opacity-30"
              onClick={(e) => { e.stopPropagation(); setIndex(i => Math.min(images.length - 1, i + 1)); }}
              disabled={index === images.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : ( <div className="w-10" /> )}
        </div>

        {/* Desktop Title & Index */}
        <div className="hidden md:block w-full max-w-5xl mb-4 text-center z-[110] pointer-events-none">
          {images.length > 1 && (
            <p className="text-white/70 text-sm mt-1 font-medium tracking-wide">
              {index + 1} of {images.length}
            </p>
          )}
        </div>

        <div className="relative w-full max-w-5xl mb-6 flex items-center justify-center">
          {images.length > 1 && (
            <button
              className="hidden md:block absolute -left-24 top-1/2 -translate-y-1/2 z-[110] p-3 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all backdrop-blur-md opacity-70 hover:opacity-100 hover:scale-110 border border-white/20 shadow-lg disabled:opacity-30 disabled:hover:scale-100"
              onClick={(e) => { e.stopPropagation(); setIndex(i => Math.max(0, i - 1)); }}
              disabled={index === 0}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          <div
            className="w-full flex flex-col bg-[#0e121a] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'lb-scale-in 0.18s ease both' }}
          >
            <div className="relative w-full" style={{ aspectRatio: '16 / 9', background: '#04060a' }}>
              <img
                src={current.src}
                alt={current.alt}
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Footer */}
            {(current.alt || current.caption || current.credit) && current.alt !== 'Thumbnail' && current.alt !== 'Image' && !current.alt.startsWith('Image ') && (
              <div className="flex items-center justify-between gap-4 flex-wrap p-3 md:p-4 border-t border-white/10 bg-black/40">
                 <div className="min-w-0">
                    {current.caption ? (
                      <p className="text-white/60 text-[12px] line-clamp-2">
                        {current.caption}
                      </p>
                    ) : (
                      current.alt && (
                        <p className="text-white/60 text-[12px] truncate">
                          {current.alt}
                        </p>
                      )
                    )}
                </div>
                {current.credit && (
                  <div className="text-white/60 text-[12px] whitespace-nowrap shrink-0">
                    <span className="opacity-50">Credit:</span> {current.credit}
                  </div>
                )}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <button
              className="hidden md:block absolute -right-24 top-1/2 -translate-y-1/2 z-[110] p-3 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all backdrop-blur-md opacity-70 hover:opacity-100 hover:scale-110 border border-white/20 shadow-lg disabled:opacity-30 disabled:hover:scale-100"
              onClick={(e) => { e.stopPropagation(); setIndex(i => Math.min(images.length - 1, i + 1)); }}
              disabled={index === images.length - 1}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div 
            className="flex gap-3 overflow-x-auto max-w-5xl w-full pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent px-4 md:px-0"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((img, i) => (
              <button
                key={i}
                ref={i === index ? activeThumbRef : null}
                onClick={() => setIndex(i)}
                className={`relative w-24 md:w-32 aspect-video flex-shrink-0 rounded-md overflow-hidden transition-all duration-200 border-2 ${
                  i === index ? 'border-accent scale-105 opacity-100' : 'border-transparent opacity-40 hover:opacity-80'
                }`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
