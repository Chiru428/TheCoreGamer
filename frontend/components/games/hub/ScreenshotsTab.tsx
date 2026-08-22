'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Camera, Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Lightbox, SubmitForm } from '@/components/games/ScreenshotGallery';
import { fetchGameScreenshotsFull } from '@/lib/api';
import type { GameHubData, UserScreenshot } from '@/types';
import styles from './gamehub.module.css';

export default function ScreenshotsTab({ slug, game }: { slug: string; game: GameHubData }) {
  const { data: session } = useSession();
  const viewerId = session?.user?.id;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [officialIndex, setOfficialIndex] = useState<number | null>(null);
  const [communityIndex, setCommunityIndex] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const activeVideoThumbRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeVideo !== null) {
      activeVideoThumbRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeVideo]);

  useEffect(() => {
    if (activeVideo !== null) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [activeVideo]);
  const [showUpload, setShowUpload] = useState(false);

  const ITEMS_LIMIT = 9;
  const [videoLimit, setVideoLimit] = useState(ITEMS_LIMIT);
  const [officialLimit, setOfficialLimit] = useState(ITEMS_LIMIT);
  const [communityLimit, setCommunityLimit] = useState(ITEMS_LIMIT);

  const { data, mutate, isLoading } = useSWR(
    `game-screenshots-full-${slug}`,
    () => fetchGameScreenshotsFull(slug).then((r) => r.data)
  );

  const videos = game.videosJson ?? [];

  const officialItems: UserScreenshot[] = useMemo(
    () =>
      (data?.official ?? []).map(
        (o) =>
          ({
            id: o.id,
            gameId: '',
            userId: '',
            imageUrl: o.imageUrl.replace('t_screenshot_huge', 't_1080p'),
            caption: game.developer ? `${o.caption || 'Official artwork'} | Credit: ${game.developer}` : o.caption,
            status: 'APPROVED',
            createdAt: '',
          }) as UserScreenshot
      ),
    [data, game.developer]
  );

  const communityItems: UserScreenshot[] = data?.screenshots ?? [];

  return (
    <div>
      {/* -- Videos ------------------------------------------------------- */}
      {videos.length > 0 && (
        <div className="mb-8">
          <div className="section-title-bar">Videos ({videos.length})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videos.slice(0, videoLimit).map((v, i) => (
              <button
                key={v.videoId}
                type="button"
                onClick={() => setActiveVideo(i)}
                className="relative aspect-video rounded-none overflow-hidden border border-border group"
              >
                <Image
                  src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`}
                  alt={v.name || 'Video thumbnail'}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                  <Play size={36} className="text-white fill-current" />
                </div>
                {v.name && (
                  <span className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs text-white bg-gradient-to-t from-black/80 to-transparent truncate text-left">
                    {v.name}
                  </span>
                )}
              </button>
            ))}
          </div>
          {videos.length > videoLimit && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setVideoLimit((prev) => prev + ITEMS_LIMIT)}
              >
                View more...
              </button>
            </div>
          )}
        </div>
      )}

      {/* -- Official artwork & screenshots ------------------------------ */}
      <div className="mb-8">
        <div className="section-title-bar">Official Artwork{officialItems.length > 0 ? ` (${officialItems.length})` : ''}</div>
        {isLoading ? (
          <div className={styles.masonryColumns}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`shimmer ${styles.masonryItem}`} style={{ height: 160 + (i % 3) * 60 }} />
            ))}
          </div>
        ) : officialItems.length > 0 ? (
          <>
            <div className={styles.masonryColumns}>
              {officialItems.slice(0, officialLimit).map((shot, i) => (
                <div key={shot.id} className={styles.masonryItem} onClick={() => setOfficialIndex(i)}>
                  <Image
                    src={shot.imageUrl}
                    alt={shot.caption || 'Official artwork'}
                    width={800}
                    height={450}
                    unoptimized
                    className="w-full h-auto block transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
            {officialItems.length > officialLimit && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setOfficialLimit((prev) => prev + ITEMS_LIMIT)}
                >
                  View more...
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>No official artwork available yet.</div>
        )}
      </div>

      {/* -- Community screenshots --------------------------------------- */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="section-title-bar" style={{ marginBottom: 0 }}>
            Community Screenshots{communityItems.length > 0 ? ` (${communityItems.length})` : ''}
          </div>
          {!mounted ? (
            <div className="h-[34px] w-32" />
          ) : viewerId ? (
            <button type="button" className="btn-primary" onClick={() => setShowUpload(true)}>
              <span className="inline-flex items-center gap-2">
                <Camera size={15} /> Submit Screenshot
              </span>
            </button>
          ) : (
            <span className="text-sm" style={{ color: 'var(--muted2)' }}>
              <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Sign in</a>{' '}
              to submit screenshots
            </span>
          )}
        </div>

        {isLoading ? (
          <div className={styles.masonry}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`shimmer ${styles.masonryItem}`} style={{ height: 160 + (i % 3) * 60 }} />
            ))}
          </div>
        ) : communityItems.length > 0 ? (
          <>
            <div className={styles.masonry}>
              {communityItems.slice(0, communityLimit).map((shot, i) => (
                <div key={shot.id} className={styles.masonryItem} onClick={() => setCommunityIndex(i)}>
                  {shot.status === 'PENDING' && shot.userId === viewerId && (
                    <span className={styles.pendingBadge}>Pending Review</span>
                  )}
                  <Image
                    src={shot.imageUrl}
                    alt={shot.caption || 'Screenshot'}
                    width={800}
                    height={450}
                    unoptimized
                    className="w-full h-auto block transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {(shot.User || shot.createdAt) && (
                    <div className={styles.masonryOverlay}>
                      <div className={styles.masonryOverlayText}>
                        {shot.User && <div>{shot.User.displayName}</div>}
                        {shot.createdAt && (
                          <div className={styles.date}>{new Date(shot.createdAt).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  )}
                  {shot.User && (
                    <div className={styles.masonryCaption}>Submitted by {shot.User.displayName}</div>
                  )}
                </div>
              ))}
            </div>
            {communityItems.length > communityLimit && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCommunityLimit((prev) => prev + ITEMS_LIMIT)}
                >
                  View more...
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>No screenshots yet. Be the first to share one!</div>
        )}
      </div>

      {officialIndex !== null && (
        <Lightbox
          screenshots={officialItems}
          index={officialIndex}
          onClose={() => setOfficialIndex(null)}
          onNavigate={setOfficialIndex}
        />
      )}

      {communityIndex !== null && (
        <Lightbox
          screenshots={communityItems}
          index={communityIndex}
          onClose={() => setCommunityIndex(null)}
          onNavigate={setCommunityIndex}
        />
      )}

      {/* Video player modal */}
      {activeVideo !== null && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black py-4 md:p-8"
          onClick={() => setActiveVideo(null)}
        >
          <button
            className="absolute top-6 right-6 z-[110] p-3 bg-white/10 hover:bg-red-600 text-white rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-md border border-white/10 shadow-2xl"
            onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }}
            aria-label="Close video"
          >
            <X size={28} />
          </button>
          
          {/* Mobile Title & Arrows */}
          <div className="flex md:hidden w-full max-w-5xl justify-between items-center mb-4 px-4 z-[110]">
            {videos.length > 1 ? (
              <button
                className="p-2 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all border border-white/20 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveVideo(activeVideo === 0 ? videos.length - 1 : activeVideo - 1);
                }}
                aria-label="Previous video"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : (
              <div className="w-10" />
            )}

            <div className="text-center px-2 flex-1">
              <h3 className="text-white text-base font-bold line-clamp-1">
                {videos[activeVideo].name || 'Video'}
              </h3>
              {videos.length > 1 && (
                <span className="text-white/70 text-xs font-medium tracking-wide block mt-0.5">
                  {activeVideo + 1} of {videos.length}
                </span>
              )}
            </div>

            {videos.length > 1 ? (
              <button
                className="p-2 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all border border-white/20 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveVideo(activeVideo === videos.length - 1 ? 0 : activeVideo + 1);
                }}
                aria-label="Next video"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            ) : (
              <div className="w-10" />
            )}
          </div>

          {/* Desktop Title */}
          <div className="hidden md:block w-full max-w-5xl mb-4 text-center z-[110] pointer-events-none">
            <h3 className="text-white text-2xl font-bold drop-shadow-md">
              {videos[activeVideo].name || 'Video'}
            </h3>
            {videos.length > 1 && (
              <p className="text-white/70 text-sm mt-1 font-medium tracking-wide">
                {activeVideo + 1} of {videos.length}
              </p>
            )}
          </div>

          <div className="relative w-full max-w-5xl mb-6 flex items-center justify-center">
            {videos.length > 1 && (
              <button
                className="hidden md:block absolute -left-24 top-1/2 -translate-y-1/2 z-[110] p-3 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all backdrop-blur-md opacity-70 hover:opacity-100 hover:scale-110 border border-white/20 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveVideo(activeVideo === 0 ? videos.length - 1 : activeVideo - 1);
                }}
                aria-label="Previous video"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            <div
              className="w-full aspect-video border border-white/10 bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`${videos[activeVideo].youtubeEmbedUrl}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={videos[activeVideo].name || `${game.title} Video`}
              />
            </div>

            {videos.length > 1 && (
              <button
                className="hidden md:block absolute -right-24 top-1/2 -translate-y-1/2 z-[110] p-3 bg-white/10 hover:bg-[#00A5E0] text-white rounded-full transition-all backdrop-blur-md opacity-70 hover:opacity-100 hover:scale-110 border border-white/20 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveVideo(activeVideo === videos.length - 1 ? 0 : activeVideo + 1);
                }}
                aria-label="Next video"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>

          {videos.length > 1 && (
            <div 
              className="flex gap-3 overflow-x-auto max-w-5xl w-full pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent px-4 md:px-0"
              onClick={(e) => e.stopPropagation()}
            >
              {videos.map((v, i) => (
                <button
                  key={v.videoId || i}
                  ref={i === activeVideo ? activeVideoThumbRef : undefined}
                  onClick={() => setActiveVideo(i)}
                  className={`relative shrink-0 w-32 md:w-40 aspect-video rounded-none overflow-hidden border-2 transition-all ${
                    i === activeVideo ? 'border-accent scale-105 opacity-100 z-10' : 'border-transparent opacity-40 hover:opacity-100'
                  }`}
                  aria-label={`Play ${v.name || 'Video'}`}
                >
                  <Image
                    src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`}
                    alt={v.name || 'Video thumbnail'}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  {i === activeVideo && (
                    <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white drop-shadow-md" />
                    </div>
                  )}
                  {i !== activeVideo && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity hover:bg-black/10">
                      <Play className="w-6 h-6 text-white/80 fill-current drop-shadow-sm" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && viewerId && (
        <div className={styles.modalOverlay} onClick={() => setShowUpload(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                aria-label="Close upload form"
                style={{ color: 'var(--muted2)' }}
              >
                <X size={20} />
              </button>
            </div>
            <SubmitForm
              slug={slug}
              onSubmitted={() => {
                setShowUpload(false);
                mutate();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
