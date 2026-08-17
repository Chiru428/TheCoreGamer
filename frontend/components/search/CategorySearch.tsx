'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Loader2, Gamepad2 } from 'lucide-react';
import type { SearchMethodParams } from 'algoliasearch/lite';
import { algoliaSearchClient, getAlgoliaUserToken, ARTICLES_INDEX, GAMES_INDEX } from '@/lib/algolia';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';
import ScoreBadge from '@/components/review/ScoreBadge';
import type { AlgoliaArticleHit, AlgoliaGameHit } from '@/types';

// -- Constants -----------------------------------------------------------------

const HITS_PER_PAGE = 8;
const DEBOUNCE_MS = 150;
const HIGHLIGHT_PRE_TAG = '<mark class="search-highlight">';
const HIGHLIGHT_POST_TAG = '</mark>';

// -- Props ---------------------------------------------------------------------

interface CategorySearchProps {
  contentType?: string;
  placeholder?: string;
  indexName?: 'articles' | 'games';
}

type Hit = AlgoliaArticleHit | AlgoliaGameHit;

// -- Component ----------------------------------------------------------------

export default function CategorySearch({ contentType, placeholder, indexName = 'articles' }: CategorySearchProps) {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setHits([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!algoliaSearchClient || query.trim().length < 2) {
      setHits([]);
      setIsLoading(false);
      return;
    }

    const client = algoliaSearchClient;
    let cancelled = false;
    setIsLoading(true);

    const timer = setTimeout(() => {
      const request: Record<string, unknown> = {
        indexName: indexName === 'games' ? GAMES_INDEX : ARTICLES_INDEX,
        query,
        hitsPerPage: HITS_PER_PAGE,
        attributesToHighlight: ['title'],
        highlightPreTag: HIGHLIGHT_PRE_TAG,
        highlightPostTag: HIGHLIGHT_POST_TAG,
        typoTolerance: false,
        enablePersonalization: true,
        userToken: getAlgoliaUserToken(session?.user?.id),
      };
      if (indexName === 'articles' && contentType) {
        request.facetFilters = [`contentType:${contentType}`];
      }

      client
        .search({ requests: [request] } as SearchMethodParams)
        .then(res => {
          if (cancelled) return;
          const result = res.results[0] as { hits?: Hit[] };
          setHits(result?.hits ?? []);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, contentType, indexName, session?.user?.id]);

  function handleSelect() {
    setQuery('');
    setHits([]);
  }

  const seeAllHref = indexName === 'games'
    ? `/search?q=${encodeURIComponent(query)}&tab=games`
    : `/search?q=${encodeURIComponent(query)}${contentType ? `&contentType=${contentType}` : ''}`;

  return (
    <div ref={containerRef} className="relative w-full group">
      <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 text-text-muted transition-colors group-focus-within:text-accent" />
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-4 sm:py-5 bg-transparent border-0 border-b-[3px] border-border text-xl sm:text-2xl font-medium text-text-primary outline-none focus:border-accent focus:ring-0 transition-colors placeholder:text-text-muted/50"
      />
      {isLoading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-text-muted animate-spin" />
      )}

      {hits.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 card-sm overflow-hidden">
          {indexName === 'games' ? (
            <div className="flex gap-3 overflow-x-auto px-3 py-3">
              {hits.map(hit => {
                const titleHtml = hit._highlightResult?.title?.value ?? hit.title;
                const image = (hit as AlgoliaGameHit).coverImageUrl;
                const score = (hit as AlgoliaGameHit).editorialScore;
                return (
                  <Link
                    key={hit.objectID}
                    href={`/games/${hit.slug}`}
                    onClick={handleSelect}
                    className="flex flex-col shrink-0 w-[110px] group/card"
                  >
                    <div className="relative w-[110px] aspect-[2/3] overflow-hidden rounded-none bg-bg-elevated">
                      {image ? (
                        <Image src={image} alt={hit.title} fill className="object-cover" sizes="110px" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gamepad2 className="w-6 h-6 opacity-30" />
                        </div>
                      )}
                      {score != null && (
                        <div className="absolute bottom-1 right-1">
                          <ScoreBadge score={score} size="sm" />
                        </div>
                      )}
                    </div>
                    <p
                      className="mt-2 text-sm font-semibold text-text-strong text-center group-hover/card:text-accent transition-colors"
                      dangerouslySetInnerHTML={{ __html: titleHtml }}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {hits.map(hit => {
                const titleHtml = hit._highlightResult?.title?.value ?? hit.title;
                const href = `/${contentTypePath((hit as AlgoliaArticleHit).contentType ?? contentType)}/${hit.slug}`;
                const image = (hit as AlgoliaArticleHit).featuredImageUrl;
                const score = (hit as AlgoliaArticleHit).reviewScore;
                const tc = CONTENT_TYPE_COLORS[(hit as AlgoliaArticleHit).contentType] || { bg: 'var(--accent)', color: '#fff' };
                return (
                  <Link
                    key={hit.objectID}
                    href={href}
                    onClick={handleSelect}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-bg-elevated transition-colors"
                  >
                    <div className="relative w-24 h-16 shrink-0 overflow-hidden rounded bg-bg-elevated">
                      {image ? (
                        <Image src={image} alt={hit.title} fill className="object-cover" sizes="96px" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gamepad2 className="w-4 h-4 opacity-30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tc.textColor || tc.bg }}>
                        {CONTENT_TYPE_LABELS[(hit as AlgoliaArticleHit).contentType] || (hit as AlgoliaArticleHit).contentType}
                      </span>
                      <p
                        className="font-semibold text-text-strong line-clamp-1"
                        style={{ fontSize: '16px' }}
                        dangerouslySetInnerHTML={{ __html: titleHtml }}
                      />
                    </div>
                    {score != null && <ScoreBadge score={score} size="sm" className="shrink-0" />}
                  </Link>
                );
              })}
            </div>
          )}
          <Link
            href={seeAllHref}
            onClick={handleSelect}
            className="block px-3 py-2 text-sm font-medium text-accent text-center border-t border-border hover:bg-bg-elevated transition-colors"
          >
            See all results for &ldquo;{query}&rdquo; →
          </Link>
        </div>
      )}
    </div>
  );
}
