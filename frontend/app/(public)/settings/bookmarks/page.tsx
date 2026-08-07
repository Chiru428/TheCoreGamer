'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchBookmarks } from '@/lib/api';
import ArticleRow from '@/components/blog/ArticleRow';
import { useAuthStore } from '@/store/authStore';
import { Bookmark as BookmarkIcon, Loader2 } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import Pagination from '@/components/ui/Pagination';

export default function BookmarksSettingsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/settings/bookmarks');
    }
  }, [isLoading, isAuthenticated, router]);

  const { data, isLoading: isSWRLoading } = useSWR(isAuthenticated ? 'bookmarks' : null, () => fetchBookmarks().then(r => r.data || []));

  if (!isAuthenticated) return null;

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
  const paginatedData = data?.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) || [];

  return (
    <div className="space-y-6 w-full" style={{ fontFamily: "'Gibson', sans-serif" }}>

      <div className="mb-6">
        <h3 className="text-[18px] font-bold text-text-primary">Bookmarks</h3>
        <p className="text-[13px] text-text-muted mt-0.5">Articles you've saved to read later.</p>
      </div>

      {isSWRLoading ? (
        <div className="flex flex-col">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex py-6 border-b border-border dark:border-white/[0.08] items-center gap-4">
              <Skeleton className="w-[140px] sm:w-[300px] aspect-[16/9] rounded-md shrink-0" />
              <div className="flex-1 flex flex-col space-y-2 min-w-0">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-5 w-full rounded-md" />
                <Skeleton className="h-5 w-3/4 rounded-md hidden md:block" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.length ? (
        <>
          <div className="flex flex-col">
            {paginatedData.map(b => b.article && (
              <ArticleRow key={b.id} article={b.article} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center mt-10">
              <Pagination currentPage={page} totalPages={totalPages} basePath="/settings/bookmarks" />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-border dark:border-white/[0.08] py-16 text-center">
          <BookmarkIcon className="w-12 h-12 text-text-muted mb-4 mx-auto" />
          <p className="text-[16px] font-semibold text-text-primary">No bookmarks yet</p>
          <p className="text-[14px] text-text-muted mt-1">Save articles you want to read later.</p>
        </div>
      )}
    </div>
  );
}
