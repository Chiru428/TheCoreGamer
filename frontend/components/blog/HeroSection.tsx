'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Gamepad2 } from 'lucide-react';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';
import { getGuideTypeColor } from '@/lib/utils';
import type { Article } from '@/types';
import HomePostCard from '@/components/blog/HomePostCard';

export default function HeroSection({
  articles: initialArticles,
  popularArticles = [],
}: {
  articles: Article[];
  popularArticles?: Article[];
}) {
  if (!initialArticles || !initialArticles.length) return null;

  const current = initialArticles[0];

  const getArticleLink = (contentType: string, slug: string) => {
    return `/${contentTypePath(contentType)}/${slug}`;
  };

  const linkBase = `/${contentTypePath(current.contentType)}`;

  const formatShortDate = (dateString?: string | null) => {
    if (!dateString) return '';
    return new Date(dateString)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      .toUpperCase();
  };

  const sideItems = (popularArticles.length > 0 ? popularArticles : initialArticles).slice(0, 9);
  // 3 cards below the hero: next 3 from the hero articles array (already featured-first + latest fallback)
  const cards = initialArticles.slice(1, 4);

  return (
    <section className="relative overflow-hidden mt-4 md:mt-0">

      {/* ── ELDEN RING BLURRED BACKDROP ───────────────────────────────────── */}
      {/* Blurred image */}
      <div
        aria-hidden="true"
        className="hero-backdrop-img absolute inset-0 w-full h-full pointer-events-none"
        style={{
          backgroundImage: `url('/images/hero-backdrop.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          filter: 'blur(32px) saturate(1.25)',
          transform: 'scale(1.12)',
        }}
      />
      {/* Dark overlay — lighter in centre so the hero image pops */}
      <div
        aria-hidden="true"
        className="hero-backdrop-overlay absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(5,4,2,0.88) 0%, rgba(8,6,2,0.72) 30%, rgba(8,6,2,0.70) 65%, rgba(5,4,2,0.93) 100%)',
        }}
      />
      {/* Bottom accent line — green→amber matching Elden Ring gold */}
      <div
        aria-hidden="true"
        className="hero-backdrop-line absolute bottom-0 left-0 w-full h-[2px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,229,160,0.6) 30%, rgba(195,160,60,0.6) 70%, transparent 100%)' }}
      />



      {/* All existing content sits above the backdrop, z-index auto */}
      <div className="relative">


      {/* -- DESKTOP layout -- */}
      <div
        className="hidden lg:grid w-full max-w-[1280px] mx-auto px-4 lg:px-0 pt-8"
        style={{ gridTemplateColumns: '1fr 320px', gap: '10px' }}
      >
        {/* LEFT column: hero image + 3 cards — determines the grid row height */}
        <div className="flex flex-col gap-5">
          {/* Hero image */}
          <Link href={`${linkBase}/${current.slug}`} className="block group overflow-hidden relative" style={{ background: 'var(--deep)' }}>
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              {current.featuredImageUrl && (
                <Image
                  src={current.featuredImageUrl}
                  alt={current.title}
                  fill
                  className="object-cover object-center"
                  priority
                  sizes="(max-width: 768px) 100vw, 950px"
                />
              )}
              <div
                className="absolute bottom-10 left-0 w-full px-8 py-6 text-center"
                style={{ background: '#00000066' }}
              >
                <h1
                  className="post-card-title hero-main-title group-hover:underline"
                  style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', fontWeight: 800, lineHeight: 1.2, color: '#ffffff', fontFamily: "'acumin-pro', sans-serif" }}
                >
                  {current.title}
                </h1>
              </div>
            </div>
          </Link>

          {/* 3 cards — same column width as hero image */}
          {cards.length > 0 && (
            <div className="flex gap-5 justify-between items-stretch">
              {cards.map((a) => (
                <div key={a.id} style={{ width: '293px' }} className="shrink-0 h-full flex flex-col">
                  <HomePostCard
                    article={a}
                    titleClassName="!text-[18px] rubik-title"
                    titleStyle={{ fontFamily: "'Rubik', sans-serif" }}
                    showExcerpt={true}
                    contentClassName="flex-1 overflow-visible !justify-start"
                    showBackground={false}
                    showBadge
                    badgeClassName="text-[12px]"
                    showAuthor={false}
                    truncateTitle={false}
                    showViewArticle={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT column: grid cell stretches to match left column height (align-items:stretch default).
            Inner content is absolute inset-0 so it fills exactly that height, overflow-hidden clips the list. */}
        <div className="relative overflow-hidden h-[900px]">
          <div className="flex flex-col overflow-hidden h-full">
            <div
              className="rubik-label flex items-center justify-center gap-2 mb-6 shrink-0"
              style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#ef4444' }}
            >
              Popular This Week
            </div>

            {/* Fixed mb-7 gap between items (not flex-1 equal slots) so spacing stays constant regardless of title length */}
            <div className="flex flex-col overflow-y-auto no-scrollbar flex-1">
              {sideItems.map((article, idx) => {
                const tc = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)', color: '#fff' };
                const href = getArticleLink(article.contentType, article.slug);
                const isLast = idx === sideItems.length - 1;
                return (
                  <Link
                    key={article.id}
                    href={href}
                    className={`group relative flex items-stretch gap-2${!isLast ? ' mb-7' : ''}`}
                  >
                    <div className="flex-1 min-w-0 flex flex-col">
                      {/* Top row: date and badge share the same row */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="shrink-0" style={{ width: '36px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--muted2)', lineHeight: 1, whiteSpace: 'nowrap' }}>
                          {formatShortDate(article.publishedAt)}
                        </span>
                        {article.contentType === 'GUIDE' && article.guideType ? (
                          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: getGuideTypeColor(article.guideType), lineHeight: 1 }}>
                            {article.guideType}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: tc.textColor || tc.bg, lineHeight: 1 }}>
                            {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
                          </span>
                        )}
                      </div>
                      {/* Bottom row: connector line under the date column, title under the badge column. Line extends past this row's own height, through the mb-7 gap, to meet the next item's date row */}
                      <div className="flex gap-2 mt-1.5 pb-1 flex-1">
                        <div className="shrink-0 relative" style={{ width: '36px' }}>
                          {!isLast && (
                            <div className="absolute top-0 -bottom-6 w-[2px] bg-[var(--muted3)] -translate-x-1/2" style={{ left: '50%' }} />
                          )}
                        </div>
                        <h2 className="flex-1 min-w-0 post-card-title popular-title-acumin transition-colors group-hover:text-accent group-hover:underline !text-[16px]" style={{ fontWeight: 700, lineHeight: 1.35, color: 'var(--text-strong)', fontFamily: "'Rubik', sans-serif" }}>
                          {article.title}
                        </h2>
                      </div>
                    </div>
                    {/* Small cover image, vertically centered */}
                    <div className="relative w-[114px] h-[64px] shrink-0 overflow-hidden bg-[var(--deep,#0d0d1a)] self-center">
                      {article.featuredImageUrl ? (
                        <Image src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="114px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="w-4 h-4 opacity-30" /></div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* -- MOBILE layout -- */}
      <div className="lg:hidden">
        <Link href={`${linkBase}/${current.slug}`} className="block group relative">
          {/* Image */}
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            {current.featuredImageUrl && (
              <Image
                src={current.featuredImageUrl}
                alt={current.title}
                fill
                className="object-cover object-center"
                priority
                sizes="(max-width: 1024px) 100vw, 1vw"
              />
            )}

            {/* Title block */}
            <div
              className="absolute bottom-0 left-0 w-full px-4 py-4 text-center"
              style={{ background: '#00000066' }}
            >
              <h1
                className="post-card-title hero-main-title group-hover:underline"
                style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 800, lineHeight: 1.2, color: '#ffffff', fontFamily: "'acumin-pro', sans-serif" }}
              >
                {current.title}
              </h1>
            </div>
          </div>
        </Link>

        {/* Mobile: 3 cards stacked */}
        {cards.length > 0 && (
          <div className="px-4 pt-5 grid grid-cols-1 gap-5">
            {cards.map((a) => (
              <HomePostCard
                key={a.id}
                article={a}
                titleClassName="!text-[15px] mb-1 rubik-title"
                titleStyle={{ fontFamily: "'Rubik', sans-serif" }}
                showExcerpt={false}
                showBackground={false}
                showBadge
                badgeClassName="text-[12px]"
                showAuthor={false}
                mobileHorizontal
                truncateTitle={false}
                showViewArticle={false}
              />
            ))}
          </div>
        )}

        {/* Mobile Popular This Week */}
        <div className="px-4 pt-6 pb-2">
          <div className="flex items-center justify-center gap-2 mb-6" style={{ fontSize: '16px', fontFamily: "'Rubik', sans-serif", fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#ef4444' }}>
            Popular This Week
          </div>
          <div className="flex flex-col">
            {sideItems.map((article, idx) => {
              const tc = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)', color: '#fff' };
              const isLast = idx === sideItems.length - 1;
              return (
                <Link
                  key={article.id}
                  href={getArticleLink(article.contentType, article.slug)}
                  className={`group relative flex items-stretch gap-3 active:opacity-70${!isLast ? ' mb-7' : ''}`}
                >
                  <div className="flex-1 min-w-0 flex flex-col">
                    {/* Top row: date and badge share the same row */}
                    <div className="flex items-center gap-3">
                      <span className="shrink-0" style={{ width: '46px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--muted2)', lineHeight: 1, whiteSpace: 'nowrap' }}>
                        {formatShortDate(article.publishedAt)}
                      </span>
                      {article.contentType === 'GUIDE' && article.guideType ? (
                        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: getGuideTypeColor(article.guideType), lineHeight: 1 }}>
                          {article.guideType}
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: tc.textColor || tc.bg, lineHeight: 1 }}>
                          {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
                        </span>
                      )}
                    </div>
                    {/* Bottom row: connector line under the date column, title under the badge column. Line is absolutely positioned so it can extend past this row's own height, through the mb-7 gap, to meet the next item's date row */}
                    <div className="flex gap-3 mt-1.5 flex-1">
                      <div className="shrink-0 relative" style={{ width: '46px' }}>
                        {!isLast && (
                          <div className="absolute top-0 -bottom-6 w-[2px] bg-[var(--muted3)] -translate-x-1/2" style={{ left: '50%' }} />
                        )}
                      </div>
                      <h2 className="flex-1 min-w-0 post-card-title popular-title-acumin transition-colors group-hover:text-accent group-hover:underline !text-[16px]" style={{ fontWeight: 700, lineHeight: 1.35, color: 'var(--text-strong)', fontFamily: "'Rubik', sans-serif" }}>
                        {article.title}
                      </h2>
                    </div>
                  </div>
                  {/* Small cover image, vertically centered */}
                  <div className="relative w-[130px] h-[73px] shrink-0 overflow-hidden bg-[var(--deep,#0d0d1a)] self-center">
                    {article.featuredImageUrl ? (
                      <Image src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="130px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="w-4 h-4 opacity-30" /></div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      </div> {/* end relative content wrapper */}
    </section>
  );
}