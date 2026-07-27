import Skeleton, { PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function SeriesLoading() {
  return (
    <div className="w-full">
      <PageHeaderSkeleton />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 80px' }}>
        <Skeleton className="h-4 w-24 mb-6" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
              borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)',
            }}>
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <Skeleton className="w-[80px] h-[54px] rounded-[6px] flex-shrink-0" />
              <div style={{ flex: 1 }}>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
