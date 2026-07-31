import Skeleton, { PageHeaderSkeleton, FilterBoxSkeleton } from '@/components/ui/Skeleton';

export default function GamesLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="hidden md:block w-[250px] shrink-0">
            <FilterBoxSkeleton />
          </aside>
          
          <div className="flex-1 min-w-0">
            {/* Grid skeleton — matches GamesGridClient's borderless poster grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                  {/* Cover image area */}
                  <Skeleton className="aspect-[2/3] w-full rounded-none" />
                  {/* Title */}
                  <div className="pt-3">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
