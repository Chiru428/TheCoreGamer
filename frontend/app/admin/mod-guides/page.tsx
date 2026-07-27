'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import Link from 'next/link';
import useSWR from 'swr';
import { fetchAdminPosts } from '@/lib/api';
import type { Article } from '@/types';
import Badge from '@/components/ui/Badge';
import { ARTICLE_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Eye, Trash2, ShieldCheck, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';
import { deletePost, verifyModGuide } from '@/lib/api';
import { revalidatePublicPages } from '../actions';
import { useAuthStore } from '@/store/authStore';

function verificationLabel(lastVerifiedAt?: string | null, lastVerifiedBy?: { displayName: string } | null) {
  if (!lastVerifiedAt) return 'Never verified';
  const date = new Date(lastVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return lastVerifiedBy ? `${date} by ${lastVerifiedBy.displayName}` : date;
}

export default function AdminModGuidesPage() {
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const isAuthorRole = user?.role === 'AUTHOR';
  const isAdminRole = user?.role === 'ADMIN';
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const { data, mutate, isLoading } = useSWR(['admin-guides', statusFilter, search, isAuthorRole], ([_, status, q, mine]) => fetchAdminPosts({ contentType: 'MOD_GUIDE', status: status || undefined, search: q || undefined, sort: 'updated', mine }));
  const articles = (data?.data || []).filter(a => a.contentType === 'MOD_GUIDE');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const handleDelete = async (slug: string) => {
    if (!confirm('Delete this mod guide?')) return;
    setDeletingSlug(slug);
    const res = await deletePost(slug);
    setDeletingSlug(null);
    if (res.success) {
      addToast({ type: 'success', message: 'Mod guide deleted' });
      mutate();
      await revalidatePublicPages();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed' });
    }
  };

  const handleVerify = async (slug: string, gameVersion: string) => {
    if (!gameVersion) {
      addToast({ type: 'error', message: 'Set a game version on the guide before verifying' });
      return;
    }
    setVerifying(slug);
    const res = await verifyModGuide(slug, { version: gameVersion });
    setVerifying(null);
    if (res.success) {
      addToast({ type: 'success', message: 'Guide marked as verified' });
      mutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to verify guide' });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Mod Guides</h1>
        <Link href="/admin/mod-guides/new"><Button size="sm" className="w-full sm:w-auto" icon={<Plus className="w-4 h-4" />}>New Guide</Button></Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mod guides..."
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
              <th className="hidden sm:table-cell px-4 py-3 text-left text-text-muted font-medium">Date</th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-text-muted font-medium">Verification</th>
              <th className="px-4 py-3 text-center text-text-muted font-medium">Actions</th>
            </tr>
          </thead>
          {!isLoading && (
            <tbody className="divide-y divide-border">
              {articles.map((a) => {
                const status = ARTICLE_STATUS_LABELS[a.status as string];
                const published = a.publishedAt || a.createdAt;
                const hasBeenUpdated = a.updatedAt && new Date(a.updatedAt).getTime() - new Date(published).getTime() > 60000;
                const game = (a as any).games?.[0] || a.modGuide?.game || a.gameReview?.game;
                return (
                  <tr key={a.id} className="hover:bg-bg-elevated/50">
                    <td className="px-4 py-3 max-w-[160px] sm:max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-text-primary truncate">{a.title}</span>
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
                    <td className="hidden sm:table-cell px-4 py-3 text-text-muted whitespace-nowrap">
                      <div>{formatDate(published)}</div>
                      {hasBeenUpdated && (
                        <div className="text-xs text-text-dim mt-0.5">
                          Updated: {new Date(a.updatedAt!).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-text-muted whitespace-nowrap">
                      <div>{verificationLabel(a.modGuide?.lastVerifiedAt, a.modGuide?.lastVerifiedBy)}</div>
                      {a.modGuide?.gameVersion && (
                        <button
                          type="button"
                          onClick={() => handleVerify(a.slug, a.modGuide!.gameVersion)}
                          disabled={verifying === a.slug}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-accent-light hover:text-accent transition-colors disabled:opacity-50"
                        >
                          {verifying === a.slug ? <Spinner className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                          Mark as Verified
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/mod-guides/${a.slug}`} className="p-1.5 rounded hover:bg-bg-elevated text-text-dim hover:text-text-primary"><Eye className="w-4 h-4" /></Link>
                        <Link href={`/admin/mod-guides/${a.slug}/edit`} className="p-1.5 rounded hover:bg-bg-elevated text-text-dim hover:text-accent-light"><Edit className="w-4 h-4" /></Link>
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
            <p>Loading mod guides...</p>
          </div>
        )}
        {!isLoading && articles.length === 0 && <div className="p-8 text-center text-text-muted">No mod guides found</div>}
      </div>
    </div>
  );
}
