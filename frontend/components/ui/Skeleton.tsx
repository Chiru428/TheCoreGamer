import { cn } from '@/lib/utils';
import hub from '@/components/games/hub/gamehub.module.css';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'image' | 'avatar' | 'line';
}

export default function Skeleton({ className, variant = 'text', ...props }: SkeletonProps) {
  const base = 'shimmer rounded';
  const variants: Record<string, string> = {
    text: 'h-4 w-full',
    card: 'h-64 w-full rounded-xl',
    image: 'h-48 w-full rounded-lg',
    avatar: 'h-10 w-10 rounded-full',
    line: 'h-3 w-3/4',
  };
  return <div className={cn(base, variants[variant], className)} {...props} />;
}

export function PostCardSkeleton() {
  return (
    <div className="flex items-start sm:items-stretch py-4 sm:py-0 sm:h-[130px] overflow-hidden">
      <Skeleton className="relative w-[140px] min-w-[140px] aspect-video sm:aspect-auto sm:h-full sm:w-[231px] sm:min-w-[231px] overflow-hidden flex-shrink-0 rounded-none" />
      <div className="flex flex-col flex-1 pt-0 sm:pt-3 px-3.5 pb-3.5">
        <div className="mb-2 flex items-center gap-1.5 shrink-0">
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-full rounded-md" />
          <Skeleton className="h-6 w-3/4 rounded-md" />
        </div>
        <div className="mt-auto pt-4 flex items-center gap-1.5 shrink-0">
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-8 w-3/4 rounded-lg" />
      <div className="flex gap-4">
        <Skeleton variant="avatar" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
      </div>
      <Skeleton variant="image" className="h-96" />
      <div className="space-y-6 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="w-full relative overflow-hidden h-[165px] px-4 mb-6 md:mb-8 bg-[#111111] flex items-center justify-center">
      <div className="relative z-10 w-full max-w-5xl mx-auto text-center p-8 flex flex-col items-center gap-4">
        <Skeleton className="h-10 md:h-[48px] w-3/4 max-w-md mx-auto rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <Skeleton className="h-5 md:h-[20px] w-2/3 max-w-sm mx-auto rounded-md" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-48' : 'w-24'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function RowCardSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row w-full bg-transparent relative overflow-hidden pb-3 sm:pb-4 mb-6 sm:mb-8 border-b border-[var(--border)] h-auto sm:min-h-[135px] lg:min-h-[180px]">
      {/* Thumbnail */}
      <Skeleton 
        className="shrink-0 w-full sm:w-[240px] lg:w-[320px] aspect-[16/9]"
        style={{
          borderTopLeftRadius: '4px',
          borderBottomLeftRadius: '4px',
          borderTopRightRadius: '0px',
          borderBottomRightRadius: '30px',
        }}
      />
      
      {/* Content */}
      <div className="flex flex-col min-w-0 flex-1 p-4 sm:p-4 lg:py-3 lg:px-5 justify-start">
        <Skeleton className="h-4 w-32 mb-2 rounded-md" /> {/* Meta info */}
        <div className="space-y-2 mb-3 mt-1.5 sm:mt-2">
          <Skeleton className="h-6 sm:h-7 w-3/4 rounded-md" /> {/* Title Line 1 */}
          <Skeleton className="h-6 sm:h-7 w-1/2 rounded-md" /> {/* Title Line 2 */}
        </div>
        {/* Excerpt block instead of lines */}
        <div className="mt-1 lg:mt-1.5 mb-[8px]">
          <Skeleton className="h-14 sm:h-16 w-full rounded-md" /> 
        </div>
      </div>
    </div>
  );
}

export function SidebarItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
      {/* Text on left */}
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-16 rounded-md" /> {/* Category */}
        <Skeleton className="h-5 w-full rounded-md" /> {/* Title Line 1 */}
        <Skeleton className="h-5 w-3/4 rounded-md" /> {/* Title Line 2 */}
        <div className="pt-1">
          <Skeleton className="h-3 w-24 rounded-md" /> {/* Date */}
        </div>
      </div>
      {/* Thumbnail on right */}
      <Skeleton className="shrink-0 h-20 aspect-video rounded-md" />
    </div>
  );
}

export function SidebarPanelSkeleton({ title }: { title: string }) {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header with accent lines */}
      <div className="flex items-center gap-3 mb-1">
        <div className="flex-1 h-[2px] bg-border" />
        <Skeleton className="h-5 w-32 rounded" />
        <div className="flex-1 h-[2px] bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SidebarItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function FilterBoxSkeleton() {
  return (
    <div className="w-full bg-transparent border-2 border-border overflow-hidden">
      <div className="w-full flex items-center gap-2 p-4">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <div className="border-t-2 border-border px-4 py-2 flex flex-col">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="py-4 border-b border-border/30 last:border-b-0">
            <Skeleton className="h-3 w-24 mb-4 rounded" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4 rounded-sm" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function ReviewDetailSkeleton() {
  return (
    <article className="max-w-[1280px] mx-auto px-4 lg:px-0 py-4 md:py-6 relative min-h-screen">
      {/* Featured image at the top */}
      <div className="w-full">
        <Skeleton className="w-full aspect-video rounded-none mt-4 md:mt-6 mb-2 border-0" />
        <div className="flex items-center justify-between gap-4 mt-1 mb-2 px-4 lg:px-0">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-48 hidden md:block" />
        </div>
      </div>

      <div className="max-w-[945.6px] lg:pl-[68px] relative">
        {/* Sticky left-gap action bar */}
        <div className="hidden lg:flex flex-col absolute left-0 top-0 bottom-[1000px] w-[44px] pt-4">
          <div className="sticky top-24 flex flex-col gap-4 items-center">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-8 xl:gap-12">
          {/* Main Content Column */}
          <div className="flex-1 min-w-0">
            <div
              className="flex flex-col lg:flex-row gap-8"
              style={{ width: 'calc(100% + max(0px, min(100vw, 1280px) - 945.6px))' }}
            >
              <div className="w-full lg:w-[849.6px] lg:shrink-0 lg:border-r lg:border-border lg:pr-8">
                {/* Hero */}
                <div className="mt-1 md:mt-2 mb-3 md:mb-6">
                  <div className="mb-2">
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-9 md:h-10 w-3/4 mb-3" />
                  
                  {/* Author / Date line */}
                  <div className="flex items-center gap-3 mb-6">
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>

                {/* Score Box (Desktop) */}
                <Skeleton className="hidden lg:block h-64 w-full rounded-lg mb-8" />

                {/* Paragraphs */}
                <div className="space-y-6">
                  {Array.from({ length: 6 }).map((_, p) => (
                    <Skeleton key={p} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              </div>

              {/* Right Sidebar */}
              <aside className="w-full lg:flex-1 flex flex-col gap-8 hidden lg:flex">
                <Skeleton className="w-full h-[250px] rounded-lg" />
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SidebarItemSkeleton key={i} />
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function DetailSkeleton() {
  return (
    <ReviewDetailSkeleton />
  );
}

export function AdminListSkeleton() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="flex gap-2 overflow-x-auto mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg shrink-0" />
        ))}
      </div>
      <div className="rounded-xl border border-border p-4">
        <TableSkeleton rows={6} cols={5} />
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Primary Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-6 bg-bg-surface/50 border border-white/5 space-y-4">
            <div className="flex justify-between items-start">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-16" />
          </div>
        ))}
      </div>

      {/* Main Charts & Analytics Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl p-6 lg:col-span-2 bg-bg-surface/50 border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-4">
              <div className="hidden sm:flex flex-col items-end space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="hidden sm:flex flex-col items-end space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
          <Skeleton className="w-full h-[300px] rounded-xl" />
        </div>
        
        {/* Top Authors Area */}
        <div className="rounded-2xl p-6 bg-bg-surface/50 border border-white/5 space-y-6">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-8 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100svh - 8rem)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 flex-1 min-h-0 mt-6 overflow-hidden">
        {/* Main content */}
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-10 w-2/3 rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function AdminSimpleFormSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-4 mb-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-7 w-48" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}

const GAME_HUB_TAB_COUNT = 7; // Overview, Reviews, Articles, Media, DLC & Editions, Prices, Similar

/** Mirrors GameHero.tsx's structure/classes so the loading state doesn't jump on hydration */
function GameHeroSkeleton() {
  return (
    <section className="relative w-full flex flex-col mt-[-90px]">
      {/* Backdrop Image — desktop only */}
      <div className="relative w-full h-[300px] sm:h-[400px] overflow-hidden hidden md:block">
        <div className="absolute inset-0 shimmer" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Blue Info Bar */}
      <div className="w-full bg-[#2453A4] relative z-10 min-h-[400px] md:min-h-[140px]">
        {/* MOBILE layout */}
        <div className="md:hidden pt-[100px] pb-6 flex flex-col px-4 gap-5">
          <div className="flex justify-center px-6">
             <div className="w-[300px] aspect-[2/3] shimmer border-2 border-white/40" />
          </div>
          <div className="flex flex-col gap-3 items-center">
             <div className="shimmer rounded" style={{ height: 36, width: '80%' }} />
             <div className="shimmer rounded" style={{ height: 20, width: '60%' }} />
             <div className="shimmer rounded" style={{ height: 20, width: '70%' }} />
          </div>
          <div className="bg-[#183973] mt-4 shimmer" style={{ height: 120 }} />
        </div>

        {/* DESKTOP layout */}
        <div className="max-w-[1280px] mx-auto pr-4 lg:pr-8 relative min-h-[140px] hidden md:flex md:flex-row md:items-center justify-between pb-4 pt-4 pl-4 md:pl-[280px] lg:pl-[300px]">
          {/* Absolute Cover Art */}
          <div className="absolute bottom-[-50px] left-4 lg:left-8 w-[260px] p-3 pb-[50px] z-20">
            <div className="w-full aspect-[2/3] relative border-4 border-white shimmer" />
          </div>

          {/* Left Metadata */}
          <div className="flex flex-col gap-4 z-10 py-4 flex-1 min-w-0 pr-4 md:pr-8">
            <div className="shimmer rounded" style={{ height: 44, width: '60%' }} />
            <div className="flex flex-col gap-3">
              <div className="shimmer rounded" style={{ height: 20, width: '40%' }} />
              <div className="shimmer rounded" style={{ height: 20, width: '50%' }} />
            </div>
          </div>

          {/* Right Ratings */}
          <div className="flex flex-col items-end gap-4 relative z-10 shrink-0">
             <div className="bg-[#183973] shadow-sm min-w-[280px] h-[116px] shimmer" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Mirrors GameHubTabs.tsx's sticky tab bar */
function GameHubTabBarSkeleton() {
  return (
    <nav className={hub.tabBar} aria-hidden>
      <div className={hub.tabBarInner}>
        {Array.from({ length: GAME_HUB_TAB_COUNT }).map((_, i) => (
          <div key={i} className={hub.tabBtn}>
            <div className="shimmer rounded" style={{ height: 12, width: 60 }} />
          </div>
        ))}
      </div>
    </nav>
  );
}

/** Mirrors OverviewTab.tsx's two-column layout (Synopsis/Details/Release-info
    in the main column, Links/Release Dates/Ratings in the sidebar) */
function OverviewTabSkeleton() {
  return (
    <div className={hub.tabContent}>
      <div className={hub.overviewLayout}>
        <div className={hub.mainCol}>
          <div className={`${hub.contentCard} ${hub.orderSynopsis}`}>
            <div className="shimmer rounded" style={{ height: 20, width: 120, marginBottom: 16 }} />
            <div className="shimmer rounded" style={{ height: 14, width: '100%', marginBottom: 8 }} />
            <div className="shimmer rounded" style={{ height: 14, width: '95%', marginBottom: 8 }} />
            <div className="shimmer rounded" style={{ height: 14, width: '80%' }} />
          </div>

          <div className={hub.orderDetails}>
            <div className={hub.contentCard}>
              <div className="shimmer rounded" style={{ height: 20, width: 90, marginBottom: 16 }} />
              <div className={hub.detailsColumns}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={hub.detailsColumnItem}>
                    <div className="shimmer rounded" style={{ height: 10, width: 70, marginBottom: 6 }} />
                    <div className="shimmer rounded" style={{ height: 14, width: '90%' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={hub.orderRest2}>
            <div className={hub.contentCard}>
              <div className="shimmer rounded" style={{ height: 20, width: 150, marginBottom: 16 }} />
              <div className="shimmer rounded" style={{ height: 14, width: '100%', marginBottom: 8 }} />
              <div className="shimmer rounded" style={{ height: 14, width: '100%' }} />
            </div>
          </div>
        </div>

        <aside className={hub.asideCol}>
          <div className={hub.orderLinks}>
            <div className="widget">
              <div className="shimmer rounded" style={{ height: 18, width: 70, marginBottom: 16 }} />
              <div className={hub.linkIconGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="shimmer" style={{ aspectRatio: '1 / 1', borderRadius: 10 }} />
                ))}
              </div>
            </div>
          </div>

          <div className={hub.orderReleaseDates}>
            <div className="widget">
              <div className="shimmer rounded" style={{ height: 18, width: 110, marginBottom: 16 }} />
              <div className="shimmer rounded" style={{ height: 14, width: '100%', marginBottom: 10 }} />
              <div className="shimmer rounded" style={{ height: 14, width: '100%', marginBottom: 10 }} />
              <div className="shimmer rounded" style={{ height: 14, width: '100%' }} />
            </div>
          </div>

          <div className={`widget ${hub.orderRatings}`}>
            <div className="shimmer rounded" style={{ height: 18, width: 70, marginBottom: 16 }} />
            <div className={hub.detailsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div className="shimmer rounded" style={{ height: 28, width: '60%', margin: '0 auto 6px' }} />
                  <div className="shimmer rounded" style={{ height: 10, width: '70%', margin: '0 auto' }} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function GameDetailSkeleton() {
  return (
    <div>
      <GameHeroSkeleton />
      <GameHubTabBarSkeleton />
      <OverviewTabSkeleton />
    </div>
  );
}
