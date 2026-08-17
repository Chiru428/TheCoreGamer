import Skeleton, { RowCardSkeleton, PostCardSkeleton, ContentTypeHeadingSkeleton } from '@/components/ui/Skeleton';

export default function TagLoading() {
  return (
    <>
      <ContentTypeHeadingSkeleton />
      <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 pt-6 md:pt-10 pb-8">
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[900px_1fr] gap-6 md:gap-8 items-start min-h-screen">
          
          {/* Main list */}
          <div className="lg:border-r-2 lg:border-border lg:pr-8">
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 sm:gap-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="block sm:hidden h-full">
                    <PostCardSkeleton />
                  </div>
                  <div className="hidden sm:block">
                    <RowCardSkeleton />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col gap-4 pb-0 md:pb-8 md:gap-6 md:w-full self-stretch">
            {/* Sticky Bottom Ad in Sidebar */}
            <div className="hidden md:flex justify-center md:sticky md:top-[var(--sticky-offset)] mt-4">
              <Skeleton className="w-[300px] h-[250px] rounded-lg" />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
