'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { fetchAdminComments, updateCommentStatus } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { truncate, formatRelativeDate } from '@/lib/utils';
import { Check, X, MessageSquare } from 'lucide-react';

export default function LiveCommentActivity() {
  const { addToast } = useUIStore();
  const { data, mutate } = useSWR(
    'live-comment-activity',
    () => fetchAdminComments({ status: 'PENDING', limit: 5, sort: 'createdAt_desc' }).then(r => r.data),
    { refreshInterval: 60000 }
  );

  const comments = data ?? [];

  const handleAction = async (id: string, status: string) => {
    const res = await updateCommentStatus(id, status);
    if (res.success) { addToast({ type: 'success', message: `Comment ${status.toLowerCase()}` }); mutate(); }
    else addToast({ type: 'error', message: res.error || 'Failed' });
  };

  return (
    <div className="rounded-xl bg-bg-surface border border-border p-6 mb-8">
      <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-accent" />
        Live Comment Activity
      </h2>
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg bg-bg-elevated p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 text-sm">
                  <span className="font-medium text-text-primary">{c.authorName}</span>
                  <span className="text-xs text-text-dim">{formatRelativeDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-text-muted mb-1">{truncate(c.body, 140)}</p>
                {c.article && (
                  <Link href={`/articles/${c.article.slug}`} className="text-xs text-accent hover:underline truncate">
                    {c.article.title}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAction(c.id, 'APPROVED')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20"
                >
                  <Check className="w-3 h-3" />Approve
                </button>
                <button
                  onClick={() => handleAction(c.id, 'HIDDEN')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs font-medium hover:bg-yellow-500/20"
                >
                  <X className="w-3 h-3" />Hide
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted py-4 text-center">No comments awaiting moderation.</p>
      )}
    </div>
  );
}
