'use client';

import type { Article } from '@/types';
import HomePostCard from '@/components/blog/HomePostCard';
import Link from 'next/link';

export default function OpinionsSection({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {articles.slice(0, 4).map((article) => (
          <HomePostCard 
            key={article.id} 
            article={article} 
            titleClassName="!text-[18px]" 
            showExcerptOnMobile={true} 
            showBackground={false} 
            truncateTitle={false} 
            showViewArticle={false} 
          />
        ))}
      </div>

      <div className="mt-7">
        <Link
          href="/opinions"
          className="flex justify-center w-full sm:w-auto sm:inline-flex items-center rounded-full px-8 font-bold tracking-wide text-black border border-[#00e5a0] bg-[#00e5a0] hover:bg-[#00c98a] hover:border-[#00c98a] hover:underline transition-colors duration-200"
          style={{ height: '33px', fontSize: '16px' }}
        >
          See more Opinions
        </Link>
      </div>
    </div>
  );
}
