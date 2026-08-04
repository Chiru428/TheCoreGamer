'use client';

import Link from 'next/link';
import type { Article } from '@/types';
import { contentTypePath } from '@/lib/seo';
import { MoveDown } from 'lucide-react';

function formatFullRelativeDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CorePicksStrip({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="w-full bg-[#141414] rounded-lg overflow-hidden border border-[#2a2a2a] p-4 sm:p-5 mb-10 md:mb-14">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 border-b border-[#2a2a2a] pb-3">
        <h2 className="text-white font-bold tracking-widest text-[16px] uppercase" style={{ fontFamily: '"acumin-pro", sans-serif' }}>
          CORE PICKS
        </h2>
        <Link 
          href="/lists" 
          className="text-white text-[11px] font-bold tracking-widest uppercase flex items-center gap-1 hover:text-[#00e5a0] transition-colors"
          style={{ fontFamily: '"acumin-pro", sans-serif' }}
        >
          MORE <MoveDown size={14} className="opacity-80" />
        </Link>
      </div>

      {/* Grid */}
      <div className="flex overflow-x-auto snap-x no-scrollbar md:grid md:grid-cols-5 md:overflow-visible">
        {articles.map((article, idx) => {
          const isLast = idx === articles.length - 1;
          return (
            <Link 
              key={article.id} 
              href={`/${contentTypePath(article.contentType)}/${article.slug}`}
              className={`flex flex-col shrink-0 snap-start w-[240px] md:w-auto px-4 md:px-5 group first:pl-0 last:pr-0 ${
                !isLast ? 'border-r border-[#2a2a2a] mr-4 md:mr-0' : ''
              }`}
            >
              {/* Date */}
              <div className="text-[#a3a3a3] text-[11px] font-semibold tracking-wide mb-2">
                {formatFullRelativeDate(article.publishedAt || article.createdAt)}
              </div>
              
              {/* Title */}
              <h3 
                className="text-white font-bold text-[15px] sm:text-[16px] leading-[1.3] mb-4 group-hover:underline line-clamp-4"
                style={{ fontFamily: '"Gibson", sans-serif' }}
              >
                {article.title}
              </h3>
              
              {/* Spacer to push author to bottom */}
              <div className="mt-auto pt-2">
                <div className="text-white text-[11px] font-bold flex items-center gap-1" style={{ fontFamily: '"acumin-pro", sans-serif' }}>
                  <span className="text-gray-400 font-normal">By</span> {article.author?.displayName || 'Staff'}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
