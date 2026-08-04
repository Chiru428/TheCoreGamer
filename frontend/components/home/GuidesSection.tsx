'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Article } from '@/types';
import { contentTypePath } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import HomePostCard from '@/components/blog/HomePostCard';
import WalkthroughSlider from '@/components/home/WalkthroughSlider';

interface GuidesSectionProps {
  guides: Article[];
}

export default function GuidesSection({ guides }: GuidesSectionProps) {
  if (guides.length === 0) return null;

  return (
    <div className="w-full">
      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-col gap-6 mb-6">
        
        {/* Top Part: Slider + 3 Side Articles */}
        <div className="flex gap-6 h-[450px]">
          <div className="h-full shrink-0 aspect-[16/9] overflow-hidden border border-black/50 shadow-md">
            <WalkthroughSlider articles={guides.slice(0, 3)} />
          </div>
          <div className="flex flex-col gap-4 justify-between h-full flex-1 min-w-0">
            {guides.slice(3, 6).map((article) => (
              <Link
                key={article.id}
                href={`/${contentTypePath(article.contentType)}/${article.slug}`}
                className="group flex gap-4 overflow-hidden items-center transition-all py-1 h-[126px]"
              >
                <div className="flex flex-col justify-center flex-1 min-w-0 pl-2">
                  <h3 className="post-card-title font-bold text-gray-900 dark:text-white !text-[17px] leading-snug group-hover:underline mb-2" style={{ fontFamily: "'Gibson', sans-serif" }}>
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[13px] text-gray-600 dark:text-gray-300 font-medium">
                    {article.author?.displayName && (
                      <span className="font-bold truncate max-w-[120px] text-[#00866b] dark:text-[#00e5a0]">{article.author.displayName}</span>
                    )}
                    <span className="shrink-0">{formatDate(article.publishedAt || article.createdAt)}</span>
                  </div>
                </div>
                <div className="relative aspect-[16/9] shrink-0 h-full overflow-hidden shadow-sm">
                  {article.featuredImageUrl ? (
                    <Image src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="224px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0d0d1a] opacity-30 text-2xl">🎮</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Part: Grid of 4 Articles */}
        {guides.length > 6 && (
          <div className="grid grid-cols-4 gap-6 pt-4 border-t border-black/10 dark:border-white/10">
            {guides.slice(6, 10).map((article) => (
              <HomePostCard 
                key={article.id} 
                article={article} 
                mobileHorizontal={true}
                titleClassName="!text-[18px] gibson-title" 
                titleStyle={{ fontFamily: "'Gibson', sans-serif" }}
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

      {/* Mobile/Small Tablet Layout */}
      <div className="flex lg:hidden flex-col gap-4 mb-6">
        <div className="w-full aspect-[16/9] shrink-0 overflow-hidden border border-black/50 shadow-md">
          <WalkthroughSlider articles={guides.slice(0, 3)} />
        </div>
        
        <div className="flex flex-col gap-4">
          {guides.slice(3, 6).map((article) => (
            <Link
              key={article.id}
              href={`/${contentTypePath(article.contentType)}/${article.slug}`}
              className="group flex gap-3 overflow-hidden items-center transition-all py-1 h-[100px] sm:h-[126px]"
            >
              <div className="flex flex-col justify-center flex-1 min-w-0 pl-1">
                <h3 className="post-card-title font-bold text-gray-900 dark:text-white !text-[15px] sm:!text-[17px] leading-snug group-hover:underline mb-1.5" style={{ fontFamily: "'Gibson', sans-serif" }}>
                  {article.title}
                </h3>
                <div className="flex items-center gap-1.5 text-[13px] text-gray-600 dark:text-gray-300 font-medium">
                  {article.author?.displayName && (
                    <span className="font-bold truncate max-w-[100px] text-[#00866b] dark:text-[#00e5a0]">{article.author.displayName}</span>
                  )}
                  <span className="shrink-0">{formatDate(article.publishedAt || article.createdAt)}</span>
                </div>
              </div>
              <div className="relative aspect-[16/9] shrink-0 h-full overflow-hidden shadow-sm">
                {article.featuredImageUrl ? (
                  <Image src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="(max-width: 640px) 177px, 224px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0d0d1a] opacity-30 text-xl">🎮</div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Part for Mobile */}
        {guides.length > 6 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-black/10 dark:border-white/10 mt-2">
            {guides.slice(6, 10).map((article) => (
              <HomePostCard 
                key={article.id} 
                article={article} 
                mobileHorizontal={false}
                titleClassName="!text-[18px] gibson-title" 
                titleStyle={{ fontFamily: "'Gibson', sans-serif" }}
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
          href="/guides"
          className="flex justify-center w-full sm:w-auto sm:inline-flex items-center rounded-full px-8 font-bold tracking-wide text-black border border-[#00e5a0] bg-[#00e5a0] hover:bg-[#00c98a] hover:border-[#00c98a] hover:underline transition-colors duration-200"
          style={{ height: '33px', fontSize: '16px' }}
        >
          SEE ALL GUIDES
        </Link>
      </div>
    </div>
  );
}
