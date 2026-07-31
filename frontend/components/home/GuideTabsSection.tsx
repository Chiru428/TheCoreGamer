'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Article } from '@/types';
import { contentTypePath } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import HomePostCard from '@/components/blog/HomePostCard';
import WalkthroughSlider from '@/components/home/WalkthroughSlider';

interface GuideTabsSectionProps {
  guides: Article[];
}

export default function GuideTabsSection({ guides }: GuideTabsSectionProps) {
  const [activeTab, setActiveTab] = useState('All');

  // Extract unique guideTypes for tabs, defaulting to "General" if null
  const guideTypes = Array.from(new Set(guides.map(g => g.guideType || 'General')));
  
  const tabs = [
    { key: 'All', label: 'All Guides' },
    ...guideTypes.map(type => ({ key: type, label: type + 's' }))
  ];

  const currentGuides = activeTab === 'All' 
    ? guides 
    : guides.filter(g => (g.guideType || 'General') === activeTab);

  if (guides.length === 0) return null;

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="game-tabs-bar mb-6 border-b border-white/10 flex gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`game-tab-btn whitespace-nowrap ${activeTab === tab.key ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Layout borrowed from original Walkthrough section for top items */}
        {currentGuides.length > 0 && (
          <div className="hidden lg:flex gap-6 h-[460px] p-5 shadow-lg border-0 mb-6" style={{ background: 'linear-gradient(to right, #050505 0%, #151515 40%, #c59b27 100%)' }}>
            <div className="w-[670px] shrink-0 h-full overflow-hidden border border-black/50 shadow-md">
              <WalkthroughSlider articles={currentGuides.slice(0, 3)} />
            </div>
            <div className="flex flex-col gap-4 justify-between h-full flex-1 min-w-0">
              {currentGuides.slice(3, 6).map((article) => (
                <Link
                  key={article.id}
                  href={`/${contentTypePath(article.contentType)}/${article.slug}`}
                  className="group flex gap-4 overflow-hidden items-center bg-black/40 hover:bg-black/60 border border-white/5 transition-all p-3 h-[126px]"
                >
                  <div className="flex flex-col justify-center flex-1 min-w-0 pl-2">
                    <h3 className="post-card-title font-bold text-white !text-[16px] leading-snug group-hover:underline mb-2 line-clamp-2" style={{ fontFamily: "'Rubik', sans-serif" }}>
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[13px] text-gray-300 font-medium">
                      {article.author?.displayName && (
                        <span className="font-bold truncate max-w-[120px]" style={{ color: '#00e5a0' }}>{article.author.displayName}</span>
                      )}
                      <span className="shrink-0">{formatDate(article.publishedAt || article.createdAt)}</span>
                    </div>
                  </div>
                  <div className="relative w-[180px] shrink-0 h-full overflow-hidden shadow-sm">
                    {article.featuredImageUrl ? (
                      <Image src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="180px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#0d0d1a] opacity-30 text-2xl">🎮</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mobile/Small Tablet Layout for top items */}
        {currentGuides.length > 0 && (
          <div className="flex flex-col gap-4 p-4 lg:hidden shadow-lg border-0 mb-6" style={{ background: 'linear-gradient(to bottom, #050505 0%, #151515 40%, #c59b27 100%)' }}>
            <div className="w-full aspect-[16/9] shrink-0 overflow-hidden border border-black/50 shadow-md">
              <WalkthroughSlider articles={currentGuides.slice(0, 3)} />
            </div>
            <div className="flex flex-col gap-4">
              {currentGuides.slice(3, 6).map((article) => (
                <Link
                  key={article.id}
                  href={`/${contentTypePath(article.contentType)}/${article.slug}`}
                  className="group flex gap-3 overflow-hidden items-center bg-black/40 hover:bg-black/60 border border-white/5 transition-all p-3 h-[100px] sm:h-[126px]"
                >
                  <div className="flex flex-col justify-center flex-1 min-w-0 pl-1">
                    <h3 className="post-card-title font-bold text-white !text-[14px] sm:!text-[16px] leading-snug group-hover:underline mb-1.5 line-clamp-2" style={{ fontFamily: "'Rubik', sans-serif" }}>
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[13px] text-gray-300 font-medium">
                      {article.author?.displayName && (
                        <span className="font-bold truncate max-w-[100px]" style={{ color: '#00e5a0' }}>{article.author.displayName}</span>
                      )}
                      <span className="shrink-0">{formatDate(article.publishedAt || article.createdAt)}</span>
                    </div>
                  </div>
                  <div className="relative w-[130px] sm:w-[180px] shrink-0 h-full overflow-hidden shadow-sm">
                    {article.featuredImageUrl ? (
                      <Image src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="(max-width: 640px) 130px, 180px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#0d0d1a] opacity-30 text-xl">🎮</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Remaining guides in a grid (like original mod guides section) */}
        {currentGuides.length > 6 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 mt-4">
            {currentGuides.slice(6, 14).map((article) => (
              <HomePostCard 
                key={article.id} 
                article={article} 
                mobileHorizontal={true}
                titleClassName="!text-[15px] sm:!text-[18px] rubik-title" 
                titleStyle={{ fontFamily: "'Rubik', sans-serif" }}
                showExcerpt={true} 
                showExcerptOnMobile={false}
                showBackground={false} 
                noBorderRadius={true}
                showBadge={false}
                showAuthor={true}
                truncateTitle={false} 
                showViewArticle={false} 
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-7">
        <Link
          href={`/guides${activeTab !== 'All' ? `?type=${activeTab}` : ''}`}
          className="flex justify-center w-full sm:w-auto sm:inline-flex items-center rounded-full px-8 font-bold tracking-wide text-black border border-[#00e5a0] bg-[#00e5a0] hover:bg-[#00c98a] hover:border-[#00c98a] hover:underline transition-colors duration-200"
          style={{ height: '33px', fontSize: '16px' }}
        >
          {activeTab === 'All' ? 'SEE ALL GUIDES' : `SEE MORE ${activeTab.toUpperCase()}S`}
        </Link>
      </div>
    </div>
  );
}
