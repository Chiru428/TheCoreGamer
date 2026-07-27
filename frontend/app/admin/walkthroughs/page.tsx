'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import Link from 'next/link';
import useSWR from 'swr';
import { fetchAdminPosts, deletePost } from '@/lib/api';
import { revalidatePublicPages } from '../actions';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ARTICLE_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';

export default function AdminWalkthroughsPage() {
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const isAuthorRole = user?.role === 'AUTHOR';
  const isAdminRole = user?.role === 'ADMIN';
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const { data, mutate, isLoading } = useSWR(
    ['admin-walkthroughs', statusFilter, search, isAuthorRole],
    ([_, status, q, mine]) => fetchAdminPosts({ contentType: 'WALKTHROUGH', status: status || undefined, search: q || undefined, sort: 'updated', mine })
  );
  const articles = (data?.data || []).filter(a => a.contentType === 'WALKTHROUGH');
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const handleDelete = async (slug: string) => {
    if (!confirm('Delete this walkthrough?')) return;
    setDeletingSlug(slug);
    const res = await deletePost(slug);
    setDeletingSlug(null);
    if (res.success) {
      addToast({ type: 'success', message: 'Walkthrough deleted' });
      mutate();
      await revalidatePublicPages();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed' });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Walkthroughs</h1>
        <Link href="/admin/walkthroughs/new"><Button size="sm" className="w-full sm:w-auto" icon={<Plus className="w-4 h-4" />}>New Walkthrough</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search walkthroughs..."
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
              <th className="hidden sm:table-cell px-4 py-3 text-left text-text-muted font-medium">Published At</th>
              <th className="px-4 py-3 text-center text-text-muted font-medium">Actions</th>
            </tr>
          </thead>
          {!isLoading && (
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
                    <td className="hidden sm:table-cell px-4 py-3 text-text-muted whitespace-nowrap">
                      <div>{formatDate(published)}</div>
                      {hasBeenUpdated && (
                        <div className="text-xs text-text-dim mt-0.5">
                          Updated: {new Date(a.updatedAt!).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/articles/${a.slug}`} className="p-1.5 rounded hover:bg-bg-elevated text-text-dim hover:text-text-primary"><Eye className="w-4 h-4" /></Link>
                        <Link href={`/admin/walkthroughs/${a.slug}/edit`} className="p-1.5 rounded hover:bg-bg-elevated text-text-dim hover:text-accent-light"><Edit className="w-4 h-4" /></Link>
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
        {isLoading && articles.length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center text-text-muted">
            <Spinner className="w-12 h-12 animate-spin mb-4 text-accent" />
            <p>Loading walkthroughs...</p>
          </div>
        )}
        {!isLoading && articles.length === 0 && <div className="p-8 text-center text-text-muted">No walkthroughs found</div>}
      </div>
    </div>
  );
}
