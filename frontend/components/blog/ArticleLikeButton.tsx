'use client';

import { useState, useEffect } from 'react';
import { toggleReaction } from '@/lib/api';

export default function ArticleLikeButton({
  articleId,
  initialCount = 0,
}: {
  articleId: string;
  initialCount?: number;
}) {
  const storageKey = `liked_article_${articleId}`;
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    try {
      const isLikedLocally = localStorage.getItem(storageKey) === '1';
      setLiked(isLikedLocally);
      
      if (isLikedLocally && initialCount === 0) {
        setCount(1);
      } else {
        setCount(initialCount);
      }
    } catch {}
  }, [storageKey, initialCount]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    setCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    
    // Optimistic UI update for local storage
    try {
      if (next) localStorage.setItem(storageKey, '1');
      else localStorage.removeItem(storageKey);
    } catch {}

    // Sync with backend API
    try {
      await toggleReaction(articleId, 'LIKE');
    } catch (err) {
      console.error('Failed to sync like:', err);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggle}
        className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
        style={{ backgroundColor: liked ? '#ef4444' : '#6b7280' }}
        aria-label={liked ? 'Unlike' : 'Like'}
        aria-pressed={liked}
        title={liked ? 'Unlike' : 'Like'}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      {count > 0 && (
        <span style={{ fontFamily: '"acumin-pro-condensed", sans-serif', fontSize: '14px', color: 'var(--text-muted)' }}>{count}</span>
      )}
    </div>
  );
}
