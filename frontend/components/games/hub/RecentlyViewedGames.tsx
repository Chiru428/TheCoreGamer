'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRecentlyViewedGames } from '@/hooks/useRecentlyViewedGames';
import type { Game } from '@/types';

interface Props {
 currentGame: Game;
}

export default function RecentlyViewedGames({ currentGame }: Props) {
 const { history, isLoaded, addGameToHistory } = useRecentlyViewedGames();
 const scrollContainerRef = useRef<HTMLDivElement>(null);

 const scroll = (direction: 'left' | 'right') => {
   if (scrollContainerRef.current) {
     const { current } = scrollContainerRef;
     const scrollAmount = current.clientWidth * 0.75;
     current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
   }
 };

 // On mount, add current game to history
 useEffect(() => {
  addGameToHistory({
   id: currentGame.id,
   slug: currentGame.slug,
   title: currentGame.title,
   coverImageUrl: currentGame.coverImageUrl,
   publisher: currentGame.publisher,
  });
  // We intentionally only want this to run when currentGame changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [currentGame.id]);

 // Filter out the current game so it doesn't show in the list below it
 const displayGames = useMemo(() => {
  return history.filter(g => g.id !== currentGame.id);
 }, [history, currentGame.id]);

 if (!isLoaded || displayGames.length === 0) {
  return null;
 }

 return (
  <section className="mt-16 mb-12 max-w-[1400px] mx-auto px-4 md:px-8">
   <div className="flex items-center justify-between mb-6">
    <h2 className="text-[18px] md:text-[20px] font-bold gibson-label flex items-center gap-2 before:content-[''] before:w-[3px] before:h-[1em] before:bg-[#3b82f6] before:rounded-[2px]" style={{ color: 'var(--text)' }}>
     Recently Viewed
    </h2>

    {displayGames.length > 2 && (
      <div className="flex md:hidden items-center gap-2">
        <button 
          onClick={() => scroll('left')} 
          className="w-8 h-8 flex items-center justify-center rounded-full border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:bg-[var(--brand-green)] hover:text-white hover:border-[var(--brand-green)] transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={() => scroll('right')} 
          className="w-8 h-8 flex items-center justify-center rounded-full border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:bg-[var(--brand-green)] hover:text-white hover:border-[var(--brand-green)] transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    )}
   </div>

   <div className="relative group">
    {displayGames.length > 6 && (
      <>
        {/* Left Arrow */}
        <button 
          onClick={() => scroll('left')} 
          className="absolute left-0 top-[40%] -translate-y-1/2 -translate-x-1/2 z-10 w-12 h-12 hidden md:flex items-center justify-center rounded-full bg-black dark:bg-white border border-transparent text-white dark:text-black hover:bg-[var(--brand-green)] dark:hover:bg-[var(--brand-green)] hover:text-white dark:hover:text-white opacity-0 group-hover:opacity-100 transition-colors shadow-lg"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-7 h-7 -ml-0.5" />
        </button>

        {/* Right Arrow */}
        <button 
          onClick={() => scroll('right')} 
          className="absolute right-0 top-[40%] -translate-y-1/2 translate-x-1/2 z-10 w-12 h-12 hidden md:flex items-center justify-center rounded-full bg-black dark:bg-white border border-transparent text-white dark:text-black hover:bg-[var(--brand-green)] dark:hover:bg-[var(--brand-green)] hover:text-white dark:hover:text-white opacity-0 group-hover:opacity-100 transition-colors shadow-lg"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-7 h-7 -mr-0.5" />
        </button>
      </>
    )}

    {/* Horizontal scroll container */}
    <div 
      ref={scrollContainerRef}
      className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
    {displayGames.map((g) => (
     <Link 
      key={g.id} 
      href={`/games/${g.slug}`} 
      className="group/card block flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start"
     >
      <div className="relative overflow-hidden aspect-[2/3] w-full mb-3 rounded-none border border-[var(--text)]">
       {g.coverImageUrl ? (
        <img
         src={g.coverImageUrl}
         alt={g.title}
         className="w-full h-full object-cover "
         loading="lazy"
         decoding="async"
        />
       ) : (
        <div className="w-full h-full flex items-center justify-center rounded-md" style={{ background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
         <span className="text-3xl opacity-20">🎮</span>
        </div>
       )}
      </div>
      <div>
       <p className="line-clamp-2 group-hover/card:underline" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: g.publisher ? '3px' : 0 }}>
        {g.title}
       </p>
       {g.publisher && (
        <p className="line-clamp-1" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted2)' }}>
         {g.publisher}
        </p>
       )}
      </div>
     </Link>
    ))}
   </div>
   </div>
  </section>
 );
}
