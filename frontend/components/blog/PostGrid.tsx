import PostCard from './PostCard';
import type { Article } from '@/types';
import { cn } from '@/lib/utils';

interface PostGridProps {
  articles: Article[];
  variant?: 'default' | 'compact';
  className?: string;
  adSlot?: React.ReactNode;
  adInterval?: number;
  aspectVideo?: boolean;
}

export default function PostGrid({ articles, variant = 'default', className, adSlot, adInterval = 6, aspectVideo }: PostGridProps) {
  if (!articles || articles.length === 0) {
    return (
      <div className="py-20 text-center text-text-muted bg-bg-surface rounded-xl border border-border">
        <p>No articles found.</p>
      </div>
    );
  }

  const items: (Article | 'ad')[] = [];
  articles.forEach((a, i) => {
    items.push(a);
    if (adSlot && (i + 1) % adInterval === 0 && i < articles.length - 1) items.push('ad');
  });

  return (
    <div className={cn(
      'grid gap-0 sm:gap-6 divide-y divide-border sm:divide-y-0',
      variant === 'compact'
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      className
    )}>
      {items.map((item, i) =>
        item === 'ad' ? (
          <div key={`ad-${i}`} className="col-span-full flex justify-center py-4">{adSlot}</div>
        ) : (
          <PostCard key={item.id} article={item} variant={variant === 'compact' ? 'small' : 'medium'} aspectVideo={aspectVideo} />
        )
      )}
    </div>
  );
}
