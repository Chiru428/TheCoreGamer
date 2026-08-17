'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Gamepad2, ChevronDown } from 'lucide-react';
import { useProfileModalStore } from '@/store/profileModalStore';
import type { SearchMethodParams } from 'algoliasearch/lite';
import {
 algoliaSearchClient,
 getAlgoliaUserToken,
 sendAlgoliaEvent,
 ARTICLES_INDEX,
 ARTICLES_NEWEST,
 ARTICLES_POPULAR,
 ARTICLES_TOP_RATED,
 GAMES_INDEX,
 TAGS_INDEX,
 USERS_INDEX,
 VIDEOS_INDEX,
} from '@/lib/algolia';
import { CONTENT_TYPE_COLORS, CONTENT_TYPE_LABELS } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';
import { cn, formatDate, getInitials, getGuideTypeColor } from '@/lib/utils';
import ScoreBadge from '@/components/review/ScoreBadge';
import Pagination from '@/components/ui/Pagination';
import AdSlot from '@/components/monetization/AdSlot';
import type {
 AlgoliaArticleHit,
 AlgoliaGameHit,
 AlgoliaTagHit,
 AlgoliaUserHit,
 AlgoliaVideoHit,
} from '@/types';

// -- Constants -----------------------------------------------------------------

type TabKey = 'articles' | 'games' | 'tags' | 'users' | 'videos';

const TABS: { key: TabKey; label: string }[] = [
 { key: 'articles', label: 'Articles' },
 { key: 'games', label: 'Games' },
 { key: 'tags', label: 'Topics' },
 { key: 'users', label: 'Authors' },
 { key: 'videos', label: 'Videos' },
];

const TAB_INDEX: Record<TabKey, string> = {
 articles: ARTICLES_INDEX,
 games: GAMES_INDEX,
 tags: TAGS_INDEX,
 users: USERS_INDEX,
 videos: VIDEOS_INDEX,
};

const TAB_FACETS: Record<TabKey, string[]> = {
 articles: ['contentType', 'platforms', 'genres'],
 games: ['platforms', 'genres'],
 tags: [],
 users: [],
 videos: [],
};

const SORT_OPTIONS: { key: string; label: string; index: string }[] = [
 { key: 'relevant', label: 'Most Relevant', index: ARTICLES_INDEX },
 { key: 'newest', label: 'Newest First', index: ARTICLES_NEWEST },
 { key: 'popular', label: 'Most Viewed', index: ARTICLES_POPULAR },
 { key: 'rated', label: 'Highest Rated', index: ARTICLES_TOP_RATED },
];

const SORT_INDEX: Record<string, string> = Object.fromEntries(SORT_OPTIONS.map(o => [o.key, o.index]));

const PLATFORM_FALLBACK = ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One', 'Nintendo Switch'];
const GENRE_FALLBACK = ['Action', 'Adventure', 'RPG', 'Shooter', 'Strategy', 'Simulation', 'Sports', 'Racing', 'Puzzle', 'Horror'];

const HITS_PER_PAGE = 30;
const HIGHLIGHT_PRE_TAG = '<mark class="search-highlight">';
const HIGHLIGHT_POST_TAG = '</mark>';

// -- Types ---------------------------------------------------------------------

interface ResultsState {
 hits: unknown[];
 nbHits: number;
 nbPages: number;
 facets?: Record<string, Record<string, number>>;
 queryID?: string;
}

interface Props {
 initialParams: Record<string, string | undefined>;
}

// -- Helpers -------------------------------------------------------------------

function activeIndexFor(tab: TabKey, sort: string): string {
 return tab === 'articles' ? (SORT_INDEX[sort] ?? ARTICLES_INDEX) : TAB_INDEX[tab];
}

function videoId(objectID: string): string {
 return objectID.replace(/^video_/, '');
}

// -- FilterDropdown ------------------------------------------------------------

interface DropdownOption {
 key: string;
 label: string;
 count?: number;
 active: boolean;
}

function FilterDropdown({
 label,
 selectedLabel,
 options,
 onSelect,
}: {
 label: string;
 selectedLabel: string;
 options: DropdownOption[];
 onSelect: (key: string) => void;
}) {
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
  if (!open) return;
  const handle = (e: MouseEvent) => {
   if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener('mousedown', handle);
  return () => document.removeEventListener('mousedown', handle);
 }, [open]);

 return (
  <div ref={ref} className="flex items-center gap-3">
   <h3 className="text-sm font-semibold text-text-primary shrink-0">{label}</h3>
   <div className="relative flex-1">
    <button
     type="button"
     onClick={() => setOpen(v => !v)}
     className="w-full flex items-center gap-2 px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm hover:border-accent/50 transition-colors"
    >
     <span className="flex-1 text-left text-text-primary truncate">{selectedLabel}</span>
     <ChevronDown className={cn('w-4 h-4 text-text-muted shrink-0 transition-transform duration-200', open && 'rotate-180')} />
    </button>

    {open && (
     <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden py-1">
      {options.map(opt => (
       <button
        key={opt.key}
        type="button"
        onClick={() => { onSelect(opt.key); setOpen(false); }}
        className={cn(
         'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
         opt.active
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
        )}
       >
        <span>{opt.label}</span>
        {opt.count !== undefined && (
         <span className={cn('text-xs ml-2', opt.active ? 'text-accent/70' : 'text-text-dim')}>{opt.count}</span>
        )}
       </button>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}

// -- Page ----------------------------------------------------------------------

export default function SearchPageClient({ initialParams }: Props) {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const { data: session } = useSession();

 const tab = (searchParams.get('tab') as TabKey) || 'articles';
 const contentType = searchParams.get('contentType') || '';
 const platform = searchParams.get('platform') || '';
 const genre = searchParams.get('genre') || '';
 const sort = searchParams.get('sort') || 'relevant';
 const urlPage = Math.max(1, Number(searchParams.get('page')) || 1);
 const algoliaPage = urlPage - 1;

 const [query, setQuery] = useState(searchParams.get('q') || initialParams.q || '');
 const [debouncedQuery, setDebouncedQuery] = useState(query);
 const [results, setResults] = useState<ResultsState | null>(null);
 const [isLoading, setIsLoading] = useState(false);
 const [tabCounts, setTabCounts] = useState<Record<TabKey, number>>({
  articles: 0, games: 0, tags: 0, users: 0, videos: 0,
 });

 const userToken = getAlgoliaUserToken(session?.user?.id);

 // -- Debounce query → debouncedQuery, sync to URL -------------------------

 useEffect(() => {
  const t = setTimeout(() => setDebouncedQuery(query), 300);
  return () => clearTimeout(t);
 }, [query]);

 useEffect(() => {
  const sp = new URLSearchParams(searchParams.toString());
  if (debouncedQuery) sp.set('q', debouncedQuery); else sp.delete('q');
  sp.delete('page');
  const next = sp.toString();
  const current = searchParams.toString();
  if (next !== current) {
   router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [debouncedQuery]);

 // -- Update URL params (tab/filters/sort) — resets pagination ------------

 function updateParams(updates: Record<string, string | null>) {
  const sp = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(updates)) {
   if (value === null || value === '') sp.delete(key);
   else sp.set(key, value);
  }
  sp.delete('page');
  router.push(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, { scroll: false });
 }

 // -- Algolia query ---------------------------------------------------------

 useEffect(() => {
  if (!algoliaSearchClient) {
   setResults(null);
   return;
  }
  if (!debouncedQuery.trim()) {
   setResults(null);
   setTabCounts({ articles: 0, games: 0, tags: 0, users: 0, videos: 0 });
   return;
  }

  let cancelled = false;
  setIsLoading(true);

  const activeIndex = activeIndexFor(tab, sort);
  const facetFilters: string[] = [];
  if (tab === 'articles' && contentType) facetFilters.push(`contentType:${contentType}`);
  if ((tab === 'articles' || tab === 'games') && platform) facetFilters.push(`platforms:${platform}`);
  if ((tab === 'articles' || tab === 'games') && genre) facetFilters.push(`genres:${genre}`);

  // Replica sort indices may not have attributesForFaceting configured, so:
  // 1. Always send a sidecar to the primary index for accurate facet counts.
  // 2. When filters are active on a replica, also use the sidecar for hits
  //  (replica can't filter by contentType/platform/genre without faceting config).
  const needsFacetSidecar = tab === 'articles' && sort !== 'relevant';
  const needsSidecarHits = needsFacetSidecar && facetFilters.length > 0;

  const requests = TABS.map(t => {
   const isActive = t.key === tab;
   const req: Record<string, unknown> = {
    indexName: isActive ? activeIndex : TAB_INDEX[t.key],
    query: debouncedQuery,
    hitsPerPage: isActive && !needsSidecarHits ? HITS_PER_PAGE : 0,
    page: isActive && !needsSidecarHits ? algoliaPage : 0,
    enablePersonalization: true,
    userToken,
    enableReRanking: true,
   };
   if (isActive) {
    if (!needsFacetSidecar && TAB_FACETS[t.key].length) req.facets = TAB_FACETS[t.key];
    if (facetFilters.length) req.facetFilters = facetFilters;
    if (!needsSidecarHits) {
     req.attributesToHighlight = t.key === 'articles' ? ['title', 'excerpt'] : ['title'];
     req.highlightPreTag = HIGHLIGHT_PRE_TAG;
     req.highlightPostTag = HIGHLIGHT_POST_TAG;
    }
   }
   return req;
  });

  if (needsFacetSidecar) {
   requests.push({
    indexName: ARTICLES_INDEX,
    query: debouncedQuery,
    hitsPerPage: needsSidecarHits ? HITS_PER_PAGE : 0,
    page: needsSidecarHits ? algoliaPage : 0,
    facets: TAB_FACETS.articles,
    ...(facetFilters.length ? { facetFilters } : {}),
    ...(needsSidecarHits ? {
     attributesToHighlight: ['title', 'excerpt'],
     highlightPreTag: HIGHLIGHT_PRE_TAG,
     highlightPostTag: HIGHLIGHT_POST_TAG,
    } : {}),
    enablePersonalization: true,
    userToken,
   });
  }

  algoliaSearchClient
   .search({ requests } as SearchMethodParams)
   .then(res => {
    if (cancelled) return;

    const counts = {} as Record<TabKey, number>;
    TABS.forEach((t, i) => {
     const r = res.results[i] as { nbHits?: number };
     counts[t.key] = r?.nbHits ?? 0;
    });

    const sidecarResult = needsFacetSidecar
     ? res.results[TABS.length] as { facets?: Record<string, Record<string, number>>; hits?: unknown[]; nbHits?: number; nbPages?: number; queryID?: string }
     : null;

    // When sidecar provides the hits, use its nbHits for the articles tab count too
    if (needsSidecarHits) counts.articles = sidecarResult?.nbHits ?? 0;
    setTabCounts(counts);

    const activeIdx = TABS.findIndex(t => t.key === tab);
    const activeResult = res.results[activeIdx] as {
     hits?: unknown[];
     nbHits?: number;
     nbPages?: number;
     facets?: Record<string, Record<string, number>>;
     queryID?: string;
    };

    setResults({
     hits:  needsSidecarHits ? (sidecarResult?.hits  ?? []) : (activeResult?.hits  ?? []),
     nbHits: needsSidecarHits ? (sidecarResult?.nbHits ?? 0) : (activeResult?.nbHits ?? 0),
     nbPages: needsSidecarHits ? (sidecarResult?.nbPages ?? 0) : (activeResult?.nbPages ?? 0),
     facets: sidecarResult?.facets ?? activeResult?.facets,
     queryID: needsSidecarHits ? sidecarResult?.queryID : activeResult?.queryID,
    });
   })
   .catch(() => {
    if (cancelled) return;
    setResults({ hits: [], nbHits: 0, nbPages: 0 });
    setTabCounts({ articles: 0, games: 0, tags: 0, users: 0, videos: 0 });
   })
   .finally(() => {
    if (!cancelled) setIsLoading(false);
   });

  return () => { cancelled = true; };
 }, [debouncedQuery, tab, contentType, platform, genre, sort, algoliaPage, userToken]);

 // -- Click tracking --------------------------------------------------------

 function handleHitClick(objectID: string, position: number) {
  sendAlgoliaEvent({
   eventType: 'click',
   eventName: `${TABS.find(t => t.key === tab)?.label} Result Clicked`,
   index: activeIndexFor(tab, sort),
   objectIDs: [objectID],
   queryID: results?.queryID,
   positions: [position + 1],
   userToken,
  });
 }

 // -- Derived state ---------------------------------------------------------

 const hasQuery = Boolean(debouncedQuery.trim());
 const hasActiveFilters = Boolean(contentType || platform || genre || sort !== 'relevant');
 const showPlatformGenre = tab === 'articles' || tab === 'games';

 function clearAllFilters() {
  updateParams({ contentType: null, platform: null, genre: null, sort: null });
 }

 // -- Render ----------------------------------------------------------------

 return (
  <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 py-8">
   {/* -- Header + search input ------------------------------------- */}
   <div className="mb-6">
    <h1 className="text-3xl font-bold text-text-primary mb-4">
     {hasQuery ? `Results for "${debouncedQuery}"` : 'Search'}
    </h1>
    <div className="relative w-full group mt-4">
     <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 text-text-muted transition-colors group-focus-within:text-accent" />
     <input
      type="text"
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="Search articles, reviews, games, and more..."
      className="w-full pl-10 sm:pl-12 pr-4 py-4 sm:py-5 bg-transparent border-0 border-b-[3px] border-border text-xl sm:text-2xl font-medium text-text-primary outline-none focus:border-accent focus:ring-0 transition-colors placeholder:text-text-muted/50"
     />
    </div>
   </div>

   {/* -- Tabs ------------------------------------------------------- */}
   <div className="flex flex-wrap items-center gap-2 mb-6">
    {TABS.map(t => (
     <button
      key={t.key}
      type="button"
      onClick={() => updateParams({ tab: t.key === 'articles' ? null : t.key })}
      className={cn('genre-tag', tab === t.key && 'active')}
     >
      {t.label}
      {results && <span className="ml-1.5 text-text-muted">{tabCounts[t.key]}</span>}
     </button>
    ))}
   </div>

   {/* -- No query state -------------------------------------------- */}
   {!hasQuery && (
    <div className="text-center py-20">
     <Search className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-30" />
     <h2 className="text-xl font-semibold text-text-primary mb-2">Start typing to search across all content</h2>
    </div>
   )}

   {/* -- Body: filter sidebar + results ---------------------------- */}
   {hasQuery && (
    <div className="grid gap-8 grid-cols-1 lg:grid-cols-[260px_1fr]">
     <aside className="space-y-6">
      {tab === 'articles' && (
       <FilterDropdown
        label="Sort By"
        selectedLabel={SORT_OPTIONS.find(o => o.key === sort)?.label ?? 'Most Relevant'}
        options={SORT_OPTIONS.map(opt => ({
         key: opt.key,
         label: opt.label,
         active: sort === opt.key,
        }))}
        onSelect={(key) => updateParams({ sort: key === 'relevant' ? null : key })}
       />
      )}

      {tab === 'articles' && (
       <FilterDropdown
        label="Content Type"
        selectedLabel={contentType ? (CONTENT_TYPE_LABELS[contentType] ?? 'All Types') : 'All Types'}
        options={[
         { key: '', label: 'All Types', active: !contentType },
         ...Object.entries(CONTENT_TYPE_LABELS).map(([key, label]) => ({
          key,
          label,
          count: results?.facets?.contentType?.[key],
          active: contentType === key,
         })),
        ]}
        onSelect={(key) => updateParams({ contentType: key || null })}
       />
      )}

      {showPlatformGenre && (
       <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Platform</h3>
        <div className="flex flex-wrap gap-2">
         {(results?.facets?.platforms
          ? Object.entries(results.facets.platforms)
          : PLATFORM_FALLBACK.map(p => [p, undefined] as const)
         ).map(([p, count]) => (
          <button
           key={p}
           type="button"
           onClick={() => updateParams({ platform: platform === p ? null : p })}
           className={cn('genre-tag', platform === p && 'active')}
          >
           {p}{count !== undefined && ` (${count})`}
          </button>
         ))}
        </div>
       </div>
      )}

      {showPlatformGenre && (
       <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Genre</h3>
        <div className="flex flex-wrap gap-2">
         {(results?.facets?.genres
          ? Object.entries(results.facets.genres)
          : GENRE_FALLBACK.map(g => [g, undefined] as const)
         ).map(([g, count]) => (
          <button
           key={g}
           type="button"
           onClick={() => updateParams({ genre: genre === g ? null : g })}
           className={cn('genre-tag', genre === g && 'active')}
          >
           {g}{count !== undefined && ` (${count})`}
          </button>
         ))}
        </div>
       </div>
      )}

      {hasActiveFilters && (
       <button type="button" onClick={clearAllFilters} className="text-sm text-accent hover:underline">
        Clear all filters
       </button>
      )}
     </aside>

     {/* -- Results ------------------------------------------------ */}
     <div>
      {isLoading && (
       <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
         <div key={i} className="shimmer h-24 card-sm" />
        ))}
       </div>
      )}

      {!isLoading && results && results.hits.length === 0 && (
       <div className="text-center py-20">
        <Search className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-30" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">
         No results for &ldquo;{debouncedQuery}&rdquo;
        </h2>
        <p className="text-text-muted">Try different keywords</p>
       </div>
      )}

      {!isLoading && results && results.hits.length > 0 && (
       <>
        {tab === 'articles' && (
         <ArticlesResults hits={results.hits as AlgoliaArticleHit[]} onHitClick={handleHitClick} />
        )}
        {tab === 'games' && (
         <GamesResults hits={results.hits as AlgoliaGameHit[]} onHitClick={handleHitClick} />
        )}
        {tab === 'tags' && (
         <TagsResults hits={results.hits as AlgoliaTagHit[]} onHitClick={handleHitClick} />
        )}
        {tab === 'users' && (
         <UsersResults hits={results.hits as AlgoliaUserHit[]} onHitClick={handleHitClick} />
        )}
        {tab === 'videos' && (
         <VideosResults hits={results.hits as AlgoliaVideoHit[]} onHitClick={handleHitClick} />
        )}

        <Pagination
         currentPage={urlPage}
         totalPages={results.nbPages}
         basePath="/search"
         className="mt-8"
        />
       </>
      )}
     </div>
    </div>
   )}
  </div>
 );
}

// -- Result renderers ---------------------------------------------------------

interface HitClickHandler {
 onHitClick: (objectID: string, position: number) => void;
}

function ArticlesResults({ hits, onHitClick }: { hits: AlgoliaArticleHit[] } & HitClickHandler) {
 return (
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
   {hits.map((hit, i) => {
    const tc = CONTENT_TYPE_COLORS[hit.contentType] || { bg: 'var(--accent)', color: '#fff' };
    const titleHtml = hit._highlightResult?.title?.value ?? hit.title;
    
    return (
     <Link
      key={hit.objectID}
      href={`/${contentTypePath(hit.contentType)}/${hit.slug}`}
      onClick={() => onHitClick(hit.objectID, i)}
      className="group flex flex-col h-full bg-transparent relative overflow-hidden"
     >
      {/* Top Image Area */}
      <div className="block w-full aspect-[16/9] relative overflow-hidden bg-[var(--deep,#0d0d1a)] shrink-0">
       {hit.featuredImageUrl ? (
        <Image quality={100} 
         src={hit.featuredImageUrl} 
         alt={hit.title} 
         fill 
         className="object-cover transition-transform duration-1000 ease-out" 
         sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" 
         unoptimized 
        />
       ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
       )}
       {hit.reviewScore != null && (
        <div className="absolute bottom-2 right-2 z-10">
         <ScoreBadge score={hit.reviewScore} />
        </div>
       )}
       {/* Mobile Badge on Image */}
       {hit.contentType === 'GUIDE' && hit.guideType ? (
        <span 
         className="absolute bottom-2 left-2 z-10 sm:hidden" 
         style={{ padding: '1px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: getGuideTypeColor(hit.guideType), color: '#fff' }}
        >
         {hit.guideType}
        </span>
       ) : (
        <span 
         className="absolute bottom-2 left-2 z-10 sm:hidden" 
         style={{ padding: '1px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: tc.bg, color: tc.color || '#fff' }}
        >
         {CONTENT_TYPE_LABELS[hit.contentType] || hit.contentType}
        </span>
       )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-start w-full pt-2 sm:pt-4">
       {/* Meta info (Date + Badge) */}
       <div className="flex flex-wrap items-center gap-1.5 text-[14px] text-text-muted font-medium mb-1.5 sm:mb-2">
        <span>{formatDate(hit.publishedAtISO)}</span>
        {hit.contentType === 'GUIDE' && hit.guideType ? (
         <span 
          className="hidden sm:inline-block text-[10px] sm:text-[13px]" 
          style={{ marginLeft: '4px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: getGuideTypeColor(hit.guideType) }}
         >
          {hit.guideType}
         </span>
        ) : (
         <span 
          className="hidden sm:inline-block text-[10px] sm:text-[13px]" 
          style={{ marginLeft: '4px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: tc.textColor || tc.bg }}
         >
          {CONTENT_TYPE_LABELS[hit.contentType] || hit.contentType}
         </span>
        )}
       </div>
       
       {/* Title */}
       <div className="mb-2">
        <h3
         className="post-card-title font-bold text-text-strong leading-snug transition-colors line-clamp-none sm:line-clamp-3 text-[16px] sm:text-[18px]"
         style={{ fontFamily: "'Gibson', sans-serif" }}
        >
         <span className="hover-underline-animation" dangerouslySetInnerHTML={{ __html: titleHtml }} />
        </h3>
       </div>

       {/* Excerpt */}
       {hit.excerpt && (
        <div className="hidden sm:block">
         <p 
          className="leading-normal line-clamp-3 mb-2 text-text-muted"
          style={{ fontSize: '16px' }}
         >
          {hit.excerpt}
         </p>
        </div>
       )}
      </div>
     </Link>
    );
   })}
  </div>
 );
}

function GamesResults({ hits, onHitClick }: { hits: AlgoliaGameHit[] } & HitClickHandler) {
 return (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-7 sm:gap-x-6 md:gap-x-8">
   {hits.map((hit, i) => {
    const titleHtml = hit._highlightResult?.title?.value ?? hit.title;
    return (
     <Link
      key={hit.objectID}
      href={`/games/${hit.slug}`}
      onClick={() => onHitClick(hit.objectID, i)}
      className="group block"
     >
      <div className="relative overflow-hidden aspect-[2/3] w-full rounded-none border border-[var(--text)]">
       {hit.coverImageUrl ? (
        <Image quality={100} src={hit.coverImageUrl} alt={hit.title} fill className="object-cover " sizes="(max-width: 640px) 50vw, 20vw" unoptimized />
       ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
         <span className="text-3xl opacity-20">🎮</span>
        </div>
       )}
      </div>
      <div className="pt-3">
       <p
        className="line-clamp-2"
        style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: hit.publisher ? '3px' : 0 }}
       >
         <span className="hover-underline-animation" dangerouslySetInnerHTML={{ __html: titleHtml }} />
       </p>
       {hit.publisher && (
        <p className="line-clamp-1" style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>
         {hit.publisher}
        </p>
       )}
      </div>
     </Link>
    );
   })}
  </div>
 );
}

function TagsResults({ hits, onHitClick }: { hits: AlgoliaTagHit[] } & HitClickHandler) {
 return (
  <div className="flex flex-wrap gap-2">
   {hits.map((hit, i) => (
    <Link
     key={hit.objectID}
     href={`/tags/${hit.slug}`}
     onClick={() => onHitClick(hit.objectID, i)}
     className="genre-tag"
    >
     #{hit.name} <span className="text-text-muted">{hit.articleCount}</span>
    </Link>
   ))}
  </div>
 );
}

function UsersResults({ hits, onHitClick }: { hits: AlgoliaUserHit[] } & HitClickHandler) {
 const openProfile = useProfileModalStore((s) => s.openProfile);

 return (
  <div className="space-y-3">
   {hits.map((hit, i) => {
    const content = (
     <>
      <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden bg-bg-elevated flex items-center justify-center">
       {hit.avatarUrl ? (
        <Image quality={100} src={hit.avatarUrl} alt={hit.displayName} fill className="object-cover" sizes="48px" unoptimized />
       ) : (
        <span className="text-sm font-bold text-text-muted">{getInitials(hit.displayName)}</span>
       )}
      </div>
      <div className="flex-1 min-w-0">
       <div className="flex items-center gap-2">
        <p className="font-bold text-text-strong">{hit.displayName}</p>
        {hit.isStaff && (
         <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-accent text-white">Staff</span>
        )}
       </div>
       {hit.bio && <p className="text-sm text-text-muted line-clamp-1">{hit.bio}</p>}
      </div>
      <span className="text-xs text-text-muted shrink-0">{hit.articleCount} articles</span>
     </>
    );

    return (
     <button
      key={hit.objectID}
      type="button"
      onClick={() => {
       onHitClick(hit.objectID, i);
       openProfile(hit.username);
      }}
      className="card-sm flex items-center gap-3 p-3 w-full text-left"
     >
      {content}
     </button>
    );
   })}
  </div>
 );
}

function VideosResults({ hits, onHitClick }: { hits: AlgoliaVideoHit[] } & HitClickHandler) {
 return (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
   {hits.map((hit, i) => {
    const titleHtml = hit._highlightResult?.title?.value ?? hit.title;
    return (
     <Link
      key={hit.objectID}
      href={`/videos/${videoId(hit.objectID)}`}
      onClick={() => onHitClick(hit.objectID, i)}
      className="card-sm flex flex-col group"
     >
      <div className="relative w-full aspect-video overflow-hidden bg-bg-elevated">
       {hit.thumbnailUrl ? (
        <Image quality={100} src={hit.thumbnailUrl} alt={hit.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" unoptimized />
       ) : (
        <div className="w-full h-full flex items-center justify-center">
         <Gamepad2 className="w-8 h-8 opacity-30" />
        </div>
       )}
      </div>
      <div className="p-2.5">
       <p
        className="text-sm font-bold text-text-strong truncate transition-colors"
        style={{ fontFamily: '"Gibson", sans-serif' }}
       >
         <span className="hover-underline-animation" dangerouslySetInnerHTML={{ __html: titleHtml }} />
       </p>
       {hit.gameName && <p className="text-xs text-text-muted mt-1">{hit.gameName}</p>}
      </div>
     </Link>
    );
   })}
  </div>
 );
}
