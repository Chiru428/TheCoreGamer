import Skeleton, { RowCardSkeleton, SidebarPanelSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function NewsLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 pb-8">
        <div className="mb-8 flex justify-end">
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start min-h-screen">
          {/* Main list */}
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <RowCardSkeleton key={i} />
            ))}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6 w-full lg:w-[280px]">
            <SidebarPanelSkeleton title="Popular" />
            <div className="flex justify-center my-4">
              <Skeleton className="w-[300px] h-[250px] rounded-lg" />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
