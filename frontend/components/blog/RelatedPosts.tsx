import PostCard from './PostCard';
import type { Article } from '@/types';

export default function RelatedPosts({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  return (
    <section className="mt-12">
      <h3 className="text-xl font-bold text-text-primary mb-6">Related Articles</h3>
      <div className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-accent/20 scrollbar-track-transparent hover:scrollbar-thumb-accent/40 transition-colors snap-x snap-mandatory">
        {articles.map((a) => (
          <div key={a.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
            <PostCard article={a} variant="vertical" />
          </div>
        ))}
      </div>
    </section>
  );
}
