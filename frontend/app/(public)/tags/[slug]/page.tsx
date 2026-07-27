import { fetchPosts, fetchTags } from '@/lib/api';
import PostGrid from '@/components/blog/PostGrid';
import Pagination from '@/components/ui/Pagination';
import { buildMeta } from '@/lib/seo';
import type { Tag } from '@/types';

export const revalidate = 120;
interface Props { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }

async function getTag(slug: string): Promise<Tag | null> {
  try {
    const res = await fetchTags(120);
    return (res.data ?? []).find((t) => t.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const tag = await getTag(slug);
  return buildMeta({
    title: `#${tag?.name ?? slug}`,
    description: tag?.description ?? `Articles tagged with ${slug}`,
    url: `/tags/${slug}`,
  });
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const [tag, res] = await Promise.all([
    getTag(slug),
    fetchPosts({ tag: slug, page, limit: 24, revalidate: 120 }),
  ]);

  const accentColor = tag?.color ?? 'var(--accent)';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: accentColor }}>
          {tag?.name ?? slug}
        </h1>
        {tag?.description ? (
          <p className="text-text-muted">{tag.description}</p>
        ) : (
          <p className="text-text-muted">Articles tagged with &ldquo;{slug}&rdquo;</p>
        )}
      </div>
      <PostGrid articles={res.data || []} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-2" />
      {res.pagination && (
        <Pagination
          currentPage={page}
          totalPages={res.pagination.totalPages}
          basePath={`/tags/${slug}`}
          className="mt-8"
        />
      )}
    </div>
  );
}
