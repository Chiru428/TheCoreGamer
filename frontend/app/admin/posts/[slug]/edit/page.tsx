'use client';

import useSWR from 'swr';
import { Spinner } from '@/components/ui/Spinner';
import { fetchPost } from '@/lib/api';
import PostForm from '@/components/admin/PostForm';
import { useParams } from 'next/navigation';

export default function EditPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data } = useSWR(`edit-post-${slug}`, () => fetchPost(slug).then(r => r.data));

  if (!data) return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-4 text-text-muted">
      <Spinner className="w-10 h-10 animate-spin text-accent" />
      <span className="text-sm font-medium tracking-wide">Loading editor…</span>
    </div>
  );

  return <PostForm mode="edit" initialData={data as unknown as Record<string, unknown>} slug={slug} />;
}
