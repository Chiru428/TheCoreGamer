'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Link2, Mail, Share2, Bookmark } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { toggleBookmark, fetchBookmarks } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import ProfileLink from '@/components/ui/ProfileLink';

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.022 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.506 1.493-3.89 3.776-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.878h2.773l-.443 2.91h-2.33V22c4.78-.756 8.438-4.918 8.438-9.94z" />
  </svg>
);

const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249c0-.688-.561-1.249-1.248-1.249zm5.5 0c-.687 0-1.248.562-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249c0-.688-.561-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-1.612-.806-2.669-1.438-3.732-3.26-.282-.486.282-.451.805-1.504.089-.18.045-.335-.031-.469-.075-.135-.521-1.27-.776-1.745-.252-.469-.508-.404-.696-.412-.179-.008-.382-.01-.59-.01-.207 0-.541.077-.821.39-.281.312-1.058 1.034-1.058 2.522 0 1.487 1.04 2.917 1.183 3.122.144.205 2.052 3.122 5.045 4.382 2.494 1.043 3.001.836 3.535.788.533-.049 1.728-.706 1.973-1.39.243-.682.243-1.265.169-1.39z" />
  </svg>
);

interface ArticleBylineProps {
  authorName: string;
  authorUsername?: string | null;
  publishedAt: string;
  commentCount: number;
  title: string;
  url: string;
  articleId: string;
}

export default function ArticleByline({ authorName, authorUsername, publishedAt, commentCount, title, url, articleId }: ArticleBylineProps) {
  const { addToast } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const [fullUrl, setFullUrl] = useState(url);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [liveCommentCount, setLiveCommentCount] = useState(commentCount);

  useEffect(() => {
    setLiveCommentCount(commentCount);
  }, [commentCount]);

  useEffect(() => {
    const handleCommentUpdate = (e: any) => {
      if (e.detail && e.detail.articleId === articleId && typeof e.detail.count === 'number') {
        setLiveCommentCount(e.detail.count);
      }
    };
    window.addEventListener('commentCountUpdated', handleCommentUpdate);
    return () => window.removeEventListener('commentCountUpdated', handleCommentUpdate);
  }, [articleId]);

  const { data: bookmarksData, mutate: mutateBookmarks } = useSWR(isAuthenticated ? 'bookmarks' : null, fetchBookmarks);
  const [localBookmarked, setLocalBookmarked] = useState<boolean>(false);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('local_bookmarks') || '{}');
      if (cached[articleId]) setLocalBookmarked(true);
    } catch {}
  }, [articleId]);

  useEffect(() => {
    if (bookmarksData && bookmarksData.success && Array.isArray(bookmarksData.data)) {
      try {
        const newCache: Record<string, boolean> = {};
        bookmarksData.data.forEach((b: any) => {
          newCache[b.articleId] = true;
        });
        localStorage.setItem('local_bookmarks', JSON.stringify(newCache));
        setLocalBookmarked(!!newCache[articleId]);
      } catch {}
    }
  }, [bookmarksData, articleId]);

  const bookmarked = bookmarksData ? (bookmarksData.data?.some((b: any) => b.articleId === articleId) || false) : localBookmarked;

  useEffect(() => {
    setFullUrl(`${window.location.origin}${url}`);
  }, [url]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    addToast({ type: 'success', message: 'Link copied to clipboard!' });
    setMobileMenuOpen(false);
  };

  const handleToggleBookmark = async () => {
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

    mutateBookmarks(
      {
        ...bookmarksData,
        success: true,
        data: isCurrentlyBookmarked
          ? bookmarksData?.data?.filter((b) => b.articleId !== articleId) || []
          : [...(bookmarksData?.data || []), { articleId } as any],
      },
      false
    );

    const res = await toggleBookmark(articleId);
    if (!res.success) {
      mutateBookmarks();
      addToast({ type: 'error', message: 'Failed to update bookmark' });
    } else {
      addToast({ type: 'success', message: isCurrentlyBookmarked ? 'Bookmark removed' : 'Article bookmarked!' });
      mutateBookmarks();
    }
    setMobileMenuOpen(false);
  };

  const iconButtons = [
    { label: 'X', tooltip: 'Share on Twitter', bg: '#000000', icon: XIcon, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}` },
    { label: 'Facebook', tooltip: 'Share on Facebook', bg: '#1877F2', icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}` },
    { label: 'Reddit', tooltip: 'Share on Reddit', bg: '#FF4500', icon: RedditIcon, href: `https://reddit.com/submit?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(title)}` },
    { label: 'WhatsApp', tooltip: 'Share on WhatsApp', bg: '#25D366', icon: WhatsAppIcon, href: `https://wa.me/?text=${encodeURIComponent(`${title} ${fullUrl}`)}` },
    { label: 'Email', tooltip: 'Share via Email', bg: '#6b7280', icon: Mail, href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullUrl)}` },
  ];

  const byLine = (
    <>
      By{' '}
      {authorUsername ? (
        <ProfileLink username={authorUsername} className="font-bold text-[#00e5a0] hover:underline transition-colors">
          {authorName}
        </ProfileLink>
      ) : (
        <span className="font-bold text-[#00e5a0]">{authorName}</span>
      )}
    </>
  );

  return (
    <div className="mb-2 pb-2 md:mb-6 md:pb-4 border-b border-border">
      {/* Desktop / tablet layout */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-text-muted">
          <span className="text-[18px] mr-2">{byLine}</span>
          <span className="text-[16px]">Published {formatDate(publishedAt)}</span>
          <span className="text-[16px] text-text-dim">|</span>
          <a href="#comments" className="text-[16px] hover:text-text-primary hover:underline transition-colors">
            {liveCommentCount} {liveCommentCount === 1 ? 'comment' : 'comments'}
          </a>
        </div>
        <div className="flex items-center gap-2">
          {iconButtons.map(({ label, tooltip, bg, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
              style={{ backgroundColor: bg }}
              aria-label={tooltip}
              title={tooltip}
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
          <button
            onClick={copyLink}
            className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
            style={{ backgroundColor: '#3b82f6' }}
            aria-label="Copy link"
            title="Copy link"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleBookmark}
            className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
            style={{ backgroundColor: bookmarked ? 'var(--accent)' : '#6b7280' }}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-col gap-1">
        <span className="text-[18px] text-text-muted">{byLine}</span>
        <div className="flex items-center gap-2 text-[14px] text-text-muted">
          <span>Published {formatDate(publishedAt)}</span>
          <span className="text-text-dim">|</span>
          <a href="#comments" className="hover:text-text-primary hover:underline transition-colors">
            {liveCommentCount} {liveCommentCount === 1 ? 'comment' : 'comments'}
          </a>
          <span className="text-text-dim">|</span>
          <div className="relative" ref={mobileMenuRef}>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
              style={{ backgroundColor: '#6b7280' }}
              aria-label="Share"
              aria-haspopup="true"
              aria-expanded={mobileMenuOpen}
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 flex items-center gap-2 p-2 rounded-xl bg-bg-surface border border-border shadow-xl">
                {iconButtons.map(({ label, tooltip, bg, icon: Icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
                    style={{ backgroundColor: bg }}
                    aria-label={tooltip}
                    title={tooltip}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: '#3b82f6' }}
                  aria-label="Copy link"
                  title="Copy link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <span className="text-text-dim">|</span>
          <button
            onClick={handleToggleBookmark}
            className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
            style={{ backgroundColor: bookmarked ? 'var(--accent)' : '#6b7280' }}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
