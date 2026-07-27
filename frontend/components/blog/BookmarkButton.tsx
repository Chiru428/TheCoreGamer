'use client';

import useSWR from 'swr';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { toggleBookmark, fetchBookmarks } from '@/lib/api';

interface BookmarkButtonProps {
  articleId: string;
}

// Quick one-click bookmark toggle — the same action as the icon in ArticleByline,
// reused here so it can sit in the bottom action row alongside Like/Share.
// Kept separate from SaveToListDropdown, which manages membership across
// multiple named reading lists rather than a single default bookmark.
export default function BookmarkButton({ articleId }: BookmarkButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const { data, mutate } = useSWR(isAuthenticated ? 'bookmarks' : null, fetchBookmarks);
  const bookmarked = data?.data?.some((b) => b.articleId === articleId) || false;

  const handleToggle = async () => {
    if (!isAuthenticated) {
      addToast({ type: 'warning', message: 'Please log in to bookmark articles.' });
      return;
    }

    const isCurrentlyBookmarked = bookmarked;

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
      className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
      style={{ backgroundColor: bookmarked ? 'var(--accent)' : '#6b7280' }}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
    >
      {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
    </button>
  );
}
