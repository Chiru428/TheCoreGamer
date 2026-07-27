'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDate, readingTime } from '@/lib/utils';
import type { Article } from '@/types';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import ScoreBadge from '@/components/review/ScoreBadge';
import { Gamepad2} from 'lucide-react';
import { contentTypePath } from '@/lib/seo';

interface SharedListCardProps {
  article: any;
  priority?: boolean;
}

export default function SharedListCard({ article, priority = false }: SharedListCardProps) {
  const tc = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)', color: '#fff' };
  const rt = readingTime(article.modGuide?.sections || article.walkthrough?.sections || article.content);
  
  const linkBase = `/${contentTypePath(article.contentType)}`;
  const href = `${linkBase}/${article.slug}`;

  return (
    <Link 
      href={href}
      className="group flex flex-col sm:flex-row w-full bg-transparent relative overflow-hidden pb-3 sm:pb-4 mb-6 sm:mb-8 border-b-2 border-border h-auto sm:min-h-[135px] lg:min-h-[180px]"
    >
      <article className="flex flex-col sm:flex-row sm:items-start w-full">
        {/* Image Area */}
        <div className="block w-full sm:w-[240px] lg:w-[320px] aspect-[16/9] shrink-0 relative overflow-hidden bg-[var(--deep,#0d0d1a)]">
          {article.featuredImageUrl ? (
            <Image 
              src={article.featuredImageUrl} 
              alt={article.title} 
              fill 
              className="object-cover transition-transform duration-1000 ease-out" 
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 240px, 320px"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <Gamepad2 className="w-8 h-8 opacity-20" />
            </div>
          )}
          {article.contentType === 'REVIEW' && article.gameReview?.reviewScore && (
            <div className="absolute bottom-2 right-2">
              <ScoreBadge score={Number(article.gameReview.reviewScore)} size="sm" />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-4 sm:p-4 lg:py-3 lg:px-5 min-w-0 justify-start">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-text-muted mb-1 font-medium">
            {article.author?.displayName && (
              <span className="text-[#00e5a0] font-bold mr-2">{article.author.displayName}</span>
            )}
            <span>{formatDate(article.publishedAt || article.createdAt)}</span>
            <span style={{ display: 'inline-block', marginLeft: '6px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: tc.textColor || tc.bg }}>
              {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
            </span>
          </div>

          {/* Title */}
          <div className="no-underline mt-1.5 sm:mt-2">
            <h2
              className="post-card-title font-bold text-gray-900 dark:text-white uppercase leading-[1.15] mb-2 sm:mb-3 text-[18px] sm:text-[20px] transition-colors group-hover:underline"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              {article.title}
            </h2>
          </div>
          
          {/* Excerpt */}
          {article.excerpt && (
            <div className="mb-[8px] mt-1 lg:mt-1.5">
              <p className="text-[16px] text-gray-600 dark:text-[#C4C4C4] leading-snug line-clamp-3">
                {article.excerpt}
              </p>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
