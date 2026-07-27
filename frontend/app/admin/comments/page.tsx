'use client';

import { useState, useEffect } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR from 'swr';
import { fetchAdminComments, updateCommentStatus, deleteAdminComment } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { formatRelativeDate } from '@/lib/utils';
import { renderCommentBody } from '@/components/blog/renderCommentBody';
import { Check, X, AlertTriangle, Flag, Trash2 } from 'lucide-react';

export default function AdminCommentsPage() {
  const { addToast } = useUIStore();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const { data, mutate, isLoading } = useSWR(['admin-comments', statusFilter], () => fetchAdminComments({ status: statusFilter }));
  const comments = data?.data || [];

  useEffect(() => {
    setSelectedComments([]);
  }, [statusFilter]);

  // Optimistic local update — apply the change to the cached list immediately
  // (no network round-trip) so the UI reacts instantly, then fire the request
  // in the background. Only refetch from the server if it actually fails.
  const applyLocalUpdate = (updater: (comments: any[]) => any[]) => {
    mutate(
      (current: any) => current ? { ...current, data: updater(current.data || []) } : current,
      { revalidate: false }
    );
  };

  const handleAction = async (id: string, status: string) => {
    applyLocalUpdate((list) =>
      // If we're viewing a specific status tab, the comment no longer belongs
      // here once its status changes — drop it instead of relabeling it.
      statusFilter !== 'ALL' && statusFilter !== 'REPORTED' && statusFilter !== status
        ? list.filter((c) => c.id !== id)
        : list.map((c) => (c.id === id ? { ...c, status } : c))
    );
    addToast({ type: 'success', message: `Comment ${status.toLowerCase()}` });

    const res = await updateCommentStatus(id, status);
    if (!res.success) {
      addToast({ type: 'error', message: res.error || 'Failed — reverting' });
      mutate();
    }
  };

  const handleDelete = async () => {
    if (!commentToDelete) return;
    const id = commentToDelete;
    setIsDeleting(true);
    setCommentToDelete(null);

    applyLocalUpdate((list) => list.filter((c) => c.id !== id));
    setSelectedComments((prev) => prev.filter((cId) => cId !== id));

    const res = await deleteAdminComment(id);
    if (res.success) addToast({ type: 'success', message: 'Comment deleted successfully' });
    else { addToast({ type: 'error', message: res.error || 'Failed to delete' }); mutate(); }
    setIsDeleting(false);
  };

  const handleBulkDelete = async () => {
    if (selectedComments.length === 0) return;
    const ids = selectedComments;
    setIsDeleting(true);
    setIsBulkDeleteModalOpen(false);

    applyLocalUpdate((list) => list.filter((c) => !ids.includes(c.id)));
    setSelectedComments([]);

    try {
      const results = await Promise.all(ids.map((id) => deleteAdminComment(id)));
      const successCount = results.filter((r) => r.success).length;
      if (successCount > 0) addToast({ type: 'success', message: `${successCount} comments deleted successfully` });
      if (successCount < ids.length) { addToast({ type: 'error', message: 'Some comments failed to delete' }); mutate(); }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete some comments' });
      mutate();
    } finally {
      setIsDeleting(false);
    }
  };

  // Only selected comments that aren't already approved — mirrors the per-row
  // Approve button, which hides itself once a comment is already APPROVED.
  const selectedUnapprovedIds = selectedComments.filter(
    (id) => comments.find((c: any) => c.id === id)?.status !== 'APPROVED'
  );

  const handleBulkApprove = async () => {
    if (selectedUnapprovedIds.length === 0) return;
    const ids = selectedUnapprovedIds;
    setIsBulkApproving(true);

    applyLocalUpdate((list) =>
      statusFilter !== 'ALL' && statusFilter !== 'REPORTED' && statusFilter !== 'APPROVED'
        ? list.filter((c) => !ids.includes(c.id))
        : list.map((c) => (ids.includes(c.id) ? { ...c, status: 'APPROVED' } : c))
    );
    setSelectedComments([]);

    try {
      const results = await Promise.all(ids.map((id) => updateCommentStatus(id, 'APPROVED')));
      const successCount = results.filter((r) => r.success).length;
      if (successCount > 0) addToast({ type: 'success', message: `${successCount} comments approved` });
      if (successCount < ids.length) { addToast({ type: 'error', message: 'Some comments failed to approve' }); mutate(); }
    } catch {
      addToast({ type: 'error', message: 'Failed to approve some comments' });
      mutate();
    } finally {
      setIsBulkApproving(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedComments(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedComments.length === comments.length && comments.length > 0) {
      setSelectedComments([]);
    } else {
      setSelectedComments(comments.map((c: any) => c.id));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Comments Moderation</h1>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'REPORTED', 'APPROVED', 'SPAM', 'HIDDEN'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-accent/10 text-accent-light' : 'text-text-muted hover:bg-bg-elevated'}`}>{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {!isLoading && comments.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-text-primary">
              <input 
                type="checkbox" 
                checked={selectedComments.length > 0 && selectedComments.length === comments.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              Select All
            </label>
          )}
          {selectedComments.length > 0 && (
            <>
              {selectedUnapprovedIds.length > 0 && (
                <button
                  onClick={handleBulkApprove}
                  disabled={isBulkApproving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  {isBulkApproving ? <Spinner className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve Selected ({selectedUnapprovedIds.length})
                </button>
              )}
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-sm font-medium hover:bg-danger/20"
              >
                <Trash2 className="w-4 h-4" /> Delete Selected ({selectedComments.length})
              </button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {!isLoading && comments.map((c: any) => (
          <div key={c.id} className="rounded-xl bg-bg-surface border border-border p-4 flex gap-4">
            <div className="pt-1">
              <input 
                type="checkbox" 
                checked={selectedComments.includes(c.id)}
                onChange={() => toggleSelection(c.id)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{c.authorName}</span>
                  <span className="text-xs text-text-dim">{formatRelativeDate(c.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(c as any).reportCount > 0 && (
                    <Badge variant="warning" size="sm" className="gap-1 px-1.5">
                      <Flag className="w-3 h-3" /> {(c as any).reportCount}
                    </Badge>
                  )}
                  <Badge variant={c.status === 'APPROVED' ? 'success' : c.status === 'SPAM' ? 'danger' : 'warning'}>{c.status}</Badge>
                </div>
              </div>
              <div className="text-sm text-text-muted mb-3 line-clamp-3 whitespace-pre-wrap">{renderCommentBody(c.body)}</div>
              <div className="flex gap-2">
                {c.status !== 'APPROVED' && <button onClick={() => handleAction(c.id, 'APPROVED')} className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20"><Check className="w-3 h-3" />Approve</button>}
                {c.status !== 'HIDDEN' && <button onClick={() => handleAction(c.id, 'HIDDEN')} className="flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs font-medium hover:bg-yellow-500/20"><X className="w-3 h-3" />Hide</button>}
                {c.status !== 'SPAM' && <button onClick={() => handleAction(c.id, 'SPAM')} className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20"><AlertTriangle className="w-3 h-3" />Spam</button>}
                <button onClick={() => setCommentToDelete(c.id)} className="flex items-center gap-1 px-2.5 py-1 rounded bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 ml-auto"><Trash2 className="w-3 h-3" />Delete</button>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="p-12 flex flex-col items-center justify-center text-text-muted rounded-xl bg-bg-surface border border-border">
            <Spinner className="w-8 h-8 animate-spin mb-4 text-accent" />
            <p>Loading comments...</p>
          </div>
        )}
        {!isLoading && comments.length === 0 && <div className="p-8 text-center text-text-muted rounded-xl bg-bg-surface border border-border">No comments to moderate</div>}
      </div>

      <Modal isOpen={!!commentToDelete} onClose={() => setCommentToDelete(null)} title="Delete Comment">
        <p className="text-text-muted mb-6">Are you sure you want to delete this comment? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCommentToDelete(null)}>Cancel</Button>
          <Button variant="danger" loading={isDeleting} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      <Modal isOpen={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} title="Delete Selected Comments">
        <p className="text-text-muted mb-6">Are you sure you want to delete {selectedComments.length} selected comments? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={isDeleting} onClick={handleBulkDelete}>Delete All ({selectedComments.length})</Button>
        </div>
      </Modal>
    </div>
  );
}
