'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HomePostCard from '@/components/blog/HomePostCard';
import type { Article } from '@/types';
import Link from 'next/link';

interface ScrollableArticleSectionProps {
  title: string;
  articles: Article[];
  seeMoreHref: string;
  seeMoreLabel: string;
}

export default function ScrollableArticleSection({ title, articles, seeMoreHref, seeMoreLabel }: ScrollableArticleSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300; // one card width + gap
      const newScrollPosition = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollRef.current.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth'
      });
    }
  };

  if (!articles || articles.length === 0) return null;

  return (
    <section className="mb-10 md:mb-14 last:mb-0">
      <div className="flex items-center justify-between mb-6">
        <div className="section-title-bar font-bold text-[var(--text)]">{title}</div>
        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => scroll('left')} 
            className="w-8 h-8 rounded-full border border-white/10 bg-black/20 hover:bg-black/40 hover:border-[#00e5a0] text-white/60 hover:text-[#00e5a0] transition-all flex items-center justify-center cursor-pointer" 
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => scroll('right')} 
            className="w-8 h-8 rounded-full border border-white/10 bg-black/20 hover:bg-black/40 hover:border-[#00e5a0] text-white/60 hover:text-[#00e5a0] transition-all flex items-center justify-center cursor-pointer" 
            aria-label="Scroll right"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Mobile/Small Tablet Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:hidden">
        <HomePostCard article={articles[0]} titleClassName="!text-[18px]" showExcerptOnMobile={true} showBackground={false} imageClassName="aspect-[16/9]" truncateTitle={false} showViewArticle={false} noTopLeftRadius={true} />
        {articles.slice(1, 6).map((a) => (
          <HomePostCard key={a.id} article={a} mobileHorizontal={true} titleClassName="!text-[15px] sm:!text-[18px]" showBackground={false} imageClassName="aspect-[16/9]" truncateTitle={false} showViewArticle={false} noTopLeftRadius={true} />
        ))}
      </div>

      {/* Desktop Layout */}
      <div 
        ref={scrollRef}
        className="hidden md:flex overflow-x-auto gap-5 snap-x no-scrollbar pb-4 -mb-4 scroll-smooth"
      >
        {articles.slice(0, 6).map((a) => (
          <div key={a.id} className="w-[280px] shrink-0 snap-start">
            <HomePostCard article={a} titleClassName="!text-[16px] sm:!text-[18px]" showBackground={false} imageClassName="aspect-[16/9]" truncateTitle={false} showViewArticle={false} noTopLeftRadius={true} />
          </div>
        ))}
      </div>

      <div className="mt-7">
        <Link
          href={seeMoreHref}
          className="flex justify-center w-full sm:w-auto sm:inline-flex items-center rounded-full px-8 font-bold tracking-wide text-black border border-[#00e5a0] bg-[#00e5a0] hover:bg-[#00c98a] hover:border-[#00c98a] hover:underline transition-colors duration-200"
          style={{ height: '33px', fontSize: '16px' }}
        >
          See more {seeMoreLabel}
        </Link>
      </div>
    </section>
  );
}
