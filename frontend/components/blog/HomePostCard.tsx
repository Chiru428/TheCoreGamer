'use client';

import Link from 'next/link';
import TripleChevron from '@/components/ui/TripleChevron';
import Image from 'next/image';
import { formatDate, getGuideTypeColor } from '@/lib/utils';
import { contentTypePath } from '@/lib/seo';
import type { Article } from '@/types';
import ScoreBadge from '@/components/review/ScoreBadge';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';

interface HomePostCardProps {
  article: Article;
  isCompact?: boolean;
  showBadge?: boolean;
  /** Controls the badge overlaid on the image. Defaults to showBadge. Set false to hide image badge while keeping the date-row label. */
  showImageBadge?: boolean;
  badgeClassName?: string;
  titleClassName?: string;
  mobileHorizontal?: boolean;
  showExcerptOnMobile?: boolean;
  showExcerpt?: boolean;
  contentClassName?: string;
  showBackground?: boolean;
  imageClassName?: string;
  showAuthor?: boolean;
  titleStyle?: React.CSSProperties;
  truncateTitle?: boolean;
  showViewArticle?: boolean;
  noTopLeftRadius?: boolean;
  noBorderRadius?: boolean;
  forceDarkTheme?: boolean;
}

export default function HomePostCard({ article, isCompact, showBadge = false, showImageBadge, badgeClassName, titleClassName, titleStyle, mobileHorizontal = false, showExcerptOnMobile = false, showExcerpt = true, contentClassName, showBackground = false, imageClassName, showAuthor = true, truncateTitle = true, showViewArticle = true, noTopLeftRadius = false, noBorderRadius = false, forceDarkTheme = false }: HomePostCardProps) {
  const imageBadge = showImageBadge ?? showBadge;
  const tc = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)', color: '#fff' };

  const href = `/${contentTypePath(article.contentType)}/${article.slug}`;

  return (
    <Link 
      href={href}
      className={`group flex ${mobileHorizontal ? 'flex-row sm:flex-col items-center sm:items-stretch sm:h-full gap-3 sm:gap-0' : 'flex-col h-full'} ${showBackground ? 'bg-white dark:bg-[#333333]' : 'bg-transparent'} relative overflow-hidden`}
    >
      {/* Top Image Area */}
      <div className={`block ${mobileHorizontal ? 'h-[90px] w-auto sm:h-auto sm:w-full my-auto sm:my-0' : 'w-full'} ${imageClassName || 'aspect-[16/9]'} relative overflow-hidden bg-[var(--deep,#0d0d1a)] shrink-0`} style={{ flexBasis: mobileHorizontal ? 'auto' : undefined }}>
        {article.featuredImageUrl ? (
          <Image 
            src={article.featuredImageUrl} 
            alt={article.title} 
            fill 
            className="object-cover transition-transform duration-1000 ease-out" 
            sizes={mobileHorizontal ? "(max-width: 640px) 140px, (max-width: 1024px) 50vw, 33vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
        )}
        
        {article.contentType === 'REVIEW' && article.gameReview?.reviewScore && (
          <div className="absolute bottom-2 right-2 z-10">
            <ScoreBadge score={Number(article.gameReview.reviewScore)} size="sm" />
          </div>
        )}

        {imageBadge && (
          article.contentType === 'GUIDE' && article.guideType ? (
              <span
                className="absolute bottom-2 left-2 z-10 sm:hidden"
                style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: getGuideTypeColor(article.guideType), color: '#fff' }}
              >
                {article.guideType}
              </span>
            ) : (
              <span
                className="absolute bottom-2 left-2 z-10 sm:hidden"
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: tc.bg,
                  color: tc.color,
                }}
              >
                {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
              </span>
            )
        )}
      </div>

      {/* Content Area */}
      <div className={`flex-1 flex flex-col justify-center ${!showBackground ? (mobileHorizontal ? 'p-0' : 'p-0 pt-2') : mobileHorizontal ? 'p-3 sm:p-5' : (isCompact ? 'p-3' : 'p-5 sm:p-6')} ${contentClassName || ''}`}>
        {/* Meta info */}
        <div className={`flex items-center gap-1.5 text-sm ${forceDarkTheme ? 'text-gray-300' : 'text-text-muted'} font-medium ${mobileHorizontal ? 'mb-0.5' : (isCompact ? 'mb-1' : 'mb-2')}`}>
          {showAuthor && !isCompact && article.author?.displayName && (
            <>
              <span className="text-[#00e5a0] font-bold mr-2">{article.author.displayName}</span>
            </>
          )}
          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
          {showBadge && (
            article.contentType === 'GUIDE' && article.guideType ? (
              <span className={`${mobileHorizontal ? 'hidden sm:inline-block' : 'inline-block'} ${badgeClassName ?? (isCompact ? 'text-[10px] sm:text-[12px]' : 'text-[13px]')}`} style={{ marginLeft: '6px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: getGuideTypeColor(article.guideType) }}>
                {article.guideType}
              </span>
            ) : (
              <span className={`${mobileHorizontal ? 'hidden sm:inline-block' : 'inline-block'} ${badgeClassName ?? (isCompact ? 'text-[10px] sm:text-[12px]' : 'text-[13px]')}`} style={{ marginLeft: '6px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: tc.textColor || tc.bg }}>
                {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
              </span>
            )
          )}
        </div>

        {/* Title */}
        <div className={`no-underline ${mobileHorizontal ? 'mt-0.5 sm:mt-1.5' : 'mt-1 sm:mt-1.5'}${!showBackground && showExcerpt ? ' mb-3' : ''}`}>
          <h3
            className={`post-card-title font-bold ${forceDarkTheme ? 'text-white' : 'text-gray-900 dark:text-white'} leading-snug transition-colors group-hover:underline ${truncateTitle ? 'line-clamp-2 ' : ''}${titleClassName ? titleClassName : (mobileHorizontal ? 'mb-1 sm:mb-2 text-[15px] sm:text-[18px] lg:text-[20px]' : 'mb-2 text-[18px] lg:text-[20px]')}`}
            style={titleStyle ?? { fontFamily: "'Gibson', sans-serif" }}
          >
            {article.title}
          </h3>
        </div>

        {/* Excerpt */}
        {showExcerpt && !isCompact && article.excerpt && (
          <div className={showExcerptOnMobile ? "block" : "hidden sm:block"}>
            <p 
              className={`leading-normal line-clamp-3 mb-[20px] ${forceDarkTheme ? 'text-[#C4C4C4]' : 'text-gray-600 dark:text-[#C4C4C4]'}`}
              style={{ fontSize: '16px' }}
            >
              {article.excerpt}
            </p>
          </div>
        )}

        {/* View Article Link */}
        {showViewArticle && (
          <div 
            className="mt-auto inline-flex items-center gap-1 font-bold capitalize tracking-wide text-[13px] lg:text-[14px] text-gray-900 dark:text-white"
          >
            View Article <TripleChevron className="w-4 h-4 lg:w-5 lg:h-5 transition-transform duration-1000 ease-out group-hover:translate-x-1.5" />
          </div>
        )}
      </div>
    </Link>
  );
}
