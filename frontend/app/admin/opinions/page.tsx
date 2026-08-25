'use client';

import { useState, Suspense } from 'react';import { Spinner } from '@/components/ui/Spinner';
import { useSearchParams } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';

import Link from 'next/link';
import useSWR from 'swr';
import { fetchAdminPosts } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { ARTICLE_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Plus, Edit, Eye, Trash2, Search, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import { deletePost, toggleFeatured } from '@/lib/api';
import { revalidatePublicPages } from '../actions';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

function AdminOpinionsList() {
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const isAuthorRole = user?.role === 'AUTHOR';
  const isAdminRole = user?.role === 'ADMIN';
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const isEditorRole = user?.role === 'EDITOR';
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const { data, mutate, isLoading } = useSWR(['admin-opinions', statusFilter, search, isAuthorRole, page], ([_, status, q, mine, p]) => fetchAdminPosts({ contentType: 'OPINION', status: status || undefined, search: q || undefined, sort: undefined, mine, page: Number(p), limit: 50 }));
  const articles = data?.data || [];

  const handleToggleFeatured = async (slug: string, current: boolean) => {
    setTogglingSlug(slug);
    const res = await toggleFeatured(slug, !current);
    setTogglingSlug(null);
    if (res.success) {
      addToast({ type: 'success', message: 'Featured status updated' });
      mutate();
      await revalidatePublicPages();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed' });
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Delete this opinion?')) return;
    setDeletingSlug(slug);
    const res = await deletePost(slug);
    setDeletingSlug(null);
    if (res.success) {
      addToast({ type: 'success', message: 'Opinion deleted' });
      mutate();
      await revalidatePublicPages();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed' });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Opinions</h1>
        <Link href="/admin/posts/new?type=OPINION"><Button size="sm" className="w-full sm:w-auto" icon={<Plus className="w-4 h-4" />}>New Opinion</Button></Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opinions..."
            className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['', 'DRAFT', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-accent/10 text-accent-light' : 'text-text-muted hover:bg-bg-elevated'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Title</th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-text-muted font-medium">Game</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Status</th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-text-muted font-medium">Date</th>
              <th className="px-4 py-3 text-center text-text-muted font-medium">Actions</th>
            </tr>
          </thead>
          {!isLoading && (
            <tbody className="divide-y divide-border">
              {articles.map((a) => {
                const status = ARTICLE_STATUS_LABELS[a.status as string];
                const published = a.publishedAt || a.createdAt;
                const hasBeenUpdated = a.updatedAt && new Date(a.updatedAt).getTime() - new Date(published).getTime() > 60000;
                const game = (a as any).games?.[0] || a.gameReview?.game || a.modGuide?.game;
                return (
                  <tr key={a.id} className="hover:bg-bg-elevated/50">
                    <td className="px-4 py-3 max-w-[160px] sm:max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span title={a.title} className="font-medium text-text-primary truncate">{a.title}</span>
                        {a.featured && <Badge variant="purple" size="sm" className="flex-shrink-0">Featured</Badge>}
                        {a.isBreaking && <Badge variant="danger" size="sm" className="flex-shrink-0">Breaking</Badge>}
                      </div>
                      <p className="text-xs text-text-dim mt-0.5">{a.author?.displayName}</p>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-text-muted">{game?.title || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5 items-start">
                        {status && <Badge className={status.color}>{status.label}</Badge>}
                        {a.deletionRequestedAt && (
                          <span title={a.deletionRequestReason || undefined}>
                            <Badge variant="danger">Deletion Requested</Badge>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-text-muted whitespace-nowrap">
                      <div>{formatDateTime(published)}</div>
                      {hasBeenUpdated && (
                        <div className="text-xs text-text-dim mt-0.5">
                          Updated: {new Date(a.updatedAt!).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-text-muted">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/opinions/${a.slug}`} className="p-1.5 rounded hover:bg-bg-elevated text-text-dim hover:text-text-primary"><Eye className="w-4 h-4" /></Link>
                        <Link href={`/admin/posts/${a.slug}/edit`} className="p-1.5 rounded hover:bg-bg-elevated text-text-dim hover:text-accent-light"><Edit className="w-4 h-4" /></Link>
                        {(isAdminRole || isEditorRole) && (
                          <button onClick={() => handleToggleFeatured(a.slug, a.featured)} disabled={togglingSlug === a.slug} className={`p-1.5 rounded hover:bg-bg-elevated ${a.featured ? 'text-accent-light' : 'text-text-dim'} disabled:opacity-50`} title={a.featured ? "Unfeature" : "Feature"}>
                            {togglingSlug === a.slug ? <Spinner className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${a.featured ? 'fill-current' : ''}`} />}
                          </button>
                        )}
                        {(isAdminRole || (isAuthorRole && !a.deletionRequestedAt && (a.status === 'DRAFT' || a.status === 'IN_REVIEW'))) && (
                          <button onClick={() => handleDelete(a.slug)} disabled={deletingSlug === a.slug} className="p-1.5 rounded hover:bg-red-500/10 text-text-dim hover:text-red-400 disabled:opacity-50">
                            {deletingSlug === a.slug ? <Spinner className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
        {isLoading && (
          <div className="p-12 flex flex-col items-center justify-center text-text-muted">
            <Spinner className="w-12 h-12 animate-spin mb-4 text-accent" />
            <p>Loading opinions...</p>
          </div>
        )}
        {!isLoading && articles.length === 0 && <div className="p-8 text-center text-text-muted">No opinions found</div>}
        <Pagination currentPage={page} totalPages={data?.pagination?.totalPages || 1} basePath="/admin/opinions" className="mt-6 mb-8" />

      </div>
    </div>
  );
}


export default function AdminOpinionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
      <AdminOpinionsList />
    </Suspense>
  );
}
