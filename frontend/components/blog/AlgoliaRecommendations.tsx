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
      <section className={cn('mt-12', className)}>
        <h3
        className={cn('section-title-bar', showDivider ? 'mb-3' : 'mb-6', titleClassName)}
        style={layout === 'sidebar' ? { fontFamily: "'Gibson', sans-serif" } : undefined}
      >
        {title}
      </h3>
        {showDivider && <hr className="border-border mb-6" />}
        <div className={
          layout === 'sidebar' ? 'divide-y divide-border'
          : layout === 'list' ? 'space-y-3'
          : layout === 'scroll' ? 'flex gap-4 overflow-x-hidden hide-scrollbar'
          : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
        }>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn(
              layout === 'sidebar' ? 'shimmer h-16 my-2' : 'shimmer h-40 card-sm',
              layout === 'scroll' && 'w-[220px] shrink-0'
            )} />
          ))}
        </div>
      </section>
    );
  }

  if (hasError || hits.length === 0) return null;

  return (
    <section className={cn('mt-12', className)}>
      <h3
        className={cn('section-title-bar', showDivider ? 'mb-3' : 'mb-6', titleClassName)}
        style={layout === 'sidebar' ? { fontFamily: "'Gibson', sans-serif" } : undefined}
      >
        {title}
      </h3>
      {showDivider && <hr className="border-border mb-6" />}

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
                    <Image src={image} alt={hit.title} fill className="object-cover transition-transform duration-1000 ease-out" sizes="260px" unoptimized />
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
        <div className="divide-y divide-border">
          {hits.map((hit, i) => {
            const image = hit.coverImageUrl ?? hit.featuredImageUrl;
            const tc = CONTENT_TYPE_COLORS[hit.contentType ?? ''] || { bg: 'var(--accent)', color: '#fff' };
            return (
              <Link
                key={hit.objectID}
                href={hrefFor(hit)}
                onClick={() => handleClick(hit, i)}
                className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0 group"
              >
                <div className="flex-1 min-w-0">
                  {hit.contentType && (
                    <span className={cn(!staticBadges && 'category-badge-bounce', 'mb-1')} style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: (hit.contentType === 'GUIDE' && hit.guideType) ? getGuideTypeColor(hit.guideType) : (tc.textColor || tc.bg) }}>
                      {(hit.contentType === 'GUIDE' && hit.guideType) ? hit.guideType : (CONTENT_TYPE_LABELS[hit.contentType] || hit.contentType)}
                    </span>
                  )}
                  <p className="text-[16px] font-bold text-text-strong group-hover:underline" style={{ fontFamily: '"Gibson", sans-serif' }}>
                    {hit.title}
                  </p>
                  {(hit.authorName || hit.publishedAtISO) && (
                    <span className="flex items-center gap-4 text-xs text-text-muted mt-1.5">
                      {hit.authorName && <span className="text-[#00e5a0] font-bold">{hit.authorName}</span>}
                      {hit.publishedAtISO && formatDate(hit.publishedAtISO)}
                    </span>
                  )}
                </div>
                <div className="relative h-20 aspect-video shrink-0 overflow-hidden rounded-none bg-bg-elevated">
                  {image ? (
                    <Image src={image} alt={hit.title} fill className="object-cover" sizes="144px" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 opacity-30" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
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
                    <Image src={image} alt={hit.title} fill className="object-cover" sizes="64px" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 opacity-30" />
                    </div>
                  )}
                </div>
                <p className="flex-1 min-w-0 text-sm font-bold text-text-strong line-clamp-2 group-hover:underline" style={{ fontFamily: '"Gibson", sans-serif' }}>
                  {hit.title}
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
                  <Image src={hit.coverImageUrl} alt={hit.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" unoptimized />
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
                <p className="text-sm font-bold text-text-strong line-clamp-2 group-hover:text-accent group-hover:underline transition-colors" style={{ fontFamily: '"Gibson", sans-serif' }}>
                  {hit.title}
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
                    <Image src={hit.featuredImageUrl} alt={hit.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" unoptimized />
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
                  <p className="text-sm font-bold text-text-strong line-clamp-2 group-hover:text-accent group-hover:underline transition-colors" style={{ fontFamily: '"Gibson", sans-serif' }}>
                    {hit.title}
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
