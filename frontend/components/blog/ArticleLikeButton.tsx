'use client';

import { useState, useEffect } from 'react';
import { toggleReaction, fetchReactions } from '@/lib/api';

export default function ArticleLikeButton({
  articleId,
  initialCount = 0,
  hideCount = false,
  variant = 'default',
}: {
  articleId: string;
  initialCount?: number;
  hideCount?: boolean;
  variant?: 'default' | 'sidebar';
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

    fetchReactions(articleId).then(res => {
      if (res.success && res.data) {
        const hasLiked = res.data.userReactions?.includes('LIKE') || false;
        setLiked(hasLiked);
        setCount(res.data.counts['LIKE'] || 0);
        try {
          if (hasLiked) localStorage.setItem(storageKey, '1');
          else localStorage.removeItem(storageKey);
        } catch {}
      }
    }).catch(console.error);

    const handleSync = (e: CustomEvent) => {
      if (e.detail.articleId === articleId) {
        setLiked(e.detail.liked);
        setCount(e.detail.count);
      }
    };
    
    window.addEventListener('article_like_sync', handleSync as EventListener);
    return () => window.removeEventListener('article_like_sync', handleSync as EventListener);
  }, [storageKey, initialCount, articleId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nextLiked = !liked;
    const nextCount = nextLiked ? count + 1 : Math.max(0, count - 1);
    
    setLiked(nextLiked);
    setCount(nextCount);
    
    // Dispatch custom event to sync other like buttons on the same page
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('article_like_sync', {
          detail: { articleId, liked: nextLiked, count: nextCount }
        })
      );
    }
    
    // Optimistic UI update for local storage
    try {
      if (nextLiked) localStorage.setItem(storageKey, '1');
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
        className={
          variant === 'sidebar'
            ? `flex items-center justify-center w-[44px] h-[44px] transition-colors ${
                liked
                  ? 'text-[#ef4444] bg-transparent hover:bg-black/10 dark:hover:bg-white/10'
                  : 'text-text-muted bg-transparent hover:bg-black/10 dark:hover:bg-white/10 hover:text-text-primary'
              }`
            : 'flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105'
        }
        style={variant === 'default' ? { backgroundColor: liked ? '#ef4444' : '#6b7280' } : undefined}
        aria-label={liked ? 'Unlike' : 'Like'}
        aria-pressed={liked}
        title={liked ? 'Unlike' : 'Like'}
      >
        <svg
          width="20"
          height="20"
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
      {!hideCount && count > 0 && (
        <span style={{ fontFamily: '"acumin-pro-condensed", sans-serif', fontSize: '14px', color: 'var(--text-muted)' }}>{count}</span>
      )}
    </div>
  );
}
