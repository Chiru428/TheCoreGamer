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
                <Image quality={100}
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
                  className="post-card-title hero-main-title"
                  style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', fontWeight: 700, lineHeight: 1.2, color: '#ffffff', fontFamily: "'Gibson', sans-serif" }}
                >
                  <span className="hover-underline-animation">{current.title}</span>
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
                    titleClassName="!text-[18px] gibson-title"
                    titleStyle={{ fontFamily: "'Gibson', sans-serif" }}
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
            <div className="flex items-center w-full gap-4 mb-6 shrink-0">
              <div className="flex-1 h-[2px] bg-[#00866B] dark:bg-[#00e5a0]/40"></div>
              <div
                className="gibson-label whitespace-nowrap text-[#00866B] dark:text-[#00e5a0]"
                style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1.8px', textTransform: 'uppercase' }}
              >
                Top Stories
              </div>
              <div className="flex-1 h-[2px] bg-[#00866B] dark:bg-[#00e5a0]/40"></div>
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
                        <h2 className="flex-1 min-w-0 post-card-title popular-title-acumin transition-colors group-hover:text-accent !text-[16px]" style={{ fontWeight: 700, lineHeight: 1.35, color: 'var(--text-strong)', fontFamily: "'Gibson', sans-serif" }}>
                          <span className="hover-underline-animation">{article.title}</span>
                        </h2>
                      </div>
                    </div>
                    {/* Small cover image, vertically centered */}
                    <div className="relative w-[114px] h-[64px] shrink-0 overflow-hidden bg-[var(--deep,#0d0d1a)] self-center">
                      {article.featuredImageUrl ? (
                        <Image quality={100} src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="114px" />
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
              <Image quality={100}
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
                className="post-card-title hero-main-title"
                style={{ fontSize: 'clamp(20px, 4vw, 40px)', fontWeight: 700, lineHeight: 1.1, color: '#ffffff', fontFamily: "'Gibson', sans-serif" }}
              >
                <span className="hover-underline-animation">{current.title}</span>
              </h1>
            </div>
          </div>
        </Link>

        {/* Mobile: 1 full-width card, then 2 cards adjacent */}
        {cards.length > 0 && (
          <div className="px-4 pt-5 flex flex-col gap-5">
            {cards.length >= 1 && (
              <HomePostCard
                key={cards[0].id}
                article={cards[0]}
                titleClassName="!text-[18px] mb-1 gibson-title"
                titleStyle={{ fontFamily: "'Gibson', sans-serif" }}
                showExcerpt={false}
                showBackground={false}
                showBadge
                showImageBadge={false}
                badgeClassName="text-[12px]"
                showAuthor={false}
                truncateTitle={false}
                showViewArticle={false}
              />
            )}
            {cards.length >= 2 && (
              <div className="grid grid-cols-2 gap-4">
                {cards.slice(1).map((a) => (
                  <HomePostCard
                    key={a.id}
                    article={a}
                    titleClassName="!text-[16px] leading-snug mb-1 gibson-title"
                    titleStyle={{ fontFamily: "'Gibson', sans-serif" }}
                    metaClassName="!text-[14px] flex-row items-center gap-1.5 flex-wrap"
                    showExcerpt={false}
                    showBackground={false}
                    showBadge
                    showImageBadge={false}
                    badgeClassName="text-[12px]"
                    showAuthor={false}
                    truncateTitle={false}
                    showViewArticle={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile Popular This Week */}
        <div className="px-4 pt-6 pb-2">
          <div className="flex items-center w-full gap-4 mb-6">
            <div className="flex-1 h-[2px] bg-[#00866B] dark:bg-[#00e5a0]/40"></div>
            <div className="gibson-label whitespace-nowrap text-[#00866B] dark:text-[#00e5a0]" style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
              Top Stories
            </div>
            <div className="flex-1 h-[2px] bg-[#00866B] dark:bg-[#00e5a0]/40"></div>
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
                      <h2 className="flex-1 min-w-0 post-card-title popular-title-acumin transition-colors group-hover:text-accent !text-[16px]" style={{ fontWeight: 700, lineHeight: 1.35, color: 'var(--text-strong)', fontFamily: "'Gibson', sans-serif" }}>
                        <span className="hover-underline-animation">{article.title}</span>
                      </h2>
                    </div>
                  </div>
                  {/* Small cover image, vertically centered */}
                  <div className="relative w-[130px] h-[73px] shrink-0 overflow-hidden bg-[var(--deep,#0d0d1a)] self-center">
                    {article.featuredImageUrl ? (
                      <Image quality={100} src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="130px" />
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