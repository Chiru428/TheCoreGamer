'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import { fetchAdminPosts, deletePost } from '@/lib/api';
import { revalidatePublicPages } from '../actions';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ARTICLE_STATUS_LABELS, CONTENT_TYPE_LABELS } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Eye, Search, AlertOctagon } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

function PostsPageContent() {
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const isAuthorRole = user?.role === 'AUTHOR';
  const isAdminRole = user?.role === 'ADMIN';
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const { data, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.data?.length) return null;
      return ['admin-posts', statusFilter, typeFilter, search, isAuthorRole, pageIndex + 1];
    },
    ([_, status, type, q, mine, page]) => fetchAdminPosts({
      status: status || undefined,
      contentType: type || undefined,
      search: q || undefined,
      sort: 'updated',
      mine: mine ? 'true' : undefined,
      page: page,
      limit: 20
    })
  );

  const articles = data ? data.flatMap(res => res.data || []) : [];
  const lastPage = data?.[data.length - 1];
  const hasMore = lastPage?.pagination ? lastPage.pagination.page < lastPage.pagination.totalPages : false;

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isValidating) {
          setSize(size + 1);
        }
      },
      { rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isValidating, size, setSize]);

  const handleDelete = async (slug: string) => {
    if (!confirm('Delete this post?')) return;
    setDeletingSlug(slug);
    const res = await deletePost(slug);
    setDeletingSlug(null);
    if (res.success) {
      addToast({ type: 'success', message: 'Post deleted' });
      mutate();
      await revalidatePublicPages();
    }
    else addToast({ type: 'error', message: res.error || 'Failed' });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Posts</h1>
        <Link href="/admin/posts/new"><Button size="sm" className="w-full sm:w-auto" icon={<Plus className="w-4 h-4" />}>New Post</Button></Link>
      </div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['', 'NEWS', 'REVIEW', 'MOD_GUIDE', 'WALKTHROUGH', 'OPINION', 'DEAL', 'FEATURE', 'LISTICLE'].map(s => (
              <button key={s} onClick={() => setTypeFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${typeFilter === s ? 'bg-accent text-white' : 'bg-bg-surface border border-border text-text-muted hover:border-accent hover:text-accent'}`}>
                {s ? CONTENT_TYPE_LABELS[s] || s : 'All Types'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['', 'DRAFT', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-accent/10 text-accent-light' : 'text-text-muted hover:bg-bg-elevated'}`}>
              {s || 'All Statuses'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Title</th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-text-muted font-medium">Type</th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-text-muted font-medium">Game</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Status</th>
              <th className="hidden lg:table-cell px-4 py-3 text-left text-text-muted font-medium">Date</th>
              <th className="px-4 py-3 text-center text-text-muted font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {articles.map(a => {
              const status = ARTICLE_STATUS_LABELS[a.status];
              const published = a.publishedAt || a.createdAt;
              const hasBeenUpdated = a.updatedAt && new Date(a.updatedAt).getTime() - new Date(published).getTime() > 60000;
              const game = (a as any).games?.[0];
              return (
                <tr key={a.id} className="hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 min-w-[140px]">
                    <div className="flex items-center gap-1.5 max-w-[160px] sm:max-w-xs md:max-w-md">
                      <span className="font-medium text-text-primary truncate">{a.title}</span>
                      {a.featured && <Badge variant="purple" size="sm" className="flex-shrink-0">Featured</Badge>}
                      {a.isBreaking && <Badge variant="danger" size="sm" className="flex-shrink-0">Breaking</Badge>}
                    </div>
                    <p className="text-xs text-text-dim mt-0.5">{a.author?.displayName}</p>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-text-muted">{CONTENT_TYPE_LABELS[a.contentType]}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-text-muted">{game?.title || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      {status && <Badge className={status.color}>{status.label}</Badge>}
                      {a.deletionRequestedAt && (
                        <span title={a.deletionRequestReason || undefined}>
                          <Badge variant="danger">Deletion Requested</Badge>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-text-muted whitespace-nowrap">
                    <div>{formatDate(published)}</div>
                    {hasBeenUpdated && (
                      <div className="text-xs text-text-dim mt-0.5">
                        Updated: {new Date(a.updatedAt!).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Only PUBLISHED posts have a live public page — anything else (DRAFT,
                          IN_REVIEW, APPROVED, ARCHIVED) 404s on the public route. */}
                      {a.status === 'PUBLISHED' && (
                        <Link href={`/${contentTypePath(a.contentType)}/${a.slug}`} className="p-1.5 rounded hover:bg-bg-elevated text-text-dim hover:text-text-primary"><Eye className="w-4 h-4" /></Link>
                      )}
                      <Link href={`/admin/posts/${a.slug}/edit`} className="p-1.5 rounded hover:bg-bg-elevated text-text-dim hover:text-accent-light"><Edit className="w-4 h-4" /></Link>
                      {/* ADMIN can always delete directly (also how a pending request gets fulfilled).
                          AUTHOR can only self-delete DRAFT/IN_REVIEW — anything further along needs a
                          request, submitted from the full WorkflowActions panel in the editor. */}
                      {(isAdminRole || (isAuthorRole && !a.deletionRequestedAt && (a.status === 'DRAFT' || a.status === 'IN_REVIEW'))) && (
                        <button onClick={() => handleDelete(a.slug)} disabled={deletingSlug === a.slug} className="p-1.5 rounded hover:bg-red-500/10 text-text-dim hover:text-red-400 disabled:opacity-50">
                          {deletingSlug === a.slug ? <Spinner className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                      {isAuthorRole && !a.deletionRequestedAt && a.status !== 'DRAFT' && a.status !== 'IN_REVIEW' && (
                        <Link
                          href={`/admin/posts/${a.slug}/edit`}
                          title="Request deletion"
                          className="p-1.5 rounded hover:bg-red-500/10 text-text-dim hover:text-red-400"
                        >
                          <AlertOctagon className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {hasMore && (
          <div ref={observerTarget} className="p-8 flex justify-center text-text-muted">
            <Spinner className="w-6 h-6" />
          </div>
        )}

        {isLoading && articles.length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center text-text-muted">
            <Spinner className="w-12 h-12 mb-4" />
            <p>Loading posts...</p>
          </div>
        )}
        {!isLoading && articles.length === 0 && <div className="p-8 text-center text-text-muted">No posts found</div>}
      </div>
    </div>
  );
}

export default function AdminPostsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="w-8 h-8 text-accent" />
      </div>
    }>
      <PostsPageContent />
    </Suspense>
  );
}
