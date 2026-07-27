export default function VideosLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="h-8 w-32 shimmer rounded mb-2" />
        <div className="h-4 w-64 shimmer rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden bg-bg-surface">
            <div className="aspect-video shimmer" />
            <div className="p-4 space-y-2">
              <div className="h-4 shimmer rounded" />
              <div className="h-4 w-3/4 shimmer rounded" />
              <div className="h-3 w-1/2 shimmer rounded mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
