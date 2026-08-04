'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2, X, Filter } from 'lucide-react';
import { useMemo, useState, Fragment } from 'react';
import type { Game } from '@/types';
import { useAlgoliaGames } from '@/hooks/useAlgoliaGames';
import GamesFilterSidebar from './GamesFilterSidebar';
import Skeleton, { FilterBoxSkeleton } from '@/components/ui/Skeleton';
import SortDropdown from '@/components/ui/SortDropdown';

const GAME_SORT_OPTIONS = [
  { value: 'newest', label: 'Release Date' },
  { value: 'alphabetical', label: 'Title' },
  { value: 'top-rated', label: 'Rating' },
  { value: 'popular', label: 'Popularity' },
];

interface Props {
  initialGames: Game[];
  totalPages: number;
}

export default function GamesGridClient({ initialGames }: Props) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { hits, facets, isLoading, isLoadingMore, hasMore, loadMore, totalHits, page } = useAlgoliaGames({ searchParams });

  const filterKeys = ['genres', 'platforms', 'gameModes', 'perspectives', 'themes', 'year', 'status', 'rating', 'tags', 'developer', 'collection'];
  
  const hasFilters = Array.from(searchParams.keys()).some(k => 
    [...filterKeys, 'search'].includes(k)
  );

  const activeFilters = useMemo(() => {
    const filters: { key: string, value: string }[] = [];
    filterKeys.forEach(key => {
      const val = searchParams.get(key);
      if (val) {
        val.split(/,\s*(?![^()]*\))/).filter(Boolean).forEach(v => filters.push({ key, value: v.trim() }));
      }
    });
    return filters;
  }, [searchParams]);

  const removeFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValues = (params.get(key) || '').split(/,\s*(?![^()]*\))/).filter(Boolean).map(v => v.trim());
    const newValues = currentValues.filter(v => v !== value);
    if (newValues.length > 0) {
      params.set(key, newValues.join(','));
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    filterKeys.forEach(key => {
      params.delete(key);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Only use Algolia hits when we are actively filtering or have paginated beyond the first page.
  // Otherwise, use the server-rendered initialGames directly from the PostgreSQL database.
  // This prevents UI flicker and ensures newly created/deleted games reflect immediately
  // even before the Algolia sync worker has processed them.
  const displayGames = (hasFilters || page > 0) ? hits : initialGames;

  // Show Load More when Algolia has more pages to fetch.
  const showLoadMore = hasMore;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Row with Sort and Filter Pills */}
      <div className="flex flex-col md:flex-row gap-8 md:items-center">
        <div className="w-full md:w-[250px] shrink-0 flex items-center justify-between gap-4">
          <SortDropdown options={GAME_SORT_OPTIONS} defaultValue="newest" />
          <button 
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-md text-sm font-bold text-text hover:border-[var(--brand-green)] hover:text-[var(--brand-green)] transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        
        <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center gap-4">
          {hasFilters && (
            <p className="text-text-muted text-sm font-medium whitespace-nowrap">
              Showing <span className="text-text font-bold">{totalHits || displayGames.length}</span> results
            </p>
          )}
          
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
      </div>

      {/* Mobile Filters (Collapsible) */}
      <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden -mt-4 ${isMobileFiltersOpen ? 'max-h-[2000px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
        {isLoading && hits.length === 0 ? (
          <FilterBoxSkeleton />
        ) : (
          <GamesFilterSidebar facets={facets} />
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar - Hidden on small screens, can add a mobile drawer later if needed */}
        <aside className="hidden md:block w-[250px] shrink-0 sticky top-32 max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar pb-6 pr-2">
          {isLoading && hits.length === 0 ? (
            <FilterBoxSkeleton />
          ) : (
            <GamesFilterSidebar facets={facets} />
          )}
        </aside>

        {/* Main Grid */}
        <div className="flex-1 min-w-0">
          {isLoading && hits.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="w-full aspect-[2/3] rounded-sm" />
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
              ))}
            </div>
          ) : displayGames.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center border border-filter-accent/20 rounded-lg bg-surface">
              <span className="text-4xl mb-4 opacity-50">🎮</span>
              <h3 className="text-xl font-bold text-text mb-2">No games found</h3>
              <p className="text-text-muted mb-6">Try adjusting your filters to find what you're looking for.</p>
              <button
                onClick={clearAllFilters}
                className="px-6 py-2 bg-filter-accent text-black font-bold rounded hover:bg-filter-accent/90 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                {displayGames.map((g, index) => {
                  const id = 'id' in g ? g.id : g.objectID;
                  const title = g.title;
                  const slug = g.slug;
                  const coverImageUrl = g.coverImageUrl;
                  const publisher = g.publisher;
                  
                  let formattedDate = '';
                  const rawDate = 'releaseDate' in g ? g.releaseDate : undefined;
                  if (rawDate) {
                    const dateObj = typeof rawDate === 'number' ? new Date(rawDate * 1000) : new Date(rawDate);
                    formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
                  } else {
                    formattedDate = 'TBA';
                  }

                  return (
                    <Fragment key={id}>
                      <Link href={`/games/${slug}`} className="group block">
                        <div className="relative overflow-hidden aspect-[2/3] w-full rounded border border-[var(--text)]">
                          {coverImageUrl ? (
                            <img
                              src={coverImageUrl}
                              alt={title}
                              className="w-full h-full object-cover"
                              loading={index < 10 ? 'eager' : 'lazy'}
                              decoding="async"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface">
                              <span className="text-3xl opacity-20">🎮</span>
                            </div>
                          )}
                          {formattedDate && (
                            <div 
                              className="absolute bottom-2 left-0 right-0 text-center bg-[rgba(0,0,0,0.72)] backdrop-blur-[4px] text-[10px] font-bold tracking-[0.08em] py-[5px] px-[6px]"
                              style={{ fontFamily: "'Gibson', sans-serif", color: "#00e5a0" }}
                            >
                              {formattedDate}
                            </div>
                          )}
                        </div>
                        <div className="pt-3">
                          <p className="text-[16px] font-bold text-text leading-tight group-hover:underline">
                            {title}
                          </p>
                          {publisher && (
                            <p className="text-[13px] font-medium text-text-muted mt-1">
                              {publisher}
                            </p>
                          )}
                        </div>
                      </Link>
                      {/* TODO: Add <AdSlot slot="ADS-01" className="w-full" /> here (every 20 games) once monetized */}
                    </Fragment>
                  );
                })}
              </div>

              {showLoadMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-filter-accent text-filter-accent font-bold text-sm hover:bg-filter-accent hover:text-black transition-colors disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
