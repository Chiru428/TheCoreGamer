'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Loader2, X, Filter } from 'lucide-react';
import { useMemo, useState, Fragment } from 'react';
import type { Article } from '@/types';
import { useAlgoliaArticles } from '@/hooks/useAlgoliaArticles';
import SharedListCard from '@/components/blog/SharedListCard';
import GuideFilters from '@/components/search/GuideFilters';
import Pagination from '@/components/ui/Pagination';
import Skeleton, { FilterBoxSkeleton } from '@/components/ui/Skeleton';

interface Props {
  initialGuides: Article[];
  totalPages: number;
  sidebarChildren?: React.ReactNode;
}

export default function GuidesListClient({ initialGuides, totalPages: initialTotalPages, sidebarChildren }: Props) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { hits, facets, isLoading, totalHits, totalPages: algoliaTotalPages, page: algoliaPage } = useAlgoliaArticles({ searchParams, contentType: 'GUIDE' });

  const filterKeys = ['type', 'platform', 'genre', 'game', 'tag'];
  
  const hasFilters = Array.from(searchParams.keys()).some(k => 
    [...filterKeys, 'search'].includes(k)
  );

  const activeFilters = useMemo(() => {
    const filters: { key: string, value: string }[] = [];
    filterKeys.forEach(key => {
      const val = searchParams.get(key);
      if (val) {
        val.split(',').filter(Boolean).forEach(v => filters.push({ key, value: v.trim() }));
      }
    });
    return filters;
  }, [searchParams]);

  const removeFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValues = (params.get(key) || '').split(',').filter(Boolean).map(v => v.trim());
    const newValues = currentValues.filter(v => v !== value);
    if (newValues.length > 0) {
      params.set(key, newValues.join(','));
    } else {
      params.delete(key);
    }
    // Reset page when filtering
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    filterKeys.forEach(key => {
      params.delete(key);
    });
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Only use Algolia hits when we are actively filtering or have paginated beyond the first page.
  // Otherwise, use the server-rendered initialGuides directly from the PostgreSQL database.
  const displayGuides = (hasFilters || algoliaPage > 0) ? hits : initialGuides;

  const activeTotalPages = (hasFilters || algoliaPage > 0) ? algoliaTotalPages : initialTotalPages;
  const activeCurrentPage = (hasFilters || algoliaPage > 0) ? algoliaPage + 1 : 1;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Top Header Row with Filter Pills */}
      <div className={`flex flex-col md:flex-row gap-8 md:items-center ${hasFilters ? 'mb-2' : 'lg:hidden'}`}>
        <div className="w-full lg:w-auto shrink-0 flex items-center justify-between gap-4">
          <button 
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-md text-sm font-bold text-text hover:border-[var(--brand-green)] hover:text-[var(--brand-green)] transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        
        {hasFilters && (
          <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-text-muted text-sm font-medium whitespace-nowrap">
              Showing <span className="text-text font-bold">{totalHits || displayGuides.length}</span> results
            </p>
            
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map((f, i) => (
                  <button
                    key={`${f.key}-${f.value}-${i}`}
                    onClick={() => removeFilter(f.key, f.value)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-semibold text-text-primary bg-bg-elevated border border-border hover:border-[var(--brand-green)] hover:text-[var(--brand-green)] transition-colors group"
                  >
                    {f.value}
                    <X className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                  </button>
                ))}
                {activeFilters.length > 1 && (
                  <button 
                    onClick={clearAllFilters}
                    className="text-[13px] font-bold text-red-500 hover:underline ml-1"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[900px_1fr] gap-8 items-start content-start min-h-screen">
        
        {/* Main List */}
        <div className="lg:border-r-2 lg:border-border lg:pr-8">
          {isLoading && hits.length === 0 ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-4 h-48">
                  <Skeleton className="w-full md:w-64 h-full rounded-sm shrink-0" />
                  <div className="flex flex-col flex-1 gap-3 py-2">
                    <Skeleton className="w-full h-6" />
                    <Skeleton className="w-3/4 h-6" />
                    <Skeleton className="w-1/2 h-4 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayGuides.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center rounded-lg bg-surface border border-border">
              <span className="text-4xl mb-4 opacity-50">🎮</span>
              <h3 className="text-xl font-bold text-text mb-2">No guides found</h3>
              <p className="text-text-muted mb-6">Try adjusting your filters to find what you're looking for.</p>
              <button
                onClick={clearAllFilters}
                className="px-6 py-2 bg-filter-accent text-black font-bold rounded hover:bg-filter-accent/90 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {displayGuides.map((r, index) => {
                const article = 'objectID' in r ? mapAlgoliaToArticle(r) : r;
                return (
                  <Fragment key={article.id}>
                    <SharedListCard article={article} priority={index === 0} isLast={index === displayGuides.length - 1} />
                  </Fragment>
                );
              })}
            </div>
          )}
          
          {activeTotalPages > 1 && displayGuides.length > 0 && (
            <div className="mt-8">
              <Pagination
                currentPage={activeCurrentPage}
                totalPages={activeTotalPages}
                basePath="/guides"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="order-first lg:order-none flex flex-col gap-4 pb-0 md:pb-8 md:gap-6 md:w-full self-stretch">
          <div className={`lg:block transition-all duration-300 ease-in-out overflow-hidden ${isMobileFiltersOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 lg:max-h-none opacity-0 lg:opacity-100'}`}>
            {isLoading && hits.length === 0 ? (
              <FilterBoxSkeleton />
            ) : (
              <GuideFilters facets={facets} />
            )}
          </div>
          {sidebarChildren}
        </aside>

      </div>
    </div>
  );
}

// Helper to map AlgoliaArticleHit to the Article type expected by SharedListCard
function mapAlgoliaToArticle(hit: any): Article {
  return {
    id: hit.objectID,
    title: hit.title,
    slug: hit.slug,
    excerpt: hit.excerpt || '',
    contentType: hit.contentType,
    guideType: hit.guideType || null,
    featuredImageUrl: hit.featuredImageUrl,
    publishedAt: new Date(hit.publishedAtISO),
    viewCount: hit.viewCount || 0,
    commentCount: hit.commentCount || 0,
    author: {
      displayName: hit.authorName,
      username: hit.authorUsername,
      avatarUrl: hit.authorAvatarUrl,
    },
    gameReview: hit.reviewScore != null ? {
      reviewScore: hit.reviewScore,
      Game: {
        title: hit.gameName || '',
        slug: hit.gameSlug || '',
      }
    } : null,
    tags: hit.tags?.map((slug: string) => ({ slug, Tag: { slug } })) || [],
  } as any;
}
