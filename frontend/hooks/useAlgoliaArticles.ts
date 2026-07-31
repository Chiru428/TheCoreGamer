import { useEffect, useState, useCallback, useRef } from 'react';
import type { SearchMethodParams } from 'algoliasearch/lite';
import { algoliaSearchClient, ARTICLES_INDEX } from '@/lib/algolia';
import type { AlgoliaArticleHit } from '@/types';

export interface FacetCount {
  value: string;
  count: number;
}

export type FacetData = Record<string, FacetCount[]>;

interface UseAlgoliaArticlesProps {
  searchParams: URLSearchParams;
  contentType?: string;
  hitsPerPage?: number;
}

export function useAlgoliaArticles({ searchParams, contentType, hitsPerPage = 20 }: UseAlgoliaArticlesProps) {
  const [hits, setHits] = useState<AlgoliaArticleHit[]>([]);
  const [facets, setFacets] = useState<FacetData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalHits, setTotalHits] = useState(0);
  const isFirstLoad = useRef(true);

  const currentFiltersKey = searchParams.toString();

  const fetchResults = useCallback(
    async (targetPage: number) => {
      if (!algoliaSearchClient) return;
      
      const query = searchParams.get('search') || '';
      const sort = searchParams.get('sort') || 'newest';
      
      const facetFilters: string[][] = [];
      
      if (contentType) {
        facetFilters.push([`contentType:${contentType}`]);
      }

      const applyFacetFilter = (paramName: string, facetName: string) => {
        const val = searchParams.get(paramName);
        if (val) {
          const values = val.split(/,\s*(?![^()]*\))/).map(v => v.trim()).filter(Boolean);
          if (values.length > 0) {
            facetFilters.push(values.map(v => `${facetName}:${v}`));
          }
        }
      };

      applyFacetFilter('platform', 'platforms');
      applyFacetFilter('genre', 'genres');
      applyFacetFilter('year', 'releaseYear');
      applyFacetFilter('tag', 'tags');
      applyFacetFilter('type', 'guideType');
      applyFacetFilter('game', 'gameSlug');

      const numericFilters: string[] = [];
      
      const scoreParam = searchParams.get('score');
      if (scoreParam) {
        const scores = scoreParam.split(',').map(s => s.trim());
        const orFilters: string[] = [];
        
        scores.forEach(s => {
          if (s === '10') {
            orFilters.push('reviewScore = 10');
          } else if (s === '0-1') {
            orFilters.push('reviewScore >= 0');
            orFilters.push('reviewScore < 2');
          } else {
            const num = parseInt(s, 10);
            if (!isNaN(num)) {
              orFilters.push(`reviewScore >= ${num}`);
              orFilters.push(`reviewScore < ${num + 1}`);
            }
          }
        });
        
        if (orFilters.length > 0) {
          const firstScore = scores[0];
          if (firstScore === '10') {
            numericFilters.push('reviewScore >= 10');
          } else if (firstScore === '0-1') {
            numericFilters.push('reviewScore >= 0');
            numericFilters.push('reviewScore < 2');
          } else {
            const num = parseInt(firstScore, 10);
            if (!isNaN(num)) {
              numericFilters.push(`reviewScore >= ${num}`);
              numericFilters.push(`reviewScore < ${num + 1}`);
            }
          }
        }
      }

      let indexToSearch = ARTICLES_INDEX;
      if (sort === 'newest') indexToSearch = 'articles_publishedAt_desc';
      else if (sort === 'popular') indexToSearch = 'articles_viewCount_desc';
      else if (sort === 'top-rated') indexToSearch = 'articles_reviewScore_desc';

      const request: Record<string, unknown> = {
        indexName: indexToSearch,
        query,
        page: targetPage,
        hitsPerPage,
        facets: ['*'],
        facetFilters,
        numericFilters,
      };

      try {
        setIsLoading(true);

        const res = await algoliaSearchClient.search({
          requests: [request],
        } as SearchMethodParams);

        const result = res.results[0] as {
          hits?: AlgoliaArticleHit[];
          facets?: Record<string, Record<string, number>>;
          nbPages?: number;
          nbHits?: number;
        };

        const newHits = result?.hits ?? [];
        setHits(newHits);
        setTotalPages(result?.nbPages ?? 1);
        setTotalHits(result?.nbHits ?? 0);
        setPage(targetPage);

        if (result?.facets) {
          const formattedFacets: FacetData = {};
          for (const [facetName, facetValues] of Object.entries(result.facets)) {
            formattedFacets[facetName] = Object.entries(facetValues)
              .map(([value, count]) => ({ value, count }))
              .sort((a, b) => b.count - a.count);
          }
          
          setFacets(formattedFacets);
        }

      } catch (err) {
        console.error('Algolia search error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentFiltersKey, contentType, hitsPerPage]
  );

  useEffect(() => {
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const targetPage = Math.max(0, pageParam - 1);
    fetchResults(targetPage);
    isFirstLoad.current = false;
  }, [fetchResults, searchParams]);

  return {
    hits,
    facets,
    isLoading,
    totalHits,
    totalPages,
    page,
  };
}
