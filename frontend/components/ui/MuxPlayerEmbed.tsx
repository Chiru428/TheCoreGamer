'use client';

import { useRef, useState } from 'react';
import Script from 'next/script';
import useSWR from 'swr';
import { ChevronDown } from 'lucide-react';
import { fetchVideoTranscript } from '@/lib/api';

interface MuxPlayerEmbedProps {
  playbackId: string;
  title?: string;
  aspectRatio?: string | null;
  videoAssetId?: string;
}

const TIMESTAMP_SPLIT_REGEX = /(\b\d{1,2}:\d{2}(?::\d{2})?\b)/g;
const TIMESTAMP_TEST_REGEX = /^\d{1,2}:\d{2}(?::\d{2})?$/;

function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

export default function MuxPlayerEmbed({ playbackId, title, aspectRatio, videoAssetId }: MuxPlayerEmbedProps) {
  const paddingTop = aspectRatio === '4:3' ? '75%' : '56.25%'; // default 16:9
  const playerRef = useRef<HTMLElement & { currentTime: number; play?: () => void }>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const { data } = useSWR(
    showTranscript && videoAssetId ? ['video-transcript', videoAssetId] : null,
    () => fetchVideoTranscript(videoAssetId as string).then((r) => r.data)
  );

  const handleSeek = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = seconds;
      playerRef.current.play?.();
    }
  };

  return (
    <div className="mb-6">
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop }}>
        <Script
          src="https://cdn.jsdelivr.net/npm/@mux/mux-player"
          strategy="lazyOnload"
        />
        {/* @ts-expect-error mux-player is an untyped custom element */}
        <mux-player
          ref={playerRef}
          playback-id={playbackId}
          metadata-video-title={title}
          stream-type="on-demand"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {videoAssetId && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-accent transition-colors"
            aria-expanded={showTranscript}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showTranscript ? 'rotate-180' : ''}`} />
            {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
          </button>

          {showTranscript && (
            <div className="mt-3 p-4 rounded-xl bg-bg-elevated border border-border text-sm text-text-muted leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap">
              {!data ? (
                <p>Loading transcript...</p>
              ) : !data.transcript ? (
                <p>No transcript available for this video.</p>
              ) : (
                <p>
                  {data.transcript.split(TIMESTAMP_SPLIT_REGEX).map((part, i) =>
                    TIMESTAMP_TEST_REGEX.test(part) ? (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSeek(timestampToSeconds(part))}
                        className="text-accent hover:underline font-medium"
                      >
                        {part}
                      </button>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
