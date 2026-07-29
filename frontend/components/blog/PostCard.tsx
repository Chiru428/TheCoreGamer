'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, Clock, Gamepad2 } from 'lucide-react';
import { cn, formatDate, formatRelativeDate, readingTime, formatNumber } from '@/lib/utils';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import ScoreBadge from '@/components/review/ScoreBadge';
import ProfileLink from '@/components/ui/ProfileLink';
import { contentTypePath } from '@/lib/seo';
import type { Article } from '@/types';

type CardVariant = 'large' | 'medium' | 'small' | 'vertical';

interface PostCardProps {
  article: Article;
  variant?: CardVariant;
  className?: string;
  aspectVideo?: boolean;
  /** Whether to show the content-type badge. Default: true */
  showBadge?: boolean;
  index?: number;
  /** Show the full title without truncation and at a smaller size (tags page). */
  fullTitle?: boolean;
}

export default function PostCard({ article, variant = 'medium', className, aspectVideo, showBadge = true, index = 0, fullTitle = false }: PostCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(el);
          }
        });
      },
      { rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rt = readingTime(article.modGuide?.sections || article.content);
  const linkBase = `/${contentTypePath(article.contentType)}`;
  const href = `${linkBase}/${article.slug}`;
  const tc = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)', color: '#fff' };

  // FTC disclosure: must be clearly and conspicuously displayed, so this renders
  // regardless of `showBadge` and uses a distinct color from content-type badges.
  const sponsoredBadge = article.isSponsored ? (
    <span
      className="category-badge-bounce"
      style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#f59e0b' }}
    >
      Sponsored
    </span>
  ) : null;

  const liveBadge = article.isLiveBlog && !article.liveBlogEndedAt ? (
    <span className="live-badge"><span className="live-dot" />Live</span>
  ) : null;

  const hasViews = Number(article.viewCount ?? 0) > 0;
  const animationClass = isVisible ? 'is-visible' : '';
  const delayStyle = isVisible && index > 0 ? { transitionDelay: `${index * 80}ms` } : {};

  // -- LARGE: Featured wide card ------------------------------------
  if (variant === 'large') return (
    <article
      ref={cardRef}
      className={cn('scroll-animate-card article-card-hover group card-feat', animationClass, className)}
      style={delayStyle}
    >
      <Link href={href} className="relative w-full h-full overflow-hidden block min-h-[160px]">
        {article.featuredImageUrl ? (
          <Image src={article.featuredImageUrl} alt={article.title} fill className="absolute inset-0 w-full h-full object-cover card-thumbnail" sizes="(max-width: 768px) 100vw, 420px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-10 h-10" style={{ color: 'var(--muted3)' }} />
          </div>
        )}
        {article.contentType === 'REVIEW' && article.gameReview?.reviewScore && (
          <div className="absolute bottom-2 right-2">
            <ScoreBadge score={Number(article.gameReview.reviewScore)} size="sm" />
          </div>
        )}
      </Link>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
        {(showBadge || sponsoredBadge || liveBadge) && (
          <div className="flex items-center gap-1.5">
            {showBadge && (
              <span className="category-badge-bounce" style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: tc.textColor || tc.bg }}>
                {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
              </span>
            )}
            {sponsoredBadge}
            {liveBadge}
          </div>
        )}
        <Link href={href} className="group-hover:underline">
          <h3 className="line-clamp-2 text-[var(--text-strong)]" style={{ fontFamily: '"Rubik", sans-serif', fontSize: '20px', fontWeight: 700, lineHeight: 1.15 }}>{article.title}</h3>
        </Link>
        {article.excerpt && <p className="line-clamp-2" style={{ fontSize: '16px', color: 'var(--text)', lineHeight: 1.55 }}>{article.excerpt}</p>}
        <div className="flex items-center gap-2.5 mt-1 text-sm" style={{ color: 'var(--text)' }}>
          {article.author?.username ? (
            <ProfileLink username={article.author.username}>
              <span style={{ color: '#00e5a0', fontWeight: 600 }}>{article.author.displayName}</span>
            </ProfileLink>
          ) : (
            <span style={{ color: '#00e5a0', fontWeight: 600 }}>{article.author?.displayName}</span>
          )}<span>·</span>
          <span>{formatDate(article.publishedAt || article.createdAt)}</span><span>·</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{rt} min</span>
          {hasViews && (
            <span className="flex items-center gap-1 ml-auto" style={{ color: 'var(--green)', fontFamily: "'Rajdhani', sans-serif", fontSize: '18px', fontWeight: 700 }}>
              <Eye className="w-3.5 h-3.5" />{formatNumber(article.viewCount)}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  // -- SMALL: List horizontal card ----------------------------------
  if (variant === 'small') return (
    <article
      ref={cardRef}
      className={cn('scroll-animate-card article-card-hover group flex items-center py-3 sm:py-4 overflow-hidden', animationClass, className)}
      style={delayStyle}
    >
      <Link href={href} className="relative w-[120px] min-w-[120px] sm:w-[160px] sm:min-w-[160px] aspect-video overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
        {article.featuredImageUrl ? (
          <Image src={article.featuredImageUrl} alt={article.title} fill className="absolute inset-0 w-full h-full object-cover card-thumbnail" sizes="(max-width: 640px) 120px, 160px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-5 h-5" style={{ color: 'var(--muted3)' }} />
          </div>
        )}
        {article.contentType === 'REVIEW' && article.gameReview?.reviewScore && (
          <div className="absolute bottom-1 right-1">
            <ScoreBadge score={Number(article.gameReview.reviewScore)} size="sm" />
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0 pl-3 sm:pl-[14px]">
        <Link href={href} className="group-hover:underline">
          <p className="text-[var(--text-strong)] text-[13px] sm:text-[20px]" style={{ fontFamily: '"Rubik", sans-serif', fontWeight: 700, lineHeight: 1.3, marginBottom: '4px' }}>{article.title}</p>
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs" style={{ color: 'var(--text)' }}>
          {showBadge && (
            <span className="category-badge-bounce shrink-0" style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: tc.textColor || tc.bg }}>
              {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
            </span>
          )}
          {sponsoredBadge}
          {liveBadge}
          <div className="flex items-center gap-1.5 min-w-0">
            {article.author?.username ? (
              <ProfileLink username={article.author.username}>
                <span className="truncate" style={{ color: '#00e5a0', fontWeight: 600 }}>{article.author.displayName}</span>
              </ProfileLink>
            ) : (
              <span className="truncate" style={{ color: '#00e5a0', fontWeight: 600 }}>{article.author?.displayName}</span>
            )}
            <span className="shrink-0">·</span>
            <span className="shrink-0">{formatRelativeDate(article.publishedAt || article.createdAt)}</span>
          </div>
        </div>
      </div>
    </article>
  );

  // -- VERTICAL: Image on top, text below (Used in Related) ----------
  if (variant === 'vertical') return (
    <article
      ref={cardRef}
      className={cn('scroll-animate-card article-card-hover flex flex-col group h-full', animationClass, className)}
      style={delayStyle}
    >
      <Link href={href} className="relative aspect-video w-full overflow-hidden mb-3 block shadow-md border border-white/5">
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.title}
            fill
            className="object-cover object-center card-thumbnail"
            sizes="(max-width: 640px) 100vw, 320px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-elevated">
            <Gamepad2 className="w-8 h-8 opacity-20" />
          </div>
        )}
        {(showBadge || sponsoredBadge || liveBadge) && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
            {showBadge && (
              <span className="category-badge-bounce" style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: tc.textColor || tc.bg }}>
                {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
              </span>
            )}
            {sponsoredBadge}
            {liveBadge}
          </div>
        )}
        {article.contentType === 'REVIEW' && article.gameReview?.reviewScore && (
          <div className="absolute bottom-2 right-2 z-10">
            <ScoreBadge score={Number(article.gameReview.reviewScore)} size="sm" />
          </div>
        )}
      </Link>
      <div className="flex flex-col flex-1 px-1">
        <Link href={href} className="group-hover:underline">
          <h3 className="text-[20px] font-bold text-text-primary leading-snug line-clamp-2 mb-2" style={{ fontFamily: '"Rubik", sans-serif' }}>
            {article.title}
          </h3>
        </Link>
        <div className="mt-auto flex items-center gap-2 text-[11px] text-text-primary font-bold uppercase tracking-wider">
          {article.author?.username ? (
            <ProfileLink username={article.author.username}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{article.author.displayName}</span>
            </ProfileLink>
          ) : (
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{article.author?.displayName}</span>
          )}
          <span>·</span>
          <span>{formatRelativeDate(article.publishedAt || article.createdAt)}</span>
        </div>
      </div>
    </article>
  );

  // -- MEDIUM: Small horizontal card ----------------------------------
  return (
    <article
      ref={cardRef}
      className={cn('scroll-animate-card article-card-hover group flex items-start sm:items-stretch py-4 sm:py-0 sm:h-[130px] overflow-hidden', animationClass, className)}
      style={delayStyle}
    >
      <Link href={href} className="relative w-[140px] min-w-[140px] aspect-video sm:aspect-auto sm:h-full sm:w-[231px] sm:min-w-[231px] overflow-hidden flex-shrink-0">
        {article.featuredImageUrl ? (
          <Image src={article.featuredImageUrl} alt={article.title} fill className="absolute inset-0 w-full h-full object-cover card-thumbnail" sizes="(max-width: 640px) 140px, 280px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
            <Gamepad2 className="w-8 h-8" style={{ color: 'var(--muted3)' }} />
          </div>
        )}
        {article.contentType === 'REVIEW' && article.gameReview?.reviewScore && (
          <div className="absolute bottom-2 right-2 z-10">
            <ScoreBadge score={Number(article.gameReview.reviewScore)} size="sm" />
          </div>
        )}
      </Link>
      <div className="flex flex-col flex-1 pt-0 sm:pt-3 px-3.5 pb-3.5">
        {(showBadge || sponsoredBadge || liveBadge) && (
          <div className="mb-2 flex items-center gap-1.5 shrink-0">
            {showBadge && (
              <span className="category-badge-bounce" style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: tc.textColor || tc.bg }}>
                {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
              </span>
            )}
            {sponsoredBadge}
            {liveBadge}
          </div>
        )}
        <Link href={href} className="shrink-0 group-hover:underline">
          <h3
            className={cn(
              fullTitle ? '' : 'line-clamp-2',
              'text-[var(--text-strong)]'
            )}
            style={{
              fontFamily: '"Rubik", sans-serif',
              fontWeight: 700,
              lineHeight: 1.35,
              fontSize: fullTitle ? 'clamp(16px, 2.5vw, 18px)' : '20px',
            }}
          >
            {article.title}
          </h3>
        </Link>
        <div className="mt-auto flex items-center gap-1.5 text-xs sm:text-[14px] shrink-0" style={{ color: 'var(--text)' }}>
          {article.author?.username ? (
            <ProfileLink username={article.author.username}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{article.author.displayName}</span>
            </ProfileLink>
          ) : (
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{article.author?.displayName}</span>
          )}<span>·</span>
          <span>{formatRelativeDate(article.publishedAt || article.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}