import Link from 'next/link';
import Image from 'next/image';
import type { Article } from '@/types';
import { contentTypePath } from '@/lib/seo';
import { formatDate, getGuideTypeColor } from '@/lib/utils';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import ScoreBadge from '@/components/review/ScoreBadge';

export default function ArticleRow({ article, showTypeBadge = true, isHero = false }: { article: Article; showTypeBadge?: boolean; isHero?: boolean }) {
  const href = `/${contentTypePath(article.contentType)}/${article.slug}`;
  const tc   = CONTENT_TYPE_COLORS[article.contentType] || { bg: '#3b82f6', color: '#fff', textColor: '#3b82f6' };
  const badgeLabel =
    article.contentType === 'GUIDE' && article.guideType
      ? article.guideType
      : (CONTENT_TYPE_LABELS[article.contentType] || article.contentType);
  const badgeColor =
    article.contentType === 'GUIDE' && article.guideType
      ? getGuideTypeColor(article.guideType)
      : tc.textColor || tc.bg;

  return (
    <Link
      href={href}
      className={`group flex py-6 border-b border-[var(--border)] last:border-0 -mx-3 px-3 ${isHero ? 'flex-col gap-4' : 'items-center gap-4'}`}
    >
      {/* Thumbnail */}
      <div className={`relative shrink-0 overflow-hidden rounded-md bg-[var(--bg2)] ${isHero ? 'w-full aspect-[16/9]' : 'w-[140px] sm:w-[300px] aspect-[16/9]'}`}>
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.title}
            fill
            className="object-cover"
            sizes={isHero ? "(max-width: 845px) 100vw, 845px" : "(max-width: 640px) 140px, 300px"}
            quality={90}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🎮</div>
        )}
        {article.contentType === 'REVIEW' && article.gameReview?.reviewScore && (
          <div className="absolute bottom-1.5 right-1.5 z-10">
            <ScoreBadge score={Number(article.gameReview.reviewScore)} size="sm" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Meta rows */}
        <div className={`flex ${isHero ? 'items-center gap-2 flex-wrap' : 'flex-col md:flex-row md:items-center gap-1 md:gap-2 md:flex-wrap'} mb-1.5`}>
          {showTypeBadge && (
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-semibold tracking-[0.8px] uppercase"
                style={{ color: badgeColor }}
              >
                {badgeLabel}
              </span>
              <span className={`text-[var(--muted3)] text-[12px] ${isHero ? 'block' : 'hidden md:block'}`}>·</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {article.author?.displayName && (
              <span className="text-[14px] font-bold text-[var(--brand-green)] truncate max-w-[130px]">
                {article.author.displayName}
              </span>
            )}
            <span className="text-[14px] text-[var(--muted3)] shrink-0">
              {formatDate(article.publishedAt || article.createdAt)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          className={`post-card-title font-bold text-[var(--text)] leading-snug ${isHero ? 'text-[18px] md:text-[24px]' : 'text-[15px] md:text-[17px]'}`}
          style={{ fontFamily: "'Gibson', sans-serif" }}
        >
          <span className="hover-underline-animation">{article.title}</span>
        </h3>

        {/* Excerpt */}
        {article.excerpt && (
          <p className={`text-[var(--muted2)] mt-1 leading-relaxed ${isHero ? 'block text-[15px] md:text-[17px] line-clamp-3 md:line-clamp-2' : 'hidden text-[16px] md:line-clamp-3'}`}>
            {article.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}
