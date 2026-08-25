'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
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

function AdminGuidesList() {
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
  const { data, mutate, isLoading } = useSWR(['admin-guides', statusFilter, search, isAuthorRole, page], ([_, status, q, mine, p]) => fetchAdminPosts({ contentType: 'GUIDE', status: status || undefined, search: q || undefined, sort: undefined, mine, page: Number(p), limit: 50 }));
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
    if (!confirm('Delete this guide?')) return;
    setDeletingSlug(slug);
    const res = await deletePost(slug);
    setDeletingSlug(null);
    if (res.success) {
      addToast({ type: 'success', message: 'Guide deleted' });
      mutate();
      await revalidatePublicPages();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed' });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Guides</h1>
        <Link href="/admin/posts/new?type=GUIDE"><Button size="sm" className="w-full sm:w-auto" icon={<Plus className="w-4 h-4" />}>New Guide</Button></Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guides..."
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
              <th className="hidden md:table-cell px-4 py-3 text-left text-text-muted font-medium">Type</th>
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
                    <td className="hidden md:table-cell px-4 py-3 text-text-muted">{a.guideType || 'General'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5 items-start">
                        {status && <Badge className={status.color}>{status.label}</Badge>}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <div className="flex flex-col text-xs text-text-muted">
                        <span>{formatDateTime(published)}</span>
                        {hasBeenUpdated && <span>(Updated {formatDate(a.updatedAt!)})</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center w-28">
                      <div className="flex items-center justify-center gap-2">
                        {a.status === 'PUBLISHED' && (
                          <a href={`/guides/${a.slug}`} target="_blank" rel="noreferrer" title="View Article" className="text-text-muted hover:text-accent p-1.5 rounded-lg hover:bg-bg-elevated transition-colors">
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        <Link href={`/admin/posts/${a.slug}/edit`} title="Edit" className="text-text-muted hover:text-accent p-1.5 rounded-lg hover:bg-bg-elevated transition-colors">
                          <Edit className="w-4 h-4" />
                        </Link>
                        {(isAdminRole || isAuthorRole) && (
                          <button
                            onClick={() => handleDelete(a.slug)}
                            title="Delete"
                            disabled={deletingSlug === a.slug}
                            className="text-text-muted hover:text-danger p-1.5 rounded-lg hover:bg-bg-elevated transition-colors disabled:opacity-50"
                          >
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
          <div className="flex justify-center p-8"><Spinner className="w-12 h-12 animate-spin mb-4 text-accent" /></div>
        )}
        {!isLoading && articles.length === 0 && (
          <div className="text-center p-8 text-text-muted">No guides found.</div>
        )}
        <Pagination currentPage={page} totalPages={data?.pagination?.totalPages || 1} basePath="/admin/guides" className="mt-6 mb-8" />

      </div>
    </div>
  );
}


export default function AdminGuidesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
      <AdminGuidesList />
    </Suspense>
  );
}
