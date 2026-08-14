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
type TabKey = 'lists' | 'opinions';

interface Tab {
  key: TabKey;
  label: string;
  href: string;
  accentColor: string;
  badgeClass: string;
}

const TABS: Tab[] = [
  { key: 'lists',    label: 'Core Picks', href: '/lists',   accentColor: '#fbbf24',  badgeClass: 'badge-list' },
  { key: 'opinions', label: 'Opinions',   href: '/opinions', accentColor: '#f472b6', badgeClass: 'badge-opinion' },
];

// ─── Map content type → tab key ───────────────────────────────────────────────
function contentTypeToTabKey(contentType: string): TabKey {
  switch (contentType) {
    case 'LISTICLE': return 'lists';
    case 'OPINION':  return 'opinions';
    default:         return 'lists';
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

import HomePostCard from '@/components/blog/HomePostCard';

// ─── Main component ───────────────────────────────────────────────────────────
export default function DiscoveryTabsSection({
  latestArticles,
  guideArticles,
  listicleArticles,
  opinionArticles,
  dealArticles,
  hotDeals,
}: DiscoveryTabsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('lists');
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Per-tab article lists
  const articlesByTab: Record<TabKey, Article[]> = {
    lists:    listicleArticles,
    opinions: opinionArticles,
  };

  // Only render tabs that have content
  const visibleTabs = TABS.filter(
    t => articlesByTab[t.key].length > 0
  );

  if (latestArticles.length === 0) return null;

  const activeArticles = articlesByTab[activeTab] || [];
  const activeTabObj = TABS.find(t => t.key === activeTab) || TABS[0];

  // "See more" destination
  const seeMoreHref = activeTabObj.href;
  const seeMoreLabel = `See more ${activeTabObj.label}`;

  return (
    <section className="mt-6">
      {/* ── Section header ───────────────────────────────────── */}
      <div className="mb-0 flex flex-col items-start">
        <div className="w-[60px] h-[6px] bg-gradient-to-r from-[#ff4b4b] to-[#ff9033] mb-2" />
        <div className="section-title-bar font-bold text-[var(--text)] uppercase">
          More from TheCoreGamer
        </div>
      </div>

      {/* ── IGN-style tab bar (Games Section Style) ─────────────── */}
      <div className="w-full overflow-x-auto mt-5" style={{ scrollbarWidth: 'none' }}>
        <div
          ref={tabBarRef}
          className="flex items-end border-b border-[rgba(255,255,255,0.08)] mb-5"
          role="tablist"
        >
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={isActive}
                className={`relative pb-2.5 mr-7 bg-transparent border-none cursor-pointer text-[12px] md:text-[14px] font-bold tracking-[0.12em] uppercase transition-colors outline-none whitespace-nowrap ${isActive ? 'text-[var(--text-strong,#fff)]' : 'text-[var(--muted2,#6b7280)] hover:text-[var(--text-strong,#fff)]'}`}
                style={{ fontFamily: "'Gibson', sans-serif" }}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#00e5a0] rounded-t-[2px]" />
                )}
              </button>
            );
          })}
        </div>
      </div>


      {/* ── Article feed — Hero + Grid ────────── */}
      <div className="flex flex-col mt-4">
        {activeArticles.length > 0 && (
          <div className="mb-0 md:mb-2">
            <HomePostCard
              article={activeArticles[0]}
              showBadge={false}
              showExcerptOnMobile={true}
              titleClassName="!text-[18px] md:!text-[26px] !font-[700]"
              showExcerpt={true}
              showBackground={false}
              truncateTitle={false}
              showViewArticle={false}
              metaClassName="flex-row items-center gap-1.5"
            />
          </div>
        )}

        {activeArticles.length > 1 && (
          <div className="grid grid-cols-2 gap-4 lg:gap-5 mt-4">
            {activeArticles.slice(1, 7).map((article) => (
              <HomePostCard
                key={article.id}
                article={article}
                showBadge={false}
                titleClassName="!text-[16px] md:!text-[18px]"
                showExcerptOnMobile={false}
                showExcerpt={true}
                showBackground={false}
                truncateTitle={false}
                showViewArticle={false}
                metaClassName="flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-1.5"
              />
            ))}
          </div>
        )}
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
