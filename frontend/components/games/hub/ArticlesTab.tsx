'use client';

import { useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { Loader2 } from 'lucide-react';
import SharedListCard from '@/components/blog/SharedListCard';
import { fetchGameArticles } from '@/lib/api';
import type { Article, ApiResponse, GameHubData } from '@/types';
import styles from './gamehub.module.css';

const PAGE_SIZE = 9;
const FILTERS = ['NEWS', 'GUIDE', 'OPINION', 'LISTICLE'] as const;

export default function ArticlesTab({ game, slug }: { game: GameHubData; slug: string }) {
  const [contentType, setContentType] = useState<string | null>(null);

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<ApiResponse<Article[]>>(
    (pageIndex) => `game-articles-${slug}-${contentType ?? 'all'}-${pageIndex + 1}`,
    (key: string) => {
      const page = Number(key.split('-').pop());
      return fetchGameArticles(slug, {
        page,
        limit: PAGE_SIZE,
        ...(contentType ? { contentType } : {}),
      });
    },
    { revalidateFirstPage: false }
  );

  const articles: Article[] = data ? data.flatMap((res) => res.data ?? []) : [];
  const lastPage = data?.[data.length - 1];
  const hasMore = lastPage?.pagination ? lastPage.pagination.page < lastPage.pagination.totalPages : false;

  const selectFilter = (ct: string | null) => {
    setContentType(ct);
    setSize(1);
  };

  const availableFilters = game.articleContentTypes 
    ? FILTERS.filter(ct => game.articleContentTypes!.includes(ct))
    : [];

  return (
    <div>
      {/* -- Content-type filter pills --------------------------------- */}
      {availableFilters.length > 0 && (
        <div className={styles.filterPills}>
          <button
            type="button"
            className={`${styles.sortTab} ${contentType === null ? styles.sortTabActive : ''}`}
            onClick={() => selectFilter(null)}
          >
            All
          </button>
          {availableFilters.map((ct) => {
            const active = contentType === ct;
            return (
              <button
                key={ct}
                type="button"
                className={`${styles.sortTab} ${active ? styles.sortTabActive : ''}`}
                onClick={() => selectFilter(ct)}
              >
                {ct.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      )}

      {/* -- Article grid ---------------------------------------------- */}
      {isLoading ? (
        <div className="flex flex-col gap-6 max-w-[900px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer" style={{ height: 180 }} />
          ))}
        </div>
      ) : articles.length > 0 ? (
        <>
          <div className="max-w-[900px]">
            {articles.map((article, i) => (
              <SharedListCard key={article.id} article={article} priority={i === 0} isLast={i === articles.length - 1} />
            ))}
          </div>

          {hasMore && (
            <div className={styles.loadMoreWrap}>
              <button
                type="button"
                className="btn-primary"
                disabled={isValidating}
                onClick={() => setSize(size + 1)}
              >
                {isValidating ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" /> Loading…
                  </span>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          No {contentType ? contentType.replace('_', ' ').toLowerCase() : ''} articles linked to this game yet.
        </div>
      )}
    </div>
  );
}
