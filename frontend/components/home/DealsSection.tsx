import { contentTypePath } from '@/lib/seo';
import type { Article } from '@/types';
import HomePostCard from '@/components/blog/HomePostCard';

export default function DealsSection({ 
  articles,
  sideArticles 
}: { 
  articles: Article[],
  sideArticles?: Article[]
}) {
  // Combine articles and sideArticles, taking only the first 4 for the row
  const displayArticles = [...(articles || []), ...(sideArticles || [])];
  
  // Deduplicate by ID just in case
  const uniqueArticles = Array.from(new Map(displayArticles.map(item => [item.id, item])).values()).slice(0, 4);

  if (uniqueArticles.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
      {uniqueArticles.map((article) => (
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
      
      {/* Render empty placeholders if less than 4 deals are available */}
      {Array.from({ length: Math.max(0, 4 - uniqueArticles.length) }).map((_, i) => (
        <div key={`deal-placeholder-${i}`} className="group flex flex-col gap-3 opacity-50">
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg bg-black/20 border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-40 text-white">More Deals Soon</span>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <div className="h-3 w-1/3 bg-white/10 rounded-sm"></div>
            <div className="h-4 w-3/4 bg-white/10 rounded-sm"></div>
            <div className="h-4 w-1/2 bg-white/10 rounded-sm"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
