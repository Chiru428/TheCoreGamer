import { useEffect, useState, useCallback, useRef } from 'react';
import type { SearchMethodParams } from 'algoliasearch/lite';
import { algoliaSearchClient, GAMES_INDEX } from '@/lib/algolia';
import type { AlgoliaGameHit } from '@/types';

export interface FacetCount {
  value: string;
  count: number;
}

export type FacetData = Record<string, FacetCount[]>;

interface UseAlgoliaGamesProps {
  searchParams: URLSearchParams;
}

export function useAlgoliaGames({ searchParams }: UseAlgoliaGamesProps) {
  const [hits, setHits] = useState<AlgoliaGameHit[]>([]);
  const [facets, setFacets] = useState<FacetData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalHits, setTotalHits] = useState(0);
  const isFirstLoad = useRef(true);

  // We need a stable key for current filters to know when to reset the list vs append
  const currentFiltersKey = searchParams.toString();

  const fetchResults = useCallback(
    async (targetPage: number, isAppend: boolean) => {
      if (!algoliaSearchClient) return;
      
      const query = searchParams.get('search') || '';
      const sort = searchParams.get('sort') || 'newest';
      
      const facetFilters: string[][] = [];
      
      const applyFacetFilter = (paramName: string, facetName: string) => {
        const val = searchParams.get(paramName);
        if (val) {
          const values = val.split(/,\s*(?![^()]*\))/).map(v => v.trim()).filter(Boolean);
          if (values.length > 0) {
            facetFilters.push(values.map(v => `${facetName}:${v}`));
          }
        }
      };

      applyFacetFilter('platforms', 'platforms');
      applyFacetFilter('genres', 'genres');
      applyFacetFilter('gameModes', 'gameModes');
      applyFacetFilter('perspectives', 'playerPerspectives');
      applyFacetFilter('themes', 'themes');
      applyFacetFilter('year', 'releaseYear');
      applyFacetFilter('rating', 'esrbRating');
      applyFacetFilter('tags', 'tags');
      applyFacetFilter('developer', 'developer');
      applyFacetFilter('status', 'releaseStatus');
      applyFacetFilter('collection', 'collectionName');

      const numericFilters: string[] = [];
      // Intentionally not filtering by date here to decouple sorting and filtering.

      let indexToSearch = GAMES_INDEX;
      if (sort === 'newest') indexToSearch = 'games_releaseDate_desc';
      else if (sort === 'top-rated') indexToSearch = 'games_totalRating_desc';
      else if (sort === 'popular') indexToSearch = 'games_totalRatingCount_desc';
      else if (sort === 'alphabetical') indexToSearch = 'games_title_asc';

      const request: Record<string, unknown> = {
        indexName: indexToSearch,
        query,
        page: targetPage,
        hitsPerPage: 100,
        facets: ['*'], // Request all configured facets
        facetFilters,
        numericFilters,
      };

      try {
        if (isAppend) setIsLoadingMore(true);
        else setIsLoading(true);

        const res = await algoliaSearchClient.search({
          requests: [request],
        } as SearchMethodParams);

        const result = res.results[0] as {
          hits?: AlgoliaGameHit[];
          facets?: Record<string, Record<string, number>>;
          nbPages?: number;
          nbHits?: number;
        };

        const newHits = result?.hits ?? [];
        setHits(prev => (isAppend ? [...prev, ...newHits] : newHits));
        setTotalPages(result?.nbPages ?? 1);
        setTotalHits(result?.nbHits ?? 0);
        setPage(targetPage);

        // Format facets for easy UI consumption
        if (result?.facets) {
          const formattedFacets: FacetData = {};
          for (const [facetName, facetValues] of Object.entries(result.facets)) {
            formattedFacets[facetName] = Object.entries(facetValues)
              .map(([value, count]) => ({ value, count }))
              .sort((a, b) => b.count - a.count); // Sort by count descending
          }
          
          setFacets(formattedFacets);
        }

      } catch (err) {
        console.error('Algolia search error:', err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [currentFiltersKey]
  );

  // Initial load and filter changes
  useEffect(() => {
    fetchResults(0, false);
    isFirstLoad.current = false;
  }, [fetchResults]);

  const loadMore = useCallback(() => {
    if (page < totalPages - 1 && !isLoadingMore) {
      fetchResults(page + 1, true);
    }
  }, [page, totalPages, isLoadingMore, fetchResults]);

  return {
    hits,
    facets,
    isLoading,
    isLoadingMore,
    totalHits,
    page,
    hasMore: page < totalPages - 1,
    loadMore,
  };
}
