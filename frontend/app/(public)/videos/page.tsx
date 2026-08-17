import Image from 'next/image';
import Link from 'next/link';
import { fetchVideos } from '@/lib/api';
import { buildMeta } from '@/lib/seo';
import AdSlot from '@/components/monetization/AdSlot';
import Pagination from '@/components/ui/Pagination';
import Badge from '@/components/ui/Badge';
import type { VideoAsset } from '@/types';
import { Play } from 'lucide-react';

export const revalidate = 120;

export const metadata = buildMeta({
  title: 'Videos',
  description: 'Game trailers, reviews, and video coverage from TheCoreGamer.',
  url: '/videos',
});

function fmtDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function contentTypeBadge(type: string) {
  switch (type) {
    case 'REVIEW': return { label: 'Review', variant: 'info' as const };
    case 'NEWS': return { label: 'News', variant: 'purple' as const };
    case 'MOD_GUIDE': return { label: 'Mod Guide', variant: 'warning' as const };
    case 'WALKTHROUGH': return { label: 'Walkthrough', variant: 'warning' as const };
    default: return { label: type.replace('_', ' '), variant: 'default' as const };
  }
}

function VideoCard({ video }: { video: VideoAsset }) {
  const thumb = `https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg?width=640`;
  const duration = fmtDuration(video.duration);
  const articlePath = video.article?.slug
    ? (video.article.contentType === 'REVIEW' ? `/reviews/${video.article.slug}` : `/articles/${video.article.slug}`)
    : null;
  const badge = video.article ? contentTypeBadge(video.article.contentType) : null;

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-bg-surface overflow-hidden hover:border-accent/40 transition-colors">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-bg-elevated overflow-hidden">
        <Image quality={100}
          src={thumb}
          alt={video.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-accent/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        {duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[11px] font-bold bg-black/80 text-white">
            {duration}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-bold text-text-primary leading-snug line-clamp-2">{video.title}</h3>
        {video.article && articlePath && (
          <div className="flex items-start justify-between gap-2 mt-auto">
            <Link
              href={articlePath}
              className="text-xs text-text-muted hover:text-accent transition-colors line-clamp-2 flex-1"
            >
              {video.article.title}
            </Link>
            {badge && (
              <Badge variant={badge.variant} className="text-[10px] shrink-0">{badge.label}</Badge>
            )}
          </div>
        )}
      </div>

      {/* Clicking the thumbnail navigates to the article */}
      {articlePath && (
        <Link href={articlePath} className="absolute inset-0" aria-label={video.title} />
      )}
    </div>
  );
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function VideosPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);

  const res = await fetchVideos({ page });
  const videos = res.data ?? [];
  const pagination = (res as any).pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Videos</h1>
        <p className="text-sm text-text-muted mt-1">Game trailers, reviews, and video coverage</p>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20">
          <Play className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-lg font-semibold text-text-primary">No videos yet.</p>
          <p className="text-sm text-text-muted mt-1">Check back soon!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative">
            {videos.map(v => (
              <div key={v.id} className="relative">
                <VideoCard video={v} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10">
              <Pagination currentPage={page} totalPages={totalPages} basePath="/videos" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
