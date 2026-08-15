import Skeleton, { RowCardSkeleton, SidebarPanelSkeleton, ContentTypeHeadingSkeleton, FilterBoxSkeleton } from '@/components/ui/Skeleton';

export default function ReviewsLoading() {
  return (
    <>
      <ContentTypeHeadingSkeleton />
      <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 pb-8">
        <div className="mb-8 flex justify-end">
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[900px_1fr] gap-8 items-start content-start min-h-screen">
          {/* Main list */}
          <div className="lg:border-r-2 lg:border-border lg:pr-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <RowCardSkeleton key={i} />
            ))}
          </div>

          {/* Sidebar */}
          <aside className="order-first lg:order-none flex flex-col gap-4 pb-0 md:pb-8 md:gap-6 w-full self-stretch">
            <FilterBoxSkeleton />
            <SidebarPanelSkeleton title="Popular Reviews" />
            <div className="flex justify-center my-4">
              <Skeleton className="w-[300px] h-[250px] rounded-lg" />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

