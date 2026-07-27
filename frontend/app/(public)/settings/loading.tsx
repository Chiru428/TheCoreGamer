import Skeleton from '@/components/ui/Skeleton';

export default function SettingsContentLoading() {
  return (
    <div className="space-y-8 w-full">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
