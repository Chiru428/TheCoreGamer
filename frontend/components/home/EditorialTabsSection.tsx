'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Article } from '@/types';
import { contentTypePath } from '@/lib/seo';
import { formatDate } from '@/lib/utils';

interface EditorialTabsSectionProps {
  corePicks: Article[];
  opinions: Article[];
}

type Tab = {
  key: string;
  label: string;
  href: string;
  articles: Article[];
};

export default function EditorialTabsSection({ corePicks, opinions }: EditorialTabsSectionProps) {
  const tabs: Tab[] = [
    { key: 'core_picks', label: 'Core Picks', href: '/lists', articles: corePicks },
    { key: 'opinions', label: 'Opinions', href: '/opinions', articles: opinions },
  ].filter((t) => t.articles.length > 0);

  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? 'core_picks');
  const activeTabObj = tabs.find((t) => t.key === activeTab);
  const currentArticles = activeTabObj?.articles ?? [];

  if (tabs.length === 0) return null;

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="game-tabs-bar mb-6 border-b border-white/10 flex gap-6 sm:gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`game-tab-btn${activeTab === tab.key ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vertical Stacked Posts (like Opinions) */}
      <div className="flex flex-col gap-6 w-full">
        {currentArticles.slice(0, 6).map((article) => (
          <Link
            key={article.id}
            href={`/${contentTypePath(article.contentType)}/${article.slug}`}
            className="group flex gap-4 md:gap-6 overflow-hidden items-center"
          >
            <div className="relative w-[140px] sm:w-[240px] md:w-[320px] shrink-0 aspect-[16/9] overflow-hidden bg-[var(--deep,#0d0d1a)]">
              {article.featuredImageUrl ? (
                <Image
                  src={article.featuredImageUrl}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-1000 ease-out"
                  sizes="(max-width: 768px) 240px, 320px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl opacity-50">🎮</div>
              )}
            </div>
            <div className="flex flex-col justify-center flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-text-muted font-medium mb-1 md:mb-2">
                {article.author?.displayName && (
                  <span className="text-[#00e5a0] font-bold mr-1 sm:mr-2 truncate max-w-[150px]">
                    {article.author.displayName}
                  </span>
                )}
                <span className="shrink-0">{formatDate(article.publishedAt || article.createdAt)}</span>
              </div>
              <h3 className="post-card-title text-black dark:text-white text-[16px] sm:text-[18px] md:text-[22px] font-bold leading-tight dark:drop-shadow-md mb-1.5 md:mb-2.5">
                <span className="hover-underline-animation">{article.title}</span>
              </h3>
              {article.excerpt && (
                <p className="hidden sm:block text-[14px] md:text-[16px] text-text-muted line-clamp-2 md:line-clamp-3 leading-relaxed">
                  {article.excerpt}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* See More Button */}
      {activeTabObj && (
        <div className="mt-7">
          <Link
            href={activeTabObj.href}
            className="flex justify-center w-full sm:w-auto sm:inline-flex items-center rounded-full px-8 font-bold tracking-wide text-black border border-[#00e5a0] bg-[#00e5a0] hover:bg-[#00c98a] hover:border-[#00c98a] hover:underline transition-colors duration-200"
            style={{ height: '33px', fontSize: '16px' }}
          >
            See more {activeTabObj.label}
          </Link>
        </div>
      )}

      <style jsx>{`
        .game-tabs-bar {
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        }
        .game-tab-btn {
          background: none;
          border: none;
          padding: 0 0 12px 0;
          font-family: 'acumin-pro', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--muted, #a3a3a3);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
        }
        @media (min-width: 768px) {
          .game-tab-btn {
            font-size: 14px;
          }
        }
        .game-tab-btn:hover {
          color: var(--text-strong, #fff);
        }
        .game-tab-btn.active {
          color: var(--text-strong, #fff);
        }
        .game-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #00e5a0;
          border-radius: 2px 2px 0 0;
        }
      `}</style>
    </div>
  );
}
