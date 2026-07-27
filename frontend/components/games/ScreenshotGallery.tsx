'use client';

import useSWR from 'swr';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { fetchGameScreenshots, submitGameScreenshot } from '@/lib/api';
import type { UserScreenshot } from '@/types';
import {
  Camera, Loader2, Upload, X, ZoomIn, Plus,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

const VISIBLE_SLOTS = 6;

export function SubmitForm({ slug, onSubmitted }: { slug: string; onSubmitted: () => void }) {
  const { addToast } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) {
      handleFile(dropped);
    } else if (dropped) {
      addToast({ type: 'error', message: 'Please drop an image file' });
    }
  };

  const handleSubmit = async () => {
    if (!file || submitting) return;
    setSubmitting(true);
    const res = await submitGameScreenshot(slug, file, caption.trim() || undefined);
    setSubmitting(false);
    if (res.success) {
      addToast({ type: 'success', message: res.message || 'Screenshot submitted for review' });
      handleFile(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSubmitted();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to submit screenshot' });
    }
  };

  return (
    <div className="p-4 bg-bg-surface border border-accent/30 rounded-xl">
      <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
        <Camera className="w-4 h-4 text-accent" />
        Submit a screenshot
      </h3>

      {preview ? (
        <div className="relative mb-3 rounded-lg overflow-hidden border border-border aspect-video">
          <Image src={preview} alt="Preview" fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 500px" />
          <button
            onClick={() => handleFile(null)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            aria-label="Remove selected image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          className={`w-full mb-3 flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragging
              ? 'border-accent text-accent bg-accent/5'
              : 'border-border text-text-muted hover:border-accent/50 hover:text-accent'
          }`}
        >
          <Upload className="w-6 h-6" />
          <span className="text-sm font-medium">Drag & drop an image, or click to choose</span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={300}
        placeholder="Add a caption (optional)"
        className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent placeholder:text-text-muted"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-muted">Submissions are reviewed by moderators before appearing publicly.</span>
        <button
          onClick={handleSubmit}
          disabled={submitting || !file}
          className="shrink-0 ml-3 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-[#00A5E0]/90 transition-colors flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit
        </button>
      </div>
    </div>
  );
}

/* -- Single mosaic cell (image + hover zoom + sliding caption) ------ */
function MosaicCell({
  screenshot,
  style,
  overlay,
  onClick,
  cellRef,
}: {
  screenshot: UserScreenshot;
  style?: React.CSSProperties;
  overlay?: React.ReactNode;
  onClick: () => void;
  cellRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={cellRef}
      onClick={onClick}
      style={{ borderRadius: 0, ...style }}
      className="group relative overflow-hidden cursor-pointer bg-bg-surface"
    >
      <Image
        src={screenshot.imageUrl}
        alt={screenshot.caption || 'Community screenshot'}
        fill
        unoptimized
        className="object-cover transition-all duration-300 ease-out group-hover:scale-105 group-hover:brightness-[0.68]"
        sizes="(max-width: 640px) 50vw, 33vw"
      />

      {/* Hover zoom icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-black/[0.52] border border-white/[0.22] opacity-0 scale-[0.88] transition-all duration-300 group-hover:opacity-100 group-hover:scale-100">
          <ZoomIn className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Sliding caption bar */}
      {(screenshot.caption || screenshot.User) && (
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 px-2.5 py-2 bg-gradient-to-t from-black/85 to-transparent">
          {screenshot.caption && <p className="text-xs text-white line-clamp-1">{screenshot.caption}</p>}
          {screenshot.User && <p className="text-[10px] text-white/70 mt-0.5">by {screenshot.User.displayName}</p>}
        </div>
      )}

      {overlay}
    </div>
  );
}

/* -- Mosaic grid: 1 large + 2 stacked + 3 across the bottom ---------- */
function MosaicGrid({ screenshots, onOpen }: { screenshots: UserScreenshot[]; onOpen: (index: number) => void }) {
  const visible = screenshots.slice(0, VISIBLE_SLOTS);
  const extra = screenshots.length > VISIBLE_SLOTS ? screenshots.length - VISIBLE_SLOTS : 0;

  return (
    <div className="flex flex-col" style={{ gap: '3px' }}>
      {/* Top: 1 large (left, spans 2 rows) + 2 stacked (right) */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '3px' }}>
        {visible[0] && (
          <MosaicCell
            screenshot={visible[0]}
            style={{ gridColumn: 1, gridRow: '1 / span 2', aspectRatio: '16 / 9' }}
            onClick={() => onOpen(0)}
          />
        )}
        {visible[1] && (
          <MosaicCell
            screenshot={visible[1]}
            style={{ gridColumn: 2, gridRow: 1 }}
            onClick={() => onOpen(1)}
          />
        )}
        {visible[2] && (
          <MosaicCell
            screenshot={visible[2]}
            style={{ gridColumn: 2, gridRow: 2 }}
            onClick={() => onOpen(2)}
          />
        )}
      </div>

      {/* Bottom: 3 across */}
      {visible.length > 3 && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '3px', marginTop: '3px' }}>
          {visible.slice(3, 6).map((s, i) => {
            const slotIndex = i + 3;
            const isLastSlot = slotIndex === VISIBLE_SLOTS - 1;
            return (
              <MosaicCell
                key={s.id}
                screenshot={s}
                style={{ aspectRatio: '16 / 9' }}
                onClick={() => onOpen(slotIndex)}
                overlay={isLastSlot && extra > 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 text-white font-bold text-base sm:text-lg">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{extra} view all</span>
                  </div>
                ) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -- Lightbox: full-viewport overlay rendered via portal into document.body --- */
export function Lightbox({
  screenshots,
  index,
  onClose,
  onNavigate,
}: {
  screenshots: UserScreenshot[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const current = screenshots[index];

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onNavigate(Math.max(0, index - 1));
      else if (e.key === 'ArrowRight') onNavigate(Math.min(screenshots.length - 1, index + 1));
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [index, screenshots.length, onClose, onNavigate]);

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
          {screenshots.length > 1 ? (
            <button
              className="p-2 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all border border-white/20 shadow-lg disabled:opacity-30"
              onClick={(e) => { e.stopPropagation(); onNavigate(Math.max(0, index - 1)); }}
              disabled={index === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : ( <div className="w-10" /> )}
          
          {screenshots.length > 1 && (
            <span className="text-white/80 text-sm font-medium tracking-wide">
              {index + 1} of {screenshots.length}
            </span>
          )}

          {screenshots.length > 1 ? (
            <button
              className="p-2 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all border border-white/20 shadow-lg disabled:opacity-30"
              onClick={(e) => { e.stopPropagation(); onNavigate(Math.min(screenshots.length - 1, index + 1)); }}
              disabled={index === screenshots.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : ( <div className="w-10" /> )}
        </div>

        {/* Desktop Title & Index */}
        <div className="hidden md:block w-full max-w-5xl mb-4 text-center z-[110] pointer-events-none">
          {screenshots.length > 1 && (
            <p className="text-white/70 text-sm mt-1 font-medium tracking-wide">
              {index + 1} of {screenshots.length}
            </p>
          )}
        </div>

        <div className="relative w-full max-w-5xl mb-6 flex items-center justify-center">
          {screenshots.length > 1 && (
            <button
              className="hidden md:block absolute -left-24 top-1/2 -translate-y-1/2 z-[110] p-3 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all backdrop-blur-md opacity-70 hover:opacity-100 hover:scale-110 border border-white/20 shadow-lg disabled:opacity-30 disabled:hover:scale-100"
              onClick={(e) => { e.stopPropagation(); onNavigate(Math.max(0, index - 1)); }}
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
              <Image
                src={current.imageUrl}
                alt={current.caption || 'Screenshot'}
                fill
                unoptimized
                priority
                className="object-contain"
                sizes="100vw"
              />
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between gap-4 flex-wrap p-3 md:p-4 border-t border-white/10 bg-black/40">
               <div className="min-w-0">
                {current.caption && (
                  <p className="truncate text-white text-sm font-medium">
                    {current.caption.includes(' | Credit: ') ? (
                      <>
                        {current.caption.split(' | Credit: ')[0]}
                        <span className="text-white/50">
                          {' | Credit: '}{current.caption.split(' | Credit: ')[1]}
                        </span>
                      </>
                    ) : (
                      current.caption
                    )}
                  </p>
                )}
                {current.User && <p className="text-white/50 text-xs mt-0.5">by {current.User.displayName}</p>}
              </div>
            </div>
          </div>

          {screenshots.length > 1 && (
            <button
              className="hidden md:block absolute -right-24 top-1/2 -translate-y-1/2 z-[110] p-3 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all backdrop-blur-md opacity-70 hover:opacity-100 hover:scale-110 border border-white/20 shadow-lg disabled:opacity-30 disabled:hover:scale-100"
              onClick={(e) => { e.stopPropagation(); onNavigate(Math.min(screenshots.length - 1, index + 1)); }}
              disabled={index === screenshots.length - 1}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>

        {screenshots.length > 1 && (
          <div 
            className="flex gap-3 overflow-x-auto max-w-5xl w-full pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent px-4 md:px-0"
            onClick={(e) => e.stopPropagation()}
          >
            {screenshots.map((s, i) => (
              <button
                key={s.id}
                ref={i === index ? activeThumbRef : undefined}
                onClick={() => onNavigate(i)}
                className={`relative shrink-0 w-32 md:w-40 aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  i === index ? 'border-accent scale-105 opacity-100 z-10' : 'border-transparent opacity-40 hover:opacity-100'
                }`}
              >
                <Image src={s.imageUrl} alt={s.caption || 'Thumbnail'} fill unoptimized className="object-cover" sizes="160px" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

export default function ScreenshotGallery({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const viewerId = session?.user?.id;
  const [showForm, setShowForm] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data, mutate, isLoading } = useSWR(
    `game-screenshots-${slug}`,
    () => fetchGameScreenshots(slug).then((r) => r.data)
  );

  const screenshots: UserScreenshot[] = data ?? [];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  return (
    <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800/50">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-black text-text-strong flex items-center gap-3">
          <span className="w-1.5 h-6 bg-accent rounded-full" />
          Community Screenshots
          {screenshots.length > 0 && (
            <span className="text-sm font-normal text-text-muted">({screenshots.length})</span>
          )}
        </h2>
        {viewerId && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-bg-surface border border-border rounded-lg text-sm font-semibold text-text-primary hover:border-accent/50 hover:text-accent transition-colors flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Submit a screenshot'}
          </button>
        )}
      </div>

      {!viewerId && (
        <p className="text-sm text-text-muted mb-6 p-4 bg-bg-surface border border-border rounded-xl">
          <a href="/login" className="text-accent underline">Sign in</a> to submit your own screenshots.
        </p>
      )}

      {showForm && viewerId && (
        <div className="mb-6">
          <SubmitForm slug={slug} onSubmitted={() => { setShowForm(false); mutate(); }} />
        </div>
      )}

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : screenshots.length > 0 ? (
        <>
          <MosaicGrid screenshots={screenshots} onOpen={openLightbox} />
          {lightboxIndex !== null && (
            <Lightbox
              screenshots={screenshots}
              index={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onNavigate={setLightboxIndex}
            />
          )}
        </>
      ) : (
        <p className="text-sm text-text-muted text-center py-8">
          No community screenshots yet. Be the first to share one!
        </p>
      )}
    </div>
  );
}
