'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, Gamepad2, ChevronDown, Calendar } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { contentTypePath } from '@/lib/seo';
import { searchArticles } from '@/lib/api';
import { trackClarityEvent } from '@/lib/clarity';
import { algoliaSearchClient, TAGS_INDEX } from '@/lib/algolia';
import type { SearchMethodParams } from 'algoliasearch/lite';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { formatDate, readingTime } from '@/lib/utils';
import type { SearchResult, AlgoliaArticleHit, AlgoliaGameHit, AlgoliaTagHit } from '@/types';

// -- Constants ----------------------------------------------------------------

// Fallback shown until the dynamic tags-based list loads (or if Algolia is unavailable)
const POPULAR_SEARCHES_FALLBACK = [
  'Elden Ring mods',
  'Best PC settings',
  'Call of Duty review',
  'Baldur\'s Gate 3',
  'Cyberpunk 2077',
  'Starfield guide',
  'Xbox Game Pass',
  'GPU comparison',
];

const RECENT_SEARCHES_KEY = 'frh_recent_searches';
const MAX_RECENT_SEARCHES = 6;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) — ignore
  }
}

const CONTENT_FILTERS = [
  { label: 'All', value: '' },
  { label: 'News', value: 'NEWS' },
  { label: 'Reviews', value: 'REVIEW' },
  { label: 'Guides', value: 'GUIDE' },
  { label: 'Deals', value: 'DEAL' },
  { label: 'Games', value: 'GAME' },
];

const SORT_OPTIONS = [
  { label: 'Latest', value: 'latest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Most Popular', value: 'popular' },
  { label: 'Top Rated', value: 'rated' },
];

const TAG_COLORS: Record<string, string> = {
  NEWS: '#0d9e6a',
  REVIEW: '#7b5cfa',
  GUIDE: '#3b82f6',
  OPINION: '#d4386e',
  DEAL: '#10b981',
};

// -- Helpers -------------------------------------------------------------------

function getArticleHref(contentType: string, slug: string) {
  return `/${contentTypePath(contentType)}/${slug}`;
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="so-highlight">{part}</mark>
      : part
  );
}

// -- Article result normalization ---------------------------------------------
// Normalizes both the Algolia hit shape and the Postgres-fallback SearchResult
// shape into one display shape so ResultCard doesn't need to branch.

interface DisplayArticle {
  id: string;
  title: string;
  titleHtml?: string;
  slug: string;
  excerpt: string | null;
  excerptHtml?: string;
  contentType: string;
  featuredImageUrl: string | null;
  authorDisplayName: string;
  publishedAt: string | null;
  readingTimeMinutes: number;
}

function toDisplayArticle(item: AlgoliaArticleHit | SearchResult): DisplayArticle {
  if ('objectID' in item) {
    return {
      id: item.objectID,
      title: item.title,
      titleHtml: item._highlightResult?.title?.value,
      slug: item.slug,
      excerpt: item.excerpt,
      excerptHtml: item._highlightResult?.excerpt?.value ?? item._snippetResult?.excerpt?.value,
      contentType: item.contentType,
      featuredImageUrl: item.featuredImageUrl,
      authorDisplayName: item.authorName,
      publishedAt: item.publishedAtISO,
      readingTimeMinutes: item.readingTimeMinutes,
    };
  }
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt,
    contentType: item.contentType,
    featuredImageUrl: item.featuredImageUrl,
    authorDisplayName: item.author?.displayName ?? '',
    publishedAt: item.publishedAt,
    readingTimeMinutes: readingTime(item.content),
  };
}

// -- Skeleton Card -------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="so-result-card" style={{ pointerEvents: 'none' }}>
      <div style={{ width: '200px', minWidth: '200px', height: '100%', overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'var(--bg3)' }}>
        <div className="so-shimmer" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="so-card-content">
        <div className="so-shimmer" style={{ height: '12px', width: '50px', borderRadius: '4px' }} />
        <div className="so-shimmer" style={{ height: '16px', width: '90%', borderRadius: '4px' }} />
        <div className="so-shimmer" style={{ height: '12px', width: '60%', borderRadius: '4px', marginTop: 'auto' }} />
      </div>
    </div>
  );
}

// -- Result Card ---------------------------------------------------------------

interface ResultCardProps {
  article: DisplayArticle;
  query: string;
  index: number;
  onNavigate: () => void;
}

function ResultCard({ article, query, index, onNavigate }: ResultCardProps) {
  const router = useRouter();
  const tc = TAG_COLORS[article.contentType] || 'var(--accent)';
  const href = getArticleHref(article.contentType, article.slug);

  const handleClick = () => {
    onNavigate();
    router.push(href);
  };

  return (
    <div
      className="so-result-card so-card-enter"
      style={{ animationDelay: `${index * 60}ms`, cursor: 'pointer' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      {/* Thumbnail */}
      <div style={{ width: '200px', minWidth: '200px', height: '100%', overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.title}
            fill
            className="so-card-thumb"
            sizes="200px"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gamepad2 style={{ width: '28px', height: '28px', color: 'var(--muted3)' }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="so-card-content">
        {/* Badge */}
        <span
          className="so-card-badge"
          style={{ background: tc }}
        >
          {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
        </span>

        {/* Title — Algolia-highlighted when available (escaped server-side), else client highlight */}
        <p className="so-card-title line-clamp-1">
          {article.titleHtml
            ? <span dangerouslySetInnerHTML={{ __html: article.titleHtml }} />
            : highlightText(article.title, query)}
        </p>

        {/* Excerpt */}
        {(article.excerptHtml || article.excerpt) && (
          <p className="so-card-excerpt line-clamp-2">
            {article.excerptHtml
              ? <span dangerouslySetInnerHTML={{ __html: article.excerptHtml }} />
              : highlightText(article.excerpt || '', query)}
          </p>
        )}

        {/* Meta */}
        <div className="so-card-meta">
          <span>{article.authorDisplayName}</span>
          <span>·</span>
          <span>{formatDate(article.publishedAt || '')}</span>
          <span>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock style={{ width: '10px', height: '10px' }} />
            {article.readingTimeMinutes} min
          </span>
        </div>
      </div>
    </div>
  );
}

// -- Game Result Card ----------------------------------------------------------

interface GameResultCardProps {
  game: AlgoliaGameHit;
  query: string;
  onNavigate: () => void;
}

function GameResultCard({ game, query, onNavigate }: GameResultCardProps) {
  const router = useRouter();
  const titleHtml = game._highlightResult?.title?.value;

  const handleClick = () => {
    onNavigate();
    router.push(`/games/${game.slug}`);
  };

  return (
    <div
      className="so-game-card so-card-enter"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div className="so-game-poster-cover">
        {game.coverImageUrl ? (
          <Image src={game.coverImageUrl} alt={game.title} fill className="object-cover" sizes="130px" unoptimized />
        ) : (
          <Gamepad2 style={{ width: '24px', height: '24px', color: 'var(--muted3)' }} />
        )}
      </div>
      <div className="so-game-poster-info">
        <p className="so-game-poster-title line-clamp-2">
          {titleHtml
            ? <span dangerouslySetInnerHTML={{ __html: titleHtml }} />
            : highlightText(game.title, query)}
        </p>
      </div>
    </div>
  );
}

// -- Tag Pill Row --------------------------------------------------------------

function TagPillRow({ tags, onNavigate }: { tags: AlgoliaTagHit[]; onNavigate: () => void }) {
  if (tags.length === 0) return null;
  return (
    <div className="so-tag-row">
      {tags.map(tag => (
        <Link key={tag.objectID} href={`/tags/${tag.slug}`} className="so-tag-pill" onClick={onNavigate}>
          {tag.name}
          <span className="so-tag-count">{tag.articleCount}</span>
        </Link>
      ))}
    </div>
  );
}

// -- Main Overlay --------------------------------------------------------------

interface SearchOverlayProps {
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function SearchOverlay({ triggerRef }: SearchOverlayProps) {
  const router = useRouter();
  const { searchOverlayOpen, setSearchOverlayOpen } = useUIStore();


  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DisplayArticle[]>([]);
  const [games, setGames] = useState<AlgoliaGameHit[]>([]);
  const [tags, setTags] = useState<AlgoliaTagHit[]>([]);
  const [typoSuggestion, setTypoSuggestion] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Popular / recent searches shown in the initial state
  const [popularSearches, setPopularSearches] = useState<string[]>(POPULAR_SEARCHES_FALLBACK);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('latest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Animation
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  // -- Dynamic popular searches — top tags by article count ------------------

  useEffect(() => {
    if (!algoliaSearchClient) return;
    algoliaSearchClient
      .search({ requests: [{ indexName: TAGS_INDEX, query: '', hitsPerPage: 8 }] } as SearchMethodParams)
      .then(res => {
        const hits = (res.results[0] as { hits?: AlgoliaTagHit[] })?.hits ?? [];
        const names = hits.map(h => h.name).filter(Boolean);
        if (names.length > 0) setPopularSearches(names);
      })
      .catch(() => {});
  }, []);

  // -- Open / close lifecycle ------------------------------------------------

  useEffect(() => {
    if (searchOverlayOpen) {
      setMounted(true);
      setRecentSearches(loadRecentSearches());
      // Animate in next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setVisible(false);
      document.body.style.overflow = '';
      setTimeout(() => {
        setMounted(false);
        // Reset state on close
        setQuery('');
        setResults([]);
        setGames([]);
        setTags([]);
        setTypoSuggestion(null);
        setIsFallback(false);
        setTotalCount(0);
        setHasSearched(false);
        setFiltersVisible(false);
        setSelectedTypes([]);
        setSortBy('latest');
        setDateFrom('');
        setDateTo('');
        setDateRangeOpen(false);
      }, 220); // match close animation duration
    }
    return () => { document.body.style.overflow = ''; };
  }, [searchOverlayOpen]);

  const close = useCallback(() => {
    setSearchOverlayOpen(false);
    setTimeout(() => triggerRef?.current?.focus(), 250);
  }, [setSearchOverlayOpen, triggerRef]);

  // -- Keyboard shortcut — / opens overlay ----------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isInput = ['input', 'textarea', 'select'].includes(tag) ||
        (e.target as HTMLElement).isContentEditable;
      // A6 — Ctrl+K / Cmd+K opens search overlay
      const isSearchShortcut = (e.ctrlKey || e.metaKey) && e.key === 'k';
      if (isSearchShortcut && !searchOverlayOpen) {
        e.preventDefault();
        setSearchOverlayOpen(true);
      }
      if (e.key === '/' && !isInput && !searchOverlayOpen) {
        e.preventDefault();
        setSearchOverlayOpen(true);
      }
      if (e.key === 'Escape' && searchOverlayOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOverlayOpen, setSearchOverlayOpen, close]);

  // -- Focus trap ------------------------------------------------------------

  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  // -- Search logic ----------------------------------------------------------

  const doSearch = useCallback(async (q: string, types: string[], sort: string, from: string, to: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      setGames([]);
      setTags([]);
      setTypoSuggestion(null);
      setIsFallback(false);
      setTotalCount(0);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    try {
      const params: Record<string, unknown> = { q, sort, hitsPerPage: 50 };
      if (types.length > 0) params.contentType = types.join(',');
      if (from) params.dateFrom = from;
      if (to) params.dateTo = to;
      const res = await searchArticles(params);
      const data = res.data;
      if (!data) {
        setResults([]);
        setGames([]);
        setTags([]);
        setTypoSuggestion(null);
        setIsFallback(false);
        setTotalCount(0);
        return;
      }

      const { articles } = data;
      if (Array.isArray(articles)) {
        // Postgres fallback — articles only, no games/tags/highlighting
        setResults(articles.map(toDisplayArticle));
        setGames([]);
        setTags([]);
        setTypoSuggestion(null);
        setIsFallback(true);
        setTotalCount(res.pagination?.total ?? articles.length);
      } else {
        setResults(articles.hits.map(toDisplayArticle));
        setGames(Array.isArray(data.games) ? [] : data.games.hits);
        setTags(Array.isArray(data.tags) ? [] : data.tags.hits);
        setTypoSuggestion(articles.typoSuggestion ?? null);
        setIsFallback(false);
        setTotalCount(articles.nbHits);
      }
    } catch {
      setResults([]);
      setGames([]);
      setTags([]);
      setTypoSuggestion(null);
      setIsFallback(false);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scheduleSearch = useCallback((q: string, types: string[], sort: string, from: string, to: string) => {
    clearTimeout(timerRef.current);
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      setFiltersVisible(false);
      return;
    }
    setFiltersVisible(true);
    timerRef.current = setTimeout(() => doSearch(q, types, sort, from, to), 300);
  }, [doSearch]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    scheduleSearch(v, selectedTypes, sortBy, dateFrom, dateTo);
  };

  const handleTypeToggle = (value: string) => {
    const next = value === ''
      ? []
      : selectedTypes.includes(value)
        ? selectedTypes.filter(t => t !== value)
        : [...selectedTypes, value];
    setSelectedTypes(next);
    scheduleSearch(query, next, sortBy, dateFrom, dateTo);
  };

  const handleSortChange = (v: string) => {
    setSortBy(v);
    scheduleSearch(query, selectedTypes, v, dateFrom, dateTo);
  };

  const handleDateChange = (field: 'from' | 'to', v: string) => {
    const nextFrom = field === 'from' ? v : dateFrom;
    const nextTo = field === 'to' ? v : dateTo;
    if (field === 'from') setDateFrom(v);
    else setDateTo(v);
    scheduleSearch(query, selectedTypes, sortBy, nextFrom, nextTo);
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSortBy('latest');
    setDateFrom('');
    setDateTo('');
    setDateRangeOpen(false);
    scheduleSearch(query, [], 'latest', '', '');
  };

  const activeFilterCount = selectedTypes.length + (sortBy !== 'latest' ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

  const addRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearches(next);
      return next;
    });
  }, []);

  const handleClearRecent = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRecentSearch(query);
    trackClarityEvent('search_performed');
  };

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    setFiltersVisible(true);
    scheduleSearch(term, selectedTypes, sortBy, dateFrom, dateTo);
    addRecentSearch(term);
    inputRef.current?.focus();
  };

  const handleDidYouMean = (suggestion: string) => {
    setQuery(suggestion);
    doSearch(suggestion, selectedTypes, sortBy, dateFrom, dateTo);
    inputRef.current?.focus();
  };

  const handleNavigate = () => {
    addRecentSearch(query);
    close();
  };

  const viewAllHref = () => {
    const sp = new URLSearchParams();
    if (query) sp.set('q', query);
    if (selectedTypes.length === 1) {
      if (selectedTypes[0] === 'GAME') sp.set('tab', 'games');
      else sp.set('contentType', selectedTypes[0]);
    }
    if (sortBy === 'latest') sp.set('sort', 'newest');
    else if (sortBy === 'popular') sp.set('sort', 'popular');
    else if (sortBy === 'rated') sp.set('sort', 'rated');
    return `/search?${sp.toString()}`;
  };

  // -- Render ----------------------------------------------------------------

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={`so-backdrop${visible ? ' so-backdrop--visible' : ''}`}
      onClick={e => { if (e.target === overlayRef.current) close(); }}
      aria-hidden={!searchOverlayOpen}
    >
      <div
        ref={panelRef}
        className={`so-panel${visible ? ' so-panel--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={handlePanelKeyDown}
      >
        {/* -- Header ----------------------------------------------- */}
        <div className="so-header">
          <h2 className="so-title">Search</h2>
          <p className="so-subtitle">Search articles, reviews, mod guides, news and more</p>
        </div>

        {/* -- Search Input ---------------------------------------- */}
        <form onSubmit={handleFormSubmit} className="so-input-wrap">
          <Search className="so-input-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search articles, reviews, guides..."
            className="so-input"
            aria-label="Search query"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              className="so-clear-btn"
              onClick={() => {
                setQuery('');
                setResults([]);
                setGames([]);
                setTags([]);
                setTypoSuggestion(null);
                setIsFallback(false);
                setHasSearched(false);
                setFiltersVisible(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          ) : (
            <kbd className="so-kbd">/</kbd>
          )}
        </form>

        {/* -- Filters Bar ---------------------------------------- */}
        <div className={`so-filters${filtersVisible ? ' so-filters--visible' : ''}`} aria-hidden={!filtersVisible}>
          {/* Content type pills */}
          <div className="so-filter-row">
            {CONTENT_FILTERS.map(f => {
              const isAll = f.value === '';
              const isActive = isAll ? selectedTypes.length === 0 : selectedTypes.includes(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  className={`so-filter-pill${isActive ? ' so-filter-pill--active' : ''}`}
                  onClick={() => handleTypeToggle(f.value)}
                  tabIndex={filtersVisible ? 0 : -1}
                >
                  {f.label}
                </button>
              );
            })}

            {/* Sort dropdown */}
            <div className="so-sort-wrap">
              <select
                value={sortBy}
                onChange={e => handleSortChange(e.target.value)}
                className="so-sort-select"
                tabIndex={filtersVisible ? 0 : -1}
                aria-label="Sort results by"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="so-sort-chevron" />
            </div>

            {/* Date range pill */}
            <button
              type="button"
              className={`so-filter-pill so-date-pill${dateRangeOpen || dateFrom || dateTo ? ' so-filter-pill--active' : ''}`}
              onClick={() => setDateRangeOpen(p => !p)}
              tabIndex={filtersVisible ? 0 : -1}
            >
              <Calendar style={{ width: '12px', height: '12px' }} />
              Date Range
            </button>

            {/* Filters count summary */}
            {activeFilterCount > 0 && (
              <span className="so-filter-count">Filters ({activeFilterCount})</span>
            )}

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <button type="button" className="so-clear-all" onClick={clearAllFilters} tabIndex={filtersVisible ? 0 : -1}>
                Clear All
              </button>
            )}
          </div>

          {/* Date range expander */}
          {dateRangeOpen && (
            <div className="so-date-row">
              <label className="so-date-label">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => handleDateChange('from', e.target.value)}
                  className="so-date-input"
                  tabIndex={filtersVisible ? 0 : -1}
                />
              </label>
              <label className="so-date-label">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => handleDateChange('to', e.target.value)}
                  className="so-date-input"
                  tabIndex={filtersVisible ? 0 : -1}
                />
              </label>
            </div>
          )}
        </div>

        {/* -- Results Area --------------------------------------- */}
        {/* A7 — aria-live region: screen readers announce result changes */}
        <div
          className="so-results"
          aria-live="polite"
          aria-atomic="false"
          aria-label="Search results"
        >

          {/* Loading skeletons */}
          {isLoading && (
            <div className="so-results-list">
              {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Did you mean? */}
          {!isLoading && hasSearched && typoSuggestion && (
            <button
              type="button"
              className="so-did-you-mean so-fade-in"
              onClick={() => handleDidYouMean(typoSuggestion)}
            >
              Did you mean <strong>{typoSuggestion}</strong>?
            </button>
          )}

          {/* Games — shown above articles */}
          {!isLoading && hasSearched && games.length > 0 && (
            <div className="so-section so-fade-in">
              <p className="so-section-label">Games</p>
              <div className="so-games-list">
                {games.map(g => (
                  <GameResultCard key={g.objectID} game={g} query={query} onNavigate={handleNavigate} />
                ))}
              </div>
            </div>
          )}

          {/* Articles */}
          {!isLoading && hasSearched && results.length > 0 && (
            <div className="so-section so-fade-in">
              {games.length > 0 && <p className="so-section-label">Articles</p>}
              <div className="so-results-list">
                {/* Cap the overlay preview at 5 — the full set is one tap away
                    via "View all results" below. */}
                {results.slice(0, 5).map((r, i) => (
                  <ResultCard
                    key={r.id}
                    article={r}
                    query={query}
                    index={i}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tags — shown below articles */}
          {!isLoading && hasSearched && <TagPillRow tags={tags} onNavigate={handleNavigate} />}

          {/* View all results — opens the full search page with advanced filters */}
          {!isLoading && hasSearched && (results.length > 0 || games.length > 0) && (
            <Link href={viewAllHref()} onClick={handleNavigate} className="so-view-all so-fade-in">
              View all results for &ldquo;{query}&rdquo; →
            </Link>
          )}

          {/* No results */}
          {!isLoading && hasSearched && results.length === 0 && games.length === 0 && (
            <div className="so-empty so-fade-in">
              <Search className="so-empty-icon" />
              <p className="so-empty-title">No results for &ldquo;{query}&rdquo;</p>
              <p className="so-empty-sub">Try different keywords or browse by category</p>
            </div>
          )}

          {/* Algolia attribution — required by free-tier ToS when displaying Algolia results */}
          {!isLoading && hasSearched && !isFallback && (results.length > 0 || games.length > 0 || tags.length > 0) && (
            <p className="so-attribution">Search powered by Algolia</p>
          )}

          {/* Initial state — recent + popular searches */}
          {!hasSearched && !isLoading && (
            <>
              {recentSearches.length > 0 && (
                <div className="so-popular so-fade-in">
                  <div className="so-popular-header">
                    <p className="so-popular-label">Recent Searches</p>
                    <button type="button" className="so-clear-all" onClick={handleClearRecent}>
                      Clear
                    </button>
                  </div>
                  <div className="so-popular-tags">
                    {recentSearches.map(term => (
                      <button
                        key={term}
                        type="button"
                        className="so-popular-tag"
                        onClick={() => handleQuickSearch(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="so-popular so-fade-in">
                <p className="so-popular-label">Popular Searches</p>
                <div className="so-popular-tags">
                  {popularSearches.map(term => (
                    <button
                      key={term}
                      type="button"
                      className="so-popular-tag"
                      onClick={() => handleQuickSearch(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          className="so-close-btn"
          onClick={close}
          aria-label="Close search"
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>
      </div>
    </div>,
    document.body
  );
}
