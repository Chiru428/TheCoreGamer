'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Article } from '@/types';
import { contentTypePath } from '@/lib/seo';
import { formatDate, getGuideTypeColor } from '@/lib/utils';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import ScoreBadge from '@/components/review/ScoreBadge';

// ─── Tab definitions ───────────────────────────────────────────────────────────
type TabKey = 'latest' | 'guides' | 'lists' | 'opinions' | 'deals';

interface Tab {
  key: TabKey;
  label: string;
  href: string;
  accentColor: string;
  badgeClass: string;
}

const TABS: Tab[] = [
  { key: 'latest',   label: 'Latest',     href: '/',        accentColor: '#3b82f6',  badgeClass: '' },
  { key: 'guides',   label: 'Guides',     href: '/guides',  accentColor: '#60a5fa',  badgeClass: 'badge-guide' },
  { key: 'lists',    label: 'Core Picks', href: '/lists',   accentColor: '#fbbf24',  badgeClass: 'badge-list' },
  { key: 'opinions', label: 'Opinions',   href: '/opinions', accentColor: '#f472b6', badgeClass: 'badge-opinion' },
  { key: 'deals',    label: 'Deals',      href: '/deals',   accentColor: '#22d3ee',  badgeClass: 'badge-deal' },
];

// ─── Map content type → tab key ───────────────────────────────────────────────
function contentTypeToTabKey(contentType: string): TabKey {
  switch (contentType) {
    case 'GUIDE':    return 'guides';
    case 'LISTICLE': return 'lists';
    case 'OPINION':  return 'opinions';
    case 'DEAL':     return 'deals';
    default:         return 'latest';
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface DiscoveryTabsSectionProps {
  latestArticles:  Article[];
  guideArticles:   Article[];
  listicleArticles: Article[];
  opinionArticles: Article[];
  dealArticles:    Article[];
  hotDeals:        Article[];
}

// ─── Single article row (horizontal) ─────────────────────────────────────────
function ArticleRow({ article, showTypeBadge = true, isHero = false }: { article: Article; showTypeBadge?: boolean; isHero?: boolean }) {
  const href = `/${contentTypePath(article.contentType)}/${article.slug}`;
  const tc   = CONTENT_TYPE_COLORS[article.contentType] || { bg: '#3b82f6', color: '#fff', textColor: '#3b82f6' };
  const badgeLabel =
    article.contentType === 'GUIDE' && article.guideType
      ? article.guideType
      : (CONTENT_TYPE_LABELS[article.contentType] || article.contentType);
  const badgeColor =
    article.contentType === 'GUIDE' && article.guideType
      ? getGuideTypeColor(article.guideType)
      : tc.textColor || tc.bg;

  return (
    <Link
      href={href}
      className={`group flex py-6 border-b border-[var(--border)] last:border-0 -mx-3 px-3 ${isHero ? 'flex-col gap-4' : 'items-center gap-4'}`}
    >
      {/* Thumbnail */}
      <div className={`relative shrink-0 overflow-hidden rounded-md bg-[var(--bg2)] ${isHero ? 'w-full aspect-[16/9]' : 'w-[140px] sm:w-[300px] aspect-[16/9]'}`}>
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.title}
            fill
            className="object-cover"
            sizes={isHero ? "(max-width: 845px) 100vw, 845px" : "(max-width: 640px) 140px, 300px"}
            quality={90}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🎮</div>
        )}
        {article.contentType === 'REVIEW' && article.gameReview?.reviewScore && (
          <div className="absolute bottom-1.5 right-1.5 z-10">
            <ScoreBadge score={Number(article.gameReview.reviewScore)} size="sm" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Meta rows */}
        <div className={`flex ${isHero ? 'items-center gap-2 flex-wrap' : 'flex-col md:flex-row md:items-center gap-1 md:gap-2 md:flex-wrap'} mb-1.5`}>
          {showTypeBadge && (
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-800 tracking-[0.8px] uppercase"
                style={{ color: badgeColor, fontWeight: 800 }}
              >
                {badgeLabel}
              </span>
              <span className={`text-[var(--muted3)] text-[12px] ${isHero ? 'block' : 'hidden md:block'}`}>·</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {article.author?.displayName && (
              <span className="text-[14px] font-bold text-[var(--brand-green)] truncate max-w-[130px]">
                {article.author.displayName}
              </span>
            )}
            <span className="text-[14px] text-[var(--muted3)] shrink-0">
              {formatDate(article.publishedAt || article.createdAt)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          className={`post-card-title font-bold text-[var(--text)] leading-snug group-hover:underline ${isHero ? 'text-[18px] md:text-[24px]' : 'text-[15px] md:text-[17px]'}`}
          style={{ fontFamily: "'Gibson', sans-serif" }}
        >
          {article.title}
        </h3>

        {/* Excerpt */}
        {article.excerpt && (
          <p className={`text-[var(--muted2)] mt-1 leading-relaxed ${isHero ? 'block text-[15px] md:text-[17px] line-clamp-3 md:line-clamp-2' : 'hidden md:block text-[16px] line-clamp-1'}`}>
            {article.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DiscoveryTabsSection({
  latestArticles,
  guideArticles,
  listicleArticles,
  opinionArticles,
  dealArticles,
  hotDeals,
}: DiscoveryTabsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('latest');
  const tabBarRef = useRef<HTMLDivElement>(null);

  // The articles that will actually be shown in the 'latest' tab
  const displayedLatestIds = new Set(latestArticles.slice(0, 10).map(a => a.id));

  // Per-tab article lists
  const articlesByTab: Record<TabKey, Article[]> = {
    latest:   latestArticles,
    guides:   guideArticles.filter(a => !displayedLatestIds.has(a.id)),
    lists:    listicleArticles.filter(a => !displayedLatestIds.has(a.id)),
    opinions: opinionArticles.filter(a => !displayedLatestIds.has(a.id)),
    deals:    [...dealArticles, ...hotDeals].filter(
      (a, i, arr) => arr.findIndex(x => x.id === a.id) === i && !displayedLatestIds.has(a.id)
    ),
  };

  // Only render tabs that have content
  const visibleTabs = TABS.filter(
    t => articlesByTab[t.key].length > 0
  );

  if (latestArticles.length === 0) return null;

  const activeArticles = articlesByTab[activeTab] || [];
  const activeTabObj = TABS.find(t => t.key === activeTab) || TABS[0];

  // "See more" destination
  const seeMoreHref = activeTab === 'latest' ? null : activeTabObj.href;
  const seeMoreLabel = activeTab === 'latest' ? null : `See more ${activeTabObj.label}`;

  return (
    <section className="mt-6">
      {/* ── Section header ───────────────────────────────────── */}
      <div className="mb-0">
        <div className="section-title-bar font-bold text-[var(--text)]">
          More from TheCoreGamer
        </div>
      </div>

      {/* ── IGN-style tab bar ─────────────────────────────────── */}
      <div className="w-full overflow-x-auto mt-5" style={{ scrollbarWidth: 'none' }}>
        <div
          ref={tabBarRef}
          className="inline-flex items-stretch"
          style={{
            background: 'var(--bg2)',
            borderRadius: '999px',
            minHeight: '40px',
            gap: '3px',
          }}
          role="tablist"
        >
          {visibleTabs.map((tab, i) => {
            const isActive = activeTab === tab.key;
            const isLast   = i === visibleTabs.length - 1;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={isActive}
                className="shrink-0 outline-none transition-colors duration-150 flex items-center justify-center"
                style={{
                  padding: '7px 28px',
                  borderRadius: isActive
                    ? (i === 0
                        ? '999px 0 0 999px'
                        : isLast
                          ? '0 999px 999px 0'
                          : '0')
                    : '0',
                  margin: '0',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#000000' : 'var(--muted2)',
                  letterSpacing: '0.1px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted2)';
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>


      {/* ── Article feed — single column, IGN-style ────────── */}
      <div className="flex flex-col mt-2">
        {activeArticles.slice(0, 10).map((article, index) => (
          <ArticleRow
            key={article.id}
            article={article}
            showTypeBadge={activeTab === 'latest'}
            isHero={index === 0}
          />
        ))}
      </div>

      {/* ── Bottom "See all" button ──────────────────────────── */}
      {seeMoreHref && (
        <div className="mt-8 flex justify-start">
          <Link
            href={seeMoreHref}
            className="flex justify-center w-full sm:w-auto sm:inline-flex items-center rounded-full px-8 font-bold tracking-wide text-black border border-[var(--brand-green)] bg-[var(--brand-green)] hover:bg-[var(--brand-green-hover)] hover:border-[var(--brand-green-hover)] hover:underline transition-colors duration-200"
            style={{ height: '33px', fontSize: '16px' }}
          >
            {seeMoreLabel}
          </Link>
        </div>
      )}


    </section>
  );
}
