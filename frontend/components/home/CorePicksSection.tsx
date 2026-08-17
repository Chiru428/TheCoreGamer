'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Article } from '@/types';
import { contentTypePath } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import HomePostCard from '@/components/blog/HomePostCard';

export default function CorePicksSection({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6 w-full">
        {articles.slice(0, 4).map((article) => (
          <div key={article.id}>
            {/* Mobile View (Matches Opinions exactly) */}
            <div className="block md:hidden">
              <HomePostCard 
                article={article} 
                titleClassName="!text-[18px]" 
                showExcerptOnMobile={true} 
                showBackground={false} 
                truncateTitle={false} 
                showViewArticle={false} 
              />
            </div>

            {/* Desktop View (Original side-by-side layout) */}
            <Link
              href={`/${contentTypePath(article.contentType)}/${article.slug}`}
              className="group hidden md:flex gap-6 overflow-hidden items-center"
            >
              <div className="relative w-[320px] shrink-0 aspect-[16/9] overflow-hidden bg-[var(--deep,#0d0d1a)]">
                {article.featuredImageUrl ? (
                  <Image quality={100}
                    src={article.featuredImageUrl}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-1000 ease-out"
                    sizes="320px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl opacity-50">🎮</div>
                )}
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 text-[14px] text-text-muted font-medium mb-2">
                  {article.author?.displayName && (
                    <span className="text-[#00e5a0] font-bold mr-2 truncate max-w-[150px]">
                      {article.author.displayName}
                    </span>
                  )}
                  <span className="shrink-0">{formatDate(article.publishedAt || article.createdAt)}</span>
                </div>
                <h3 className="post-card-title text-black dark:text-white text-[22px] font-bold leading-tight dark:drop-shadow-md mb-2.5">
                  <span className="hover-underline-animation">{article.title}</span>
                </h3>
                {article.excerpt && (
                  <p className="text-[16px] text-text-muted line-clamp-3 leading-relaxed">
                    {article.excerpt}
                  </p>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-7">
        <Link
          href="/lists"
          className="flex justify-center w-full sm:w-auto sm:inline-flex items-center rounded-full px-8 font-bold tracking-wide text-black border border-[#00e5a0] bg-[#00e5a0] hover:bg-[#00c98a] hover:border-[#00c98a] hover:underline transition-colors duration-200"
          style={{ height: '33px', fontSize: '16px' }}
        >
          See more Core Picks
        </Link>
      </div>
    </div>
  );
}
