'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import type { GameVideoEntry } from '@/types';

interface GameTrailerModalProps {
  /** Pre-resolved embed URL (YouTube embed from the stored trailer link). Null if none available. */
  trailerUrl: string | null;
  /** Extracted YouTube video ID. Null for non-YouTube sources. */
  youtubeId: string | null;
  gameTitle: string;
  coverImageUrl: string | null;
  /** YouTube search URL as fallback when no trailer is available */
  youtubeSearchUrl: string;
  /** IGDB videos (trailers, gameplay, etc.) — when present, shown as a selectable list */
  videos?: GameVideoEntry[];
}

export default function GameTrailerModal({
  trailerUrl,
  youtubeId,
  gameTitle,
  coverImageUrl,
  youtubeSearchUrl,
  videos = [],
}: GameTrailerModalProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeVideo, setActiveVideo] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasVideos = videos.length > 0;
  const hasTrailer = hasVideos || !!trailerUrl;

  return (
    <>
      {hasTrailer ? (
        <button
          onClick={() => { setActiveVideo(0); setShowTrailer(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors shadow-lg"
        >
          <Play size={18} className="fill-current" />
          Watch Trailer
        </button>
      ) : (
        <a
          href={youtubeSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition-colors shadow-lg border border-gray-700"
        >
          <Play size={18} className="text-[#FF0000] fill-current" />
          Search Trailer
        </a>
      )}

      {showTrailer && hasTrailer && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-8"
          onClick={() => setShowTrailer(false)}
        >
          {/* Close button outside video container to avoid overlap with player controls */}
          <button
            className="absolute top-6 right-6 z-[110] p-3 bg-white/10 hover:bg-red-600 text-white rounded-full transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-md border border-white/10 shadow-2xl"
            onClick={e => { e.stopPropagation(); setShowTrailer(false); }}
            aria-label="Close trailer"
          >
            <X size={28} />
          </button>

          <div className="flex flex-col gap-3 w-full max-w-5xl" onClick={e => e.stopPropagation()}>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              {hasVideos ? (
                <iframe
                  src={`${videos[activeVideo].youtubeEmbedUrl}?autoplay=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={videos[activeVideo].name || `${gameTitle} Trailer`}
                />
              ) : youtubeId ? (
                <iframe
                  src={`${trailerUrl!.split('?')[0]}?autoplay=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${gameTitle} Official Trailer`}
                />
              ) : (
                <video
                  src={trailerUrl!}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                  poster={coverImageUrl || undefined}
                />
              )}
            </div>

            {/* Video selector — only shown when IGDB returned more than one video */}
            {videos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {videos.map((v, i) => (
                  <button
                    key={v.videoId}
                    type="button"
                    onClick={() => setActiveVideo(i)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                      i === activeVideo
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {v.name || `Video ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
