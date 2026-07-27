'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

interface Props {
  src: string;
  alt: string;
  credit?: string | null;
  priority?: boolean;
}

export default function FeaturedImage({ src, alt, credit, priority }: Props) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isZoomed) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsZoomed(false); };
    document.addEventListener('keydown', onKey);
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isZoomed]);

  return (
    <>
      <div className="relative left-1/2 -ml-[50vw] w-screen md:left-0 md:ml-0 md:w-full aspect-video overflow-hidden mt-4 md:mt-6 rounded-none border-0 md:border md:border-border/50 cursor-zoom-in"
        onClick={() => setIsZoomed(true)}
      >
        <Image 
          src={src} 
          alt={alt} 
          fill 
          className="object-cover object-center" 
          priority={priority} 
          sizes="(max-width: 1024px) 100vw, 850px" 
        />
      </div>
      {credit && (
        <p className="text-[11px] text-text-dim mt-1 mb-4 md:mb-6 px-4 md:px-0">
          © {credit}
        </p>
      )}

      {mounted && isZoomed && createPortal(
        <div className="gc-img-lightbox-backdrop" onClick={() => setIsZoomed(false)}>
          <button type="button" className="gc-img-lightbox-close" aria-label="Close image preview" onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <img
            src={src}
            alt={alt}
            className="gc-img-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}
