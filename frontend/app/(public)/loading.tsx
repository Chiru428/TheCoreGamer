import React from 'react';

function SectionHeadSkeleton({ className = "mb-4" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <div className="w-[60px] h-[6px] bg-border mb-2 rounded" />
      <div className="shimmer h-[30px] w-[180px] rounded" />
    </div>
  );
}

function SeeMoreBtnSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`mt-7 flex justify-center sm:justify-start ${className}`}>
      <div className="shimmer h-[33px] w-full sm:w-[160px] rounded-full" />
    </div>
  );
}

function AdSlotSkeleton({ id }: { id: string }) {
  return (
    <div className="w-full flex items-center justify-center py-5 bg-[var(--bg2)] border-y border-[var(--border)] relative overflow-hidden">
      <div className="w-full max-w-[970px] min-h-[250px] flex flex-col items-center justify-center">
         <div className="w-[100px] h-[12px] bg-gray-800/30 rounded mb-4" />
         <div className="w-full max-w-[728px] h-[90px] shimmer rounded border border-border/50" />
      </div>
    </div>
  );
}

/* -- Exact PostCard shape ----------------------------- */
function PostCardSkeleton({ big = false, compact = false, horizontalMobile = false }) {
  return (
    <div className={`flex h-full ${horizontalMobile ? 'flex-row sm:flex-col items-start gap-3 sm:gap-0' : 'flex-col'}`}>
      <div className={`${horizontalMobile ? 'w-[45%] sm:w-full' : 'w-full'} aspect-[16/9] shrink-0 shimmer`} />
      <div className={`flex-1 flex flex-col w-full ${horizontalMobile ? 'pt-0 sm:pt-4' : 'pt-4'}`}>
        <div className={`w-full mb-2.5 ${big ? 'h-6' : 'h-5'} shimmer rounded`} />
        <div className={`w-3/4 mb-4 ${big ? 'h-6' : 'h-5'} shimmer rounded`} />
        {big && (
          <div className="space-y-2.5 mt-2 hidden md:block">
            <div className="h-4 w-full shimmer rounded" />
            <div className="h-4 w-2/3 shimmer rounded" />
          </div>
        )}
      </div>
    </div>
  );
}

/* -- Exactly Hero Section ----------------------------- */
function HeroSkeleton() {
  return (
    <div className="w-full" style={{ background: 'var(--bg)' }}>
      {/* Desktop */}
      <div className="hidden md:grid w-full max-w-[1280px] mx-auto px-4 lg:px-0 pt-8" style={{ gridTemplateColumns: '1fr 300px', gap: '30px' }}>
        
        {/* Left Col (Main + 3 sub) */}
        <div className="flex flex-col gap-5">
          <div className="w-full aspect-[16/9] shimmer rounded-sm" />
          <div className="flex gap-5 justify-between h-[280px]">
             {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-[293px] shrink-0 h-full">
                  <PostCardSkeleton />
                </div>
             ))}
          </div>
        </div>

        {/* Right Col (Top Stories) */}
        <div className="relative h-[900px]">
          <div className="flex items-center w-full gap-4 mb-6">
            <div className="flex-1 h-[2px] bg-[var(--border)]"></div>
            <div className="h-[20px] w-[140px] shimmer rounded"></div>
            <div className="flex-1 h-[2px] bg-[var(--border)]"></div>
          </div>
          <div className="flex flex-col flex-1">
             {Array.from({ length: 8 }).map((_, i) => (
               <div key={i} className="flex items-center gap-4 mb-7">
                 <div className="flex-1 flex flex-col gap-2">
                   <div className="h-4 w-full shimmer rounded" />
                   <div className="h-4 w-3/4 shimmer rounded" />
                 </div>
                 <div className="w-[114px] h-[64px] shrink-0 shimmer rounded-sm" />
               </div>
             ))}
          </div>
        </div>

      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="w-full aspect-[16/9] shimmer rounded-none" />
        <div className="px-4 pt-5 flex flex-col gap-5">
          <PostCardSkeleton big />
          <div className="grid grid-cols-2 gap-4">
             <PostCardSkeleton />
             <PostCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Exactly NewsWithTrending ------------------------ */
function NewsWithTrendingSkeleton({ sidebarTitle }: { sidebarTitle: string }) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
      {/* Left Col */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
           <PostCardSkeleton big />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
           {Array.from({ length: 4 }).map((_, i) => (
             <PostCardSkeleton key={i} horizontalMobile />
           ))}
        </div>
      </div>
      
      {/* Right Col */}
      <aside className="w-full lg:w-[320px] xl:w-[360px] shrink-0">
        <div className="flex items-center gap-3 mb-6">
           <div className="h-[30px] w-[160px] shimmer rounded" />
           <div className="flex-1 h-[2px] bg-border" />
        </div>
        <div className="flex flex-col">
           {Array.from({ length: 6 }).map((_, i) => (
             <div key={i} className="flex items-start gap-3 py-4 border-b border-border last:border-0">
               <div className="w-8 font-bold text-2xl text-border shimmer-text">{(i+1).toString().padStart(2, '0')}</div>
               <div className="flex-1 flex flex-col gap-2 pt-1">
                 <div className="h-[18px] w-full shimmer rounded" />
                 <div className="h-[18px] w-4/5 shimmer rounded" />
               </div>
             </div>
           ))}
        </div>
      </aside>
    </div>
  );
}

/* -- Exactly ReviewsGrid ----------------------------- */
function ReviewsGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
       {Array.from({ length: count }).map((_, i) => (
         <PostCardSkeleton key={i} big={i===0} horizontalMobile={i>0} />
       ))}
    </div>
  );
}

/* -- Exactly Games Overlay Section ------------------- */
function GamesOverlaySkeleton() {
  return (
    <section className="relative w-[100vw] left-[50%] -translate-x-1/2 mb-10 md:mb-14 py-5 overflow-hidden border-y border-white/10 shadow-2xl">
      <div className="absolute inset-0 w-full h-full bg-[var(--bg2)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-0">
         <SectionHeadSkeleton className="mb-6" />
         <div className="mb-6">
           {/* Tab Bar */}
           <div className="flex gap-6 mb-8 overflow-hidden">
             {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 w-[120px] shimmer rounded-sm" />
             ))}
           </div>
           {/* 4 Cards */}
           <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-6">
             {Array.from({ length: 4 }).map((_, i) => (
               <div key={i} className="block overflow-hidden">
                 <div className="w-full aspect-[2/3] shimmer rounded border border-border" />
                 <div className="pt-4 flex flex-col gap-2">
                   <div className="h-[20px] w-full shimmer rounded" />
                   <div className="h-[16px] w-3/4 shimmer rounded" />
                 </div>
               </div>
             ))}
           </div>
         </div>
         <SeeMoreBtnSkeleton />
      </div>
    </section>
  );
}

/* -- Exactly Discovery Tabs Section ------------------- */
function DiscoveryTabsSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 mb-0">
      
      {/* Left Col (845px max) */}
      <div className="w-full" style={{ maxWidth: '845px' }}>
         <SectionHeadSkeleton />
         <div className="w-full overflow-hidden mb-5 border-b border-border">
           <div className="flex">
             {Array.from({ length: 5 }).map((_, i) => (
               <div key={i} className="mr-7 pb-2.5 h-4 w-[80px] shimmer rounded-sm" />
             ))}
           </div>
         </div>
         <div className="flex flex-col mt-4">
           <div className="mb-4">
             <PostCardSkeleton big />
           </div>
           <div className="grid grid-cols-2 gap-4 lg:gap-5 mt-4">
             {Array.from({ length: 6 }).map((_, i) => (
               <PostCardSkeleton key={i} horizontalMobile />
             ))}
           </div>
         </div>
      </div>

      {/* Right Col (Poll) */}
      <div className="flex-1 w-full min-w-0 mt-2 lg:mt-[145px]">
         <div className="w-full h-[350px] shimmer rounded-xl border border-border" />
      </div>
      
    </div>
  );
}


export default function HomepageLoading() {
  return (
    <div className="home-page-root" style={{ background: 'var(--bg)' }}>
      {/* TOP AD */}
      <div className="hidden sm:block">
        <AdSlotSkeleton id="ADS-01" />
      </div>
      
      <HeroSkeleton />
      
      {/* MOBILE AD */}
      <div className="sm:hidden block">
        <AdSlotSkeleton id="ADS-01m" />
      </div>

      <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 pt-10 md:pt-14 pb-0">
        
        {/* LATEST NEWS */}
        <section className="mb-14 md:mb-20">
           <SectionHeadSkeleton />
           <NewsWithTrendingSkeleton sidebarTitle="Trending News" />
           <SeeMoreBtnSkeleton />
        </section>

        {/* REVIEWS */}
        <section className="mb-10 md:mb-14">
           <SectionHeadSkeleton />
           <ReviewsGridSkeleton count={6} />
           <SeeMoreBtnSkeleton />
        </section>

        {/* AD SLOT 02 */}
        <div className="mb-10 md:mb-14 flex justify-center w-full">
           <AdSlotSkeleton id="ADS-02" />
        </div>

        {/* POLL */}
        <section className="mb-14 md:mb-20 flex justify-center w-full">
           <div className="w-full max-w-[800px] h-[350px] shimmer rounded-xl border border-border" />
        </section>

        {/* GAMES */}
        <GamesOverlaySkeleton />

        {/* DEALS */}
        <section className="mb-10 md:mb-14">
           <SectionHeadSkeleton />
           <ReviewsGridSkeleton count={6} />
           <SeeMoreBtnSkeleton />
        </section>

        {/* GUIDES */}
        <section className="mb-14 md:mb-20">
           <SectionHeadSkeleton />
           <NewsWithTrendingSkeleton sidebarTitle="Popular Guides" />
           <SeeMoreBtnSkeleton />
        </section>

        {/* DISCOVERY */}
        <section className="mb-14 md:mb-20">
           <DiscoveryTabsSkeleton />
        </section>

      </div>
    </div>
  );
}
