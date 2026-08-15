'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { contentTypePath } from '@/lib/seo';
import type { Article } from '@/types';

function formatDate(dateString?: string | Date | null) {
  if (!dateString) return '';
  return new Date(dateString)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function WalkthroughSlider({ articles }: { articles: Article[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (articles.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 5000); // 5 seconds
    return () => clearInterval(timer);
  }, [articles.length]);

  if (!articles || articles.length === 0) return null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div 
        className="flex w-full h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {articles.map((article, idx) => (
          <Link
            key={article.id}
            href={`/${contentTypePath(article.contentType)}/${article.slug}`}
            className="group relative w-full h-full shrink-0"
          >
            {article.featuredImageUrl ? (
              <Image 
                src={article.featuredImageUrl} 
                alt={article.title} 
                fill 
                className="object-cover" 
                sizes="50vw" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--deep,#0d0d1a)] text-4xl opacity-20">🎮</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end">
              <div className="flex items-center gap-1.5 text-[13px] text-gray-300 font-medium mb-1.5">
                {article.author?.displayName && (
                  <span className="font-bold truncate max-w-[120px]" style={{ color: '#00e5a0' }}>
                    {article.author.displayName}
                  </span>
                )}
                <span className="shrink-0">{formatDate(article.publishedAt || article.createdAt)}</span>
              </div>
              <h3 className="post-card-title text-white !text-[14px] sm:!text-[28px] font-bold leading-tight drop-shadow-md">
                <span className="hover-underline-animation">{article.title}</span>
              </h3>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Optional: Indicator dots */}
      {articles.length > 1 && (
        <div className="absolute bottom-3 left-6 z-20 flex gap-2">
          {articles.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                setCurrentIndex(idx);
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-[#00e5a0]' : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
