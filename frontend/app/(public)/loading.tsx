import Skeleton from '@/components/ui/Skeleton';

/* -- Shared pieces, mirroring the section helpers in page.tsx ------- */

function SectionHeadSkeleton({ width = 'w-40' }: { width?: string }) {
  return <Skeleton className={`h-7 ${width} mb-4`} />;
}

function SubHeadSkeleton() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span style={{ width: '3px', height: '18px', background: 'var(--accent)', borderRadius: '2px', display: 'inline-block' }} />
      <Skeleton className="h-5 w-32" />
    </div>
  );
}

function SeeMoreBtnSkeleton() {
  return <Skeleton className="mt-7 h-[33px] w-[160px] rounded-full" />;
}

/** Mirrors HomePostCard.tsx: image, meta line, 2-line title, optional excerpt. */
function HomePostCardSkeleton({ big = false, imageClassName = 'aspect-[16/9]' }: { big?: boolean; imageClassName?: string }) {
  return (
    <div className="flex flex-col h-full">
      <Skeleton className={`w-full rounded-none ${imageClassName}`} />
      <div className="flex-1 flex flex-col pt-2">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className={`w-full mb-2 ${big ? 'h-5' : 'h-4'}`} />
        <Skeleton className={`w-3/4 ${big ? 'h-5' : 'h-4'}`} />
        {big && (
          <div className="space-y-2 mt-3">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Mirrors the connector-line timeline used by "Latest" (Reviews/News) and "Popular This Week" (Hero). */
function TimelineListSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex items-stretch gap-3${i !== count - 1 ? ' mb-7' : ''}`}>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-3">
              <Skeleton className="h-2.5 w-[30px]" />
              <Skeleton className="h-2.5 w-12" />
            </div>
            <div className="flex gap-3 mt-2">
              <div className="shrink-0" style={{ width: '46px' }} />
              <Skeleton className="h-4 flex-1" />
            </div>
          </div>
          <Skeleton className="w-24 h-14 shrink-0 rounded-none" />
        </div>
      ))}
    </div>
  );
}

/** Deals / Core Picks / Strategy Guides / Mod Guides / Features / Opinions all share this shape now:
    SectionHead + 1 big card + 3 regular cards + See more. */
function StandardCardSectionSkeleton() {
  return (
    <>
      <SectionHeadSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        <HomePostCardSkeleton big imageClassName="aspect-[16/9] md:aspect-auto md:h-[164px]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <HomePostCardSkeleton key={i} imageClassName="aspect-[16/9] md:aspect-auto md:h-[164px]" />
        ))}
      </div>
      <SeeMoreBtnSkeleton />
    </>
  );
}

/** Reviews / News: header row with a red "Latest" label, 3 cards + a timeline column. */
function LatestFeedSectionSkeleton({ headWidth }: { headWidth?: string }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-4">
        <div className="md:col-span-3 flex items-center">
          <SectionHeadSkeleton width={headWidth} />
        </div>
        <div className="hidden md:flex items-center justify-center">
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        <HomePostCardSkeleton big />
        {Array.from({ length: 2 }).map((_, i) => (
          <HomePostCardSkeleton key={i} />
        ))}
        <TimelineListSkeleton count={8} />
      </div>
      <SeeMoreBtnSkeleton />
    </>
  );
}

/** PollWidget already shows its own internal loading state once mounted — this just reserves space. */
function PollSkeleton() {
  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0">
      <div className="grid md:grid-cols-4 gap-5">
        <div className="md:col-span-3 flex justify-center">
          <div className="w-full max-w-[800px] p-6 border-2 border-border rounded-xl space-y-4">
            <Skeleton className="h-5 w-2/3" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static placeholder markup — identical in the real page, so it's reused as-is rather than "skeletonized". */
function AdSlotPlaceholder() {
  return (
    <div className="w-full h-[250px] bg-[var(--bg2)]/50 border border-[var(--border)]/50 flex flex-col items-center justify-center my-6 animate-pulse">
      <div className="w-[100px] h-[12px] bg-gray-800/50 rounded mb-4" />
      <div className="w-full max-w-[728px] h-[90px] bg-bg-primary/50 border border-border/50 rounded" />
    </div>
  );
}

/** Mirrors HeroSection.tsx: desktop 2-col (hero image + 3 cards / Popular This Week list), mobile stacked. */
function HeroSkeleton() {
  return (
    <section className="relative overflow-hidden mt-4 md:mt-0" style={{ background: 'var(--bg)' }}>
      {/* Desktop */}
      <div className="hidden md:grid w-full max-w-[1280px] mx-auto px-4 lg:px-0 pt-8" style={{ gridTemplateColumns: '1fr 300px', gap: '30px' }}>
        <div className="flex flex-col gap-5">
          <Skeleton className="w-full rounded-none" style={{ aspectRatio: '16/9' }} />
          <div className="flex gap-5 justify-between">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ width: '293px' }} className="shrink-0 flex flex-col gap-2">
                <Skeleton className="w-full aspect-[16/9] rounded-none" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-4 w-40 mb-6" />
          <TimelineListSkeleton count={9} />
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <Skeleton className="w-full rounded-none" style={{ aspectRatio: '16/9' }} />
        <div className="px-4 pt-5 grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-[90px] w-[140px] shrink-0 rounded-none" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pt-6 pb-2">
          <Skeleton className="h-4 w-40 mb-6" />
          <TimelineListSkeleton count={6} />
        </div>
      </div>
    </section>
  );
}

function GamesSectionSkeleton() {
  const row = (
    <div className="grid grid-cols-2 gap-5 md:flex md:gap-8 md:justify-between">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="md:w-[296px] md:shrink-0">
          <Skeleton className="aspect-[2/3] w-full rounded-none" />
          <div className="pt-4">
            <Skeleton className="h-5 w-full mb-1.5" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <>
      <SectionHeadSkeleton width="w-28" />
      <div className="mb-8">
        <SubHeadSkeleton />
        {row}
      </div>
      <div>
        <SubHeadSkeleton />
        {row}
      </div>
      <SeeMoreBtnSkeleton />
    </>
  );
}

export default function HomepageLoading() {
  return (
    <div style={{ background: 'var(--bg)' }}>
      <HeroSkeleton />

      <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 pt-10 md:pt-14 pb-7">
        <section className="mb-10 md:mb-14 last:mb-0">
          <GamesSectionSkeleton />
        </section>

        <section className="mb-10 md:mb-14 last:mb-0">
          <LatestFeedSectionSkeleton headWidth="w-28" />
        </section>

        <AdSlotPlaceholder />

        <section className="mb-14 md:mb-20 last:mb-0">
          <LatestFeedSectionSkeleton headWidth="w-44" />
        </section>

        <section className="mb-14 md:mb-20 last:mb-0">
          <PollSkeleton />
        </section>

        <section className="mb-10 md:mb-14 last:mb-0">
          <StandardCardSectionSkeleton />
        </section>

        <section className="mb-10 md:mb-14 last:mb-0">
          <StandardCardSectionSkeleton />
        </section>

        <section className="mb-10 md:mb-14 last:mb-0">
          <StandardCardSectionSkeleton />
        </section>

        <section className="mb-10 md:mb-14 last:mb-0">
          <StandardCardSectionSkeleton />
        </section>

        <section className="mb-14 md:mb-20 last:mb-0">
          <PollSkeleton />
        </section>

        <section className="mb-10 md:mb-14 last:mb-0">
          <StandardCardSectionSkeleton />
        </section>

        <section className="mb-10 md:mb-14 last:mb-0">
          <StandardCardSectionSkeleton />
        </section>
      </div>
    </div>
  );
}
