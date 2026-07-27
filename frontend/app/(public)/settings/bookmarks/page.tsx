'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetchBookmarks } from '@/lib/api';
import HomePostCard from '@/components/blog/HomePostCard';
import { useAuthStore } from '@/store/authStore';
import { Bookmark as BookmarkIcon, Loader2 } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';

export default function BookmarksSettingsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/settings/bookmarks');
    }
  }, [isLoading, isAuthenticated, router]);

  const { data, isLoading: isSWRLoading } = useSWR(isAuthenticated ? 'bookmarks' : null, () => fetchBookmarks().then(r => r.data || []));

  if (!isAuthenticated) return null;

  const ITEMS_PER_PAGE = 18;
  const totalPages = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
  const paginatedData = data?.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) || [];

  return (
    <div className="space-y-8 w-full">

      
      {isSWRLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col h-full">
              <Skeleton className="w-full aspect-[16/9] rounded-md" />
              <div className="flex-1 flex flex-col pt-3 space-y-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-5 w-full rounded-md" />
                <Skeleton className="h-5 w-3/4 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.length ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedData.map(b => b.article && <HomePostCard key={b.id} article={b.article} showBadge={true} mobileHorizontal={true} showViewArticle={false} truncateTitle={false} titleClassName="mb-1 sm:mb-2 text-[14px] sm:text-[18px]" />)}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-10">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)} 
                className="px-4 py-2 rounded-lg bg-bg-surface border border-border text-text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-elevated transition-colors font-medium text-sm"
              >
                Previous
              </button>
              <span className="text-sm font-bold text-text-muted">Page {page} of {totalPages}</span>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)} 
                className="px-4 py-2 rounded-lg bg-bg-surface border border-border text-text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-elevated transition-colors font-medium text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-bg-surface border border-border rounded-2xl">
          <BookmarkIcon className="w-16 h-16 text-border mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">No bookmarks yet</h3>
          <p className="text-text-muted">Save articles you want to read later</p>
        </div>
      )}
    </div>
  );
}
