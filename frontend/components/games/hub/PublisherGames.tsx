'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { fetchGames } from '@/lib/api';
import type { Game } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';

export default function PublisherGames({ publisher, excludeSlug }: { publisher: string; excludeSlug: string }) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = current.clientWidth * 0.75;
      current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadGames = async () => {
      setLoading(true);
      const res = await fetchGames({ publisher, exclude: excludeSlug, limit: 25, sort: 'popular', fields: 'card' });
      if (mounted && res.success && res.data) {
        setGames(res.data);
      }
      if (mounted) setLoading(false);
    };
    if (publisher) {
      loadGames();
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [publisher, excludeSlug]);

  if (!loading && games.length === 0) return null;

  return (
    <section className="mt-16 mb-12 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[18px] md:text-[20px] font-bold rubik-label uppercase flex items-center gap-2 before:content-[''] before:w-[3px] before:h-[1em] before:bg-[#3b82f6] before:rounded-[2px]" style={{ color: 'var(--text)' }}>
          More from {publisher}
        </h2>

        {games.length > 2 && (
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-white/20 text-white/70 hover:bg-[var(--brand-green)] hover:text-white hover:border-[var(--brand-green)] transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-white/20 text-white/70 hover:bg-[var(--brand-green)] hover:text-white hover:border-[var(--brand-green)] transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="relative group">
        {games.length > 6 && (
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
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="group/card block flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start">
                <Skeleton className="w-full aspect-[2/3] rounded mb-3 border border-[var(--text)]" />
                <div>
                  <Skeleton className="w-3/4 h-4 rounded mb-2" />
                  <Skeleton className="w-1/2 h-3 rounded" />
                </div>
              </div>
            ))
          ) : (
            games.map((g) => {
              const id = 'id' in g ? g.id : (g as any).objectID;
              return (
                <Link 
                  key={id} 
                  href={`/games/${g.slug}`} 
                  className="group/card block flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start"
                >
                  <div className="relative overflow-hidden aspect-[2/3] w-full mb-3 rounded border border-[var(--text)]">
                    {g.coverImageUrl ? (
                      <img
                        src={g.coverImageUrl}
                        alt={g.title}
                        className="w-full h-full object-cover"
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
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
