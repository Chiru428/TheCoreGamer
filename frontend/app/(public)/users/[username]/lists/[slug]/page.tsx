import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Globe } from 'lucide-react';
import { fetchPublicUserList } from '@/lib/api';
import { SITE_NAME } from '@/lib/constants';
import PostCard from '@/components/blog/PostCard';
import ReadingListGameCard from '@/components/public/lists/ReadingListGameCard';
import ListAuthorLink from '@/components/public/lists/ListAuthorLink';
import ShareButtons from '@/components/ui/ShareButtons';

export const revalidate = 300;

interface Props {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  const res = await fetchPublicUserList(username, slug);
  if (!res.data) return {};

  const { name, description, author } = res.data;
  const ownerName = author?.displayName || username;
  const title = `${name} — a list by ${ownerName} | ${SITE_NAME}`;
  const desc = description || `A curated collection by ${ownerName} on ${SITE_NAME}.`;

  return {
    title,
    description: desc,
    openGraph: { title, description: desc },
  };
}

export default async function ReadingListPage({ params }: Props) {
  const { username, slug } = await params;
  const res = await fetchPublicUserList(username, slug);
  if (!res.data || !res.success) notFound();

  const list = res.data;
  const items = list.items ?? [];
  const author = list.author;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <Globe className="w-3 h-3" /> Public List
          </span>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <h1
          className="font-bold mb-2"
          style={{ fontFamily: '"acumin-pro-condensed", sans-serif', fontSize: '32px', color: 'var(--text-strong)' }}
        >
          {list.name}
        </h1>

        {list.description && (
          <p className="text-sm mb-4" style={{ color: 'var(--text)' }}>{list.description}</p>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          {author?.username && (
            <ListAuthorLink username={author.username} displayName={author.displayName} avatarUrl={author.avatarUrl} />
          )}
          <ShareButtons title={list.name} url={`/users/${username}/lists/${slug}`} />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>This list is empty.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            if (item.article) return <PostCard key={item.id} article={item.article} variant="small" />;
            if (item.game) return <ReadingListGameCard key={item.id} game={item.game} />;
            return null;
          })}
        </div>
      )}
    </div>
  );
}
