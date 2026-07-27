import Skeleton, { PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function TagLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-7 sm:gap-x-6 md:gap-x-8">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[2/3] w-full rounded-none" />
              <div className="pt-3">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
