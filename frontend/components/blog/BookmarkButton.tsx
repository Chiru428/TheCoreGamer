'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Bookmark } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { toggleBookmark, fetchBookmarks } from '@/lib/api';

interface BookmarkButtonProps {
  articleId: string;
  variant?: 'default' | 'sidebar';
  className?: string;
}

// Quick one-click bookmark toggle — the same action as the icon in ArticleByline,
// reused here so it can sit in the bottom action row alongside Like/Share.
// Kept separate from SaveToListDropdown, which manages membership across
// multiple named reading lists rather than a single default bookmark.
export default function BookmarkButton({ articleId, variant = 'default', className }: BookmarkButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const { data, mutate } = useSWR(isAuthenticated ? 'bookmarks' : null, fetchBookmarks);
  const [localBookmarked, setLocalBookmarked] = useState<boolean>(false);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('local_bookmarks') || '{}');
      if (cached[articleId]) setLocalBookmarked(true);
    } catch {}
  }, [articleId]);

  useEffect(() => {
    if (data && data.success && Array.isArray(data.data)) {
      try {
        const newCache: Record<string, boolean> = {};
        data.data.forEach((b: any) => {
          newCache[b.articleId] = true;
        });
        localStorage.setItem('local_bookmarks', JSON.stringify(newCache));
        setLocalBookmarked(!!newCache[articleId]);
      } catch {}
    }
  }, [data, articleId]);

  const bookmarked = data ? (data.data?.some((b: any) => b.articleId === articleId) || false) : localBookmarked;
  const handleToggle = async () => {
    if (!isAuthenticated) {
      addToast({ type: 'warning', message: 'Please log in to bookmark articles.' });
      return;
    }

    const isCurrentlyBookmarked = bookmarked;

    try {
      const cached = JSON.parse(localStorage.getItem('local_bookmarks') || '{}');
      if (isCurrentlyBookmarked) {
        delete cached[articleId];
      } else {
        cached[articleId] = true;
      }
      localStorage.setItem('local_bookmarks', JSON.stringify(cached));
      setLocalBookmarked(!isCurrentlyBookmarked);
    } catch {}

    mutate(
      {
        ...data,
        success: true,
        data: isCurrentlyBookmarked
          ? data?.data?.filter((b) => b.articleId !== articleId) || []
          : [...(data?.data || []), { articleId } as any],
      },
      false
    );

    const res = await toggleBookmark(articleId);
    if (!res.success) {
      mutate();
      addToast({ type: 'error', message: 'Failed to update bookmark' });
    } else {
      addToast({ type: 'success', message: isCurrentlyBookmarked ? 'Bookmark removed' : 'Article bookmarked!' });
      mutate();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={
        variant === 'sidebar'
          ? `flex items-center justify-center w-[44px] h-[44px] transition-colors ${
              bookmarked
                ? 'text-[var(--brand-green)] bg-transparent hover:bg-black/10 dark:hover:bg-white/10'
                : 'text-text-muted bg-transparent hover:bg-black/10 dark:hover:bg-white/10 hover:text-text-primary'
            }`
          : `flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105 ${className || ''}`
      }
      style={variant === 'default' ? { backgroundColor: bookmarked ? 'var(--brand-green)' : '#6b7280' } : undefined}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
    >
      {bookmarked ? (
        <Bookmark size={variant === 'sidebar' ? 20 : 16} fill="currentColor" />
      ) : (
        <Bookmark size={variant === 'sidebar' ? 20 : 16} />
      )}
    </button>
  );
}
