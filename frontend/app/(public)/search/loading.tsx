import Skeleton, { RowCardSkeleton } from '@/components/ui/Skeleton';

export default function SearchLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header skeleton */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Ad placeholder */}
      <div className="h-[90px] bg-bg-elevated border border-dashed border-border rounded-md mb-8" />

      {/* Filter tab pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[80, 64, 80, 96, 104, 72, 60].map((w, i) => (
          <Skeleton key={i} className={`h-9 rounded-full`} style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Result cards */}
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <RowCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
