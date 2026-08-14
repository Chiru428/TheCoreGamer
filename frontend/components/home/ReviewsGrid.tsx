'use client';

import HomePostCard from '@/components/blog/HomePostCard';
import type { Article } from '@/types';

interface ReviewsGridProps {
  articles: Article[];
}

export default function ReviewsGrid({ articles }: ReviewsGridProps) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {articles.slice(0, 6).map((article, index) => (
        <HomePostCard
          key={article.id}
          article={article}
          showBadge={false}
          titleClassName={index === 0 ? "!text-[18px] md:!text-[18px] !font-[700]" : "!text-[16px] md:!text-[18px]"}
          mobileHorizontal={index > 0}
          showExcerptOnMobile={index === 0}
          showExcerpt={true}
          showBackground={false}
          truncateTitle={false}
          showViewArticle={false}
          metaClassName={index === 0 ? "flex-row items-center gap-1.5" : "flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-1.5"}
        />
      ))}
    </div>
  );
}
