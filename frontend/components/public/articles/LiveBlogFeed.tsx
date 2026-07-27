'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import ArticleBody from '@/components/blog/ArticleBody';
import { fetchLiveUpdates } from '@/lib/api';
import { getInitials, formatDate } from '@/lib/utils';
import type { LiveBlogUpdate } from '@/types';

interface LiveBlogFeedProps {
  articleSlug: string;
  initialUpdates: LiveBlogUpdate[];
  isEnded: boolean;
  liveBlogEndedAt?: string | null;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function LiveBlogFeed({ articleSlug, initialUpdates, isEnded, liveBlogEndedAt }: LiveBlogFeedProps) {
  const { data } = useSWR(
    `/api/articles/${articleSlug}/live-updates`,
    () => fetchLiveUpdates(articleSlug).then((r) => r.data || []),
    {
      fallbackData: initialUpdates,
      refreshInterval: isEnded ? 0 : 30000,
      revalidateOnFocus: !isEnded,
    }
  );

  // Pinned updates float to top; everything else newest-first
  const sorted = useMemo(() => {
    const updates = data || initialUpdates || [];
    return [...updates].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [data, initialUpdates]);

  // Track which update IDs have already been rendered so only newly-arrived
  // updates play the slide-in animation.
  const [knownIds, setKnownIds] = useState<Set<string>>(() => new Set(initialUpdates.map((u) => u.id)));
  useEffect(() => {
    setKnownIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      sorted.forEach((u) => {
        if (!next.has(u.id)) {
          next.add(u.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [sorted]);

  const now = new Date();

  return (
    <div className="mb-6">
      {!isEnded ? (
        <div className="flex items-center gap-2 mb-3">
          <span className="live-badge">
            <span className="live-dot" />
            Live
          </span>
          <span className="text-xs" style={{ color: 'var(--text)' }}>
            This blog is updating automatically
          </span>
        </div>
      ) : (
        <div
          className="mb-3 text-sm"
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '10px 14px',
            color: 'var(--text)',
          }}
        >
          Event concluded
          {liveBlogEndedAt && (
            <span style={{ color: 'var(--muted3)' }}> · {formatDate(liveBlogEndedAt)} at {formatTime(liveBlogEndedAt)}</span>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {sorted.map((update) => {
          const published = new Date(update.publishedAt);
          const showDate = !isSameDay(published, now);
          const isNew = !knownIds.has(update.id);
          const author = update.author;

          return (
            <motion.div
              key={update.id}
              layout
              initial={isNew ? { opacity: 0, y: -20, height: 0 } : false}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderLeft: update.isPinned ? '3px solid var(--gold)' : '1px solid var(--border)',
                borderRadius: '6px',
                padding: '12px 14px',
                marginBottom: '8px',
                overflow: 'hidden',
              }}
            >
              {update.isPinned && (
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--gold)' }}
                >
                  📌 Pinned Update
                </div>
              )}

              {update.label && (
                <div className="mb-2">
                  <span className="live-badge">{update.label}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                  [{formatTime(update.publishedAt)}]
                  {showDate && ` · ${formatDate(update.publishedAt)}`}
                </span>

                {author && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    {author.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={author.avatarUrl}
                        alt={author.displayName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold">
                        {getInitials(author.displayName)}
                      </div>
                    )}
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-strong)' }}>
                      {author.displayName}
                    </span>
                  </div>
                )}
              </div>

              <ArticleBody content={update.content} slug={articleSlug} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
