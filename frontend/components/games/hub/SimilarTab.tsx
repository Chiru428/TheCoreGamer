'use client';

import Link from 'next/link';
import type { GameHubData } from '@/types';
import AlgoliaRecommendations from '@/components/blog/AlgoliaRecommendations';

export default function SimilarTab({ game }: { game: GameHubData }) {
 const similarGames = game.dbSimilarGames ?? [];

 return (
  <div>
   {similarGames.length > 0 ? (
    <>
     <div className="section-title-bar">Similar Games ({similarGames.length})</div>
     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-7 sm:gap-x-6 md:gap-x-8">
      {similarGames.map((g) => (
       <Link key={g.slug} href={`/games/${g.slug}`} className="group block">
        <div className="relative overflow-hidden aspect-[2/3] w-full rounded border border-[var(--text)]">
         {g.coverImageUrl ? (
          <img
           src={g.coverImageUrl}
           alt={g.title}
           className="w-full h-full object-cover "
           loading="lazy"
           decoding="async"
          />
         ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
           <span className="text-3xl opacity-20">🎮</span>
          </div>
         )}
        </div>
        <div className="pt-3">
         <p className="line-clamp-2" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: g.publisher ? '3px' : 0 }}>
          <span className="hover-underline-animation">{g.title}</span>
         </p>
         {g.publisher && (
          <p className="line-clamp-1" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted2)' }}>
           {g.publisher}
          </p>
         )}
        </div>
       </Link>
      ))}
     </div>
    </>
   ) : (
    <div style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>No similar games found in the database.</div>
   )}

   <AlgoliaRecommendations
    objectID={`game_${game.id}`}
    indexName="games"
    model="related-products"
    title="Similar Games"
    max={8}
    layout="grid"
    hideSkeleton
   />
  </div>
 );
}
