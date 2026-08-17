'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Gamepad2 } from 'lucide-react';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';
import { formatDate, getGuideTypeColor, cn } from '@/lib/utils';
import { getAlgoliaUserToken, sendAlgoliaEvent } from '@/lib/algolia';
import ScoreBadge from '@/components/review/ScoreBadge';

interface RecommendationHit {
  objectID: string;
  title: string;
  slug: string;
  contentType?: string;
  guideType?: string;
  featuredImageUrl?: string | null;
  coverImageUrl?: string | null;
  reviewScore?: number | null;
  editorialScore?: number | null;
  authorName?: string | null;
  publishedAtISO?: string | null;
  platforms?: string[];
}

interface AlgoliaRecommendationsProps {
  objectID: string;
  indexName?: string;
  model?: string;
  title?: string;
  max?: number;
  layout?: 'grid' | 'list' | 'scroll' | 'sidebar';
  /** Render a horizontal divider below the title, above the recommendations. */
  showDivider?: boolean;
  /** Merged into the outer <section> className (e.g. to override the default mt-12). */
  className?: string;
  /** Merged into the title <h3> className (e.g. to override the default text-xl). */
  titleClassName?: string;
  /** Disable the bounce-on-hover animation for content type badges. */
  staticBadges?: boolean;
  /** If true, render nothing while loading (suppress the shimmer skeleton). */
  hideSkeleton?: boolean;
}

export default function AlgoliaRecommendations({
  objectID,
  indexName = 'articles',
  model = 'related-products',
  title = 'Recommended',
  max = 6,
  layout = 'grid',
  showDivider = false,
  className,
  titleClassName,
  staticBadges = false,
  hideSkeleton = false,
}: AlgoliaRecommendationsProps) {
  const { data: session } = useSession();
  const [hits, setHits] = useState<RecommendationHit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    const sp = new URLSearchParams({ objectID, index: indexName, model, max: String(max) });
    fetch(`/api/search/recommend?${sp}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error('recommend request failed');
        setHits(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [objectID, indexName, model, max]);

  const handleClick = (hit: RecommendationHit, position: number) => {
    sendAlgoliaEvent({
      eventType: 'click',
      eventName: 'Recommendation Clicked',
      index: indexName,
      objectIDs: [hit.objectID],
      positions: [position + 1],
      userToken: getAlgoliaUserToken(session?.user?.id),
    });
  };

  const hrefFor = (hit: RecommendationHit): string =>
    indexName === 'games' ? `/games/${hit.slug}` : `/${contentTypePath(hit.contentType)}/${hit.slug}`;

  if (isLoading) {
    if (hideSkeleton) return null;
    return (
      <section className={cn(layout === 'sidebar' ? 'md:bg-[var(--bg2)] md:px-7 md:py-5 mt-12 md:mt-0' : 'mt-12', className)}>
        {layout !== 'sidebar' ? (
          <>
            <h3 className={cn('section-title-bar', showDivider ? 'mb-3' : 'mb-6', titleClassName)}>
              {title}
            </h3>
            {showDivider && <hr className="border-border mb-6" />}
          </>
        ) : (
          <>
            <h3 className={cn('section-title-bar flex md:hidden !text-[20px]', showDivider ? 'mb-3' : 'mb-6', titleClassName)} style={{ fontFamily: "'Gibson', sans-serif" }}>
              {title}
            </h3>
            <div className="hidden md:block pb-3 border-b-2 border-accent mb-0">
              <span className="font-gibson text-[28px] md:text-[28px] font-bold leading-[1.2] text-text-primary block">{title}</span>
            </div>
          </>
        )}
        <div className={
          layout === 'sidebar' ? 'flex flex-col m-0 p-0 list-none'
          : layout === 'list' ? 'space-y-3'
          : layout === 'scroll' ? 'flex gap-4 overflow-x-hidden hide-scrollbar'
          : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
        }>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn(
              layout === 'sidebar' ? 'shimmer h-16 my-4 border-b border-border last:border-b-0' : 'shimmer h-40 card-sm',
              layout === 'scroll' && 'w-[220px] shrink-0'
            )} />
          ))}
        </div>
      </section>
    );
  }

  if (hasError || hits.length === 0) return null;

  return (
    <section className={cn(layout === 'sidebar' ? 'md:bg-[var(--bg2)] md:px-7 md:py-5 mt-12 md:mt-0' : 'mt-12', className)}>
      {layout !== 'sidebar' ? (
        <>
          <h3 className={cn('section-title-bar', showDivider ? 'mb-3' : 'mb-6', titleClassName)}>
            {title}
          </h3>
          {showDivider && <hr className="border-border mb-6" />}
        </>
      ) : (
        <>
          <h3 className={cn('section-title-bar flex md:hidden !text-[20px]', showDivider ? 'mb-3' : 'mb-6', titleClassName)} style={{ fontFamily: "'Gibson', sans-serif" }}>
            {title}
          </h3>
          <div className="hidden md:block pb-3 border-b-2 border-accent mb-0">
            <span className="font-gibson text-[28px] md:text-[28px] font-bold leading-[1.2] text-text-primary block">{title}</span>
          </div>
        </>
      )}

      {layout === 'scroll' ? (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar">
          {hits.map((hit, i) => {
            const score = hit.editorialScore ?? hit.reviewScore;
            const image = hit.coverImageUrl ?? hit.featuredImageUrl;
            const tc = CONTENT_TYPE_COLORS[hit.contentType ?? ''] || { bg: 'var(--accent)', color: '#fff' };
            return (
              <Link
                key={hit.objectID}
                href={hrefFor(hit)}
                onClick={() => handleClick(hit, i)}
                className="card-sm flex flex-col group w-[220px] sm:w-[260px] shrink-0 snap-start"
              >
                <div className={cn('relative w-full overflow-hidden bg-bg-elevated', indexName === 'games' ? 'aspect-[3/4]' : 'aspect-video')}>
                  {image ? (
                    <Image quality={100} src={image} alt={hit.title} fill className="object-cover transition-transform duration-1000 ease-out" sizes="260px" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gamepad2 className="w-8 h-8 opacity-30" />
                    </div>
                  )}
                  {score != null && (
                    <div className="absolute bottom-2 right-2">
                      <ScoreBadge score={Number(score)} size="sm" />
                    </div>
                  )}
                </div>
                <div className="p-2.5 flex flex-col gap-1.5">
                  {indexName !== 'games' && hit.contentType && (
                    <span className={cn(!staticBadges && 'category-badge-bounce')} style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: (hit.contentType === 'GUIDE' && hit.guideType) ? getGuideTypeColor(hit.guideType) : (tc.textColor || tc.bg) }}>
                      {(hit.contentType === 'GUIDE' && hit.guideType) ? hit.guideType : (CONTENT_TYPE_LABELS[hit.contentType] || hit.contentType)}
                    </span>
                  )}
                  <p className="text-[16px] md:text-[18px] font-bold text-text-strong line-clamp-2" style={{ fontFamily: '"Gibson", sans-serif' }}>
                    {hit.title}
                  </p>
                  {indexName !== 'games' && hit.publishedAtISO && (
                    <span className="text-xs text-text-muted">{formatDate(hit.publishedAtISO)}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : layout === 'sidebar' ? (
        <ul className="grid grid-cols-2 md:flex md:flex-col gap-4 md:gap-0 m-0 p-0 list-none">
          {hits.map((hit, i) => {
            const image = hit.coverImageUrl ?? hit.featuredImageUrl;
            const tc = CONTENT_TYPE_COLORS[hit.contentType ?? ''] || { bg: 'var(--accent)', color: '#fff' };
            return (
              <li key={hit.objectID} className="md:border-b md:border-border md:last:border-b-0">
                {/* Desktop: Popular Layout */}
                <Link
                  href={hrefFor(hit)}
                  onClick={() => handleClick(hit, i)}
                  className="hidden md:flex group items-start gap-[10px] py-[14px] no-underline"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-gibson text-[16px] font-bold text-text-strong leading-[1.4] m-0">
                      <span className="hover-underline-animation">{hit.title}</span>
                    </p>
                    <div className="flex flex-col gap-1 mt-2">
                      {hit.authorName && (
                        <span className="text-[14px] font-bold text-[var(--brand-green)]">{hit.authorName}</span>
                      )}
                      <div className="flex flex-wrap items-center gap-3">
                        {hit.publishedAtISO && (
                          <span className="text-[14px] font-medium text-muted">{formatDate(hit.publishedAtISO)}</span>
                        )}
                        {hit.contentType && (
                          <span className={cn(!staticBadges && 'category-badge-bounce', 'text-[12px] font-bold tracking-[0.5px] uppercase')} style={{ color: (hit.contentType === 'GUIDE' && hit.guideType) ? getGuideTypeColor(hit.guideType) : (tc.textColor || tc.bg) }}>
                            {(hit.contentType === 'GUIDE' && hit.guideType) ? hit.guideType : (CONTENT_TYPE_LABELS[hit.contentType] || hit.contentType)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Mobile: Small Card Grid Layout */}
                <Link
                  href={hrefFor(hit)}
                  onClick={() => handleClick(hit, i)}
                  className="flex md:hidden flex-col gap-2 group mt-2 md:mt-0"
                >
                  <div className="relative w-full aspect-video overflow-hidden bg-bg-elevated rounded-none">
                    {image ? (
                      <Image quality={100} src={image} alt={hit.title} fill className="object-cover" sizes="50vw" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gamepad2 className="w-8 h-8 opacity-30" />
                      </div>
                    )}
                    {hit.contentType && (
                      <div className="absolute bottom-2 left-2">
                        <span className={cn(!staticBadges && 'category-badge-bounce')} style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '2px 4px', borderRadius: '2px', backgroundColor: (hit.contentType === 'GUIDE' && hit.guideType) ? getGuideTypeColor(hit.guideType) : tc.bg, color: tc.textColor || '#fff' }}>
                          {(hit.contentType === 'GUIDE' && hit.guideType) ? hit.guideType : (CONTENT_TYPE_LABELS[hit.contentType] || hit.contentType)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-0 mt-1.5">
                    {hit.authorName && (
                      <span className="text-[14px] font-bold text-[var(--brand-green)]">{hit.authorName}</span>
                    )}
                    {hit.publishedAtISO && (
                      <span className="text-[14px] font-medium text-muted">{formatDate(hit.publishedAtISO)}</span>
                    )}
                    <p className="text-[16px] font-bold text-text-strong leading-[1.3] mt-0.5" style={{ fontFamily: '"Gibson", sans-serif' }}>
                      <span className="hover-underline-animation">{hit.title}</span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : layout === 'list' ? (
        <div className="space-y-3">
          {hits.map((hit, i) => {
            const score = hit.editorialScore ?? hit.reviewScore;
            const image = hit.coverImageUrl ?? hit.featuredImageUrl;
            return (
              <Link
                key={hit.objectID}
                href={hrefFor(hit)}
                onClick={() => handleClick(hit, i)}
                className="flex items-center gap-3 card-sm p-2 group"
              >
                <div className="relative w-16 h-12 shrink-0 overflow-hidden rounded-none bg-bg-elevated">
                  {image ? (
                    <Image quality={100} src={image} alt={hit.title} fill className="object-cover" sizes="64px" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 opacity-30" />
                    </div>
                  )}
                </div>
                <p className="flex-1 min-w-0 text-sm font-bold text-text-strong line-clamp-2" style={{ fontFamily: '"Gibson", sans-serif' }}>
                  <span className="hover-underline-animation">{hit.title}</span>
                </p>
                {score != null && <ScoreBadge score={Number(score)} size="sm" />}
              </Link>
            );
          })}
        </div>
      ) : indexName === 'games' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {hits.map((hit, i) => (
            <Link
              key={hit.objectID}
              href={hrefFor(hit)}
              onClick={() => handleClick(hit, i)}
              className="card-sm flex flex-col group"
            >
              <div className="relative w-full aspect-[3/4] overflow-hidden bg-bg-elevated">
                {hit.coverImageUrl ? (
                  <Image quality={100} src={hit.coverImageUrl} alt={hit.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 className="w-8 h-8 opacity-30" />
                  </div>
                )}
                {hit.editorialScore != null && (
                  <div className="absolute bottom-2 right-2">
                    <ScoreBadge score={Number(hit.editorialScore)} size="sm" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-bold text-text-strong line-clamp-2 group-hover:text-accent transition-colors" style={{ fontFamily: '"Gibson", sans-serif' }}>
                  <span className="hover-underline-animation">{hit.title}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hits.map((hit, i) => {
            const tc = CONTENT_TYPE_COLORS[hit.contentType ?? ''] || { bg: 'var(--accent)', color: '#fff' };
            return (
              <Link
                key={hit.objectID}
                href={hrefFor(hit)}
                onClick={() => handleClick(hit, i)}
                className="card-sm flex flex-col group"
              >
                <div className="relative w-full aspect-video overflow-hidden bg-bg-elevated">
                  {hit.featuredImageUrl ? (
                    <Image quality={100} src={hit.featuredImageUrl} alt={hit.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gamepad2 className="w-8 h-8 opacity-30" />
                    </div>
                  )}
                  {hit.reviewScore != null && (
                    <div className="absolute bottom-2 right-2">
                      <ScoreBadge score={Number(hit.reviewScore)} size="sm" />
                    </div>
                  )}
                </div>
                <div className="p-2.5 flex flex-col gap-1.5">
                  {hit.contentType && (
                    <span className={cn(!staticBadges && 'category-badge-bounce')} style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: (hit.contentType === 'GUIDE' && hit.guideType) ? getGuideTypeColor(hit.guideType) : (tc.textColor || tc.bg) }}>
                      {(hit.contentType === 'GUIDE' && hit.guideType) ? hit.guideType : (CONTENT_TYPE_LABELS[hit.contentType] || hit.contentType)}
                    </span>
                  )}
                  <p className="text-sm font-bold text-text-strong line-clamp-2 group-hover:text-accent transition-colors" style={{ fontFamily: '"Gibson", sans-serif' }}>
                    <span className="hover-underline-animation">{hit.title}</span>
                  </p>
                  {hit.publishedAtISO && (
                    <span className="text-xs text-text-muted">{formatDate(hit.publishedAtISO)}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
