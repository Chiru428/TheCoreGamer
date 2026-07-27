'use client';

import useSWR from 'swr';import { Spinner } from '@/components/ui/Spinner';

import { fetchPolls, closePoll, deletePoll } from '@/lib/api';
import type { Poll } from '@/types';
import { useUIStore } from '@/store/uiStore';
import { Plus, Edit, Archive, Trash2, BarChart3, Copy, Check, Home, FileText, ExternalLink, FileCode2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PollFormModal from '@/components/admin/PollFormModal';

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback for browsers that block clipboard without user gesture
      const el = document.createElement('textarea');
      el.value = id;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy full ID: ${id}`}
      className="flex items-center gap-1.5 group/copy"
    >
      <span className="font-mono text-[11px] text-text-muted group-hover/copy:text-accent transition-colors">
        {id.slice(0, 8)}…
      </span>
      <span className={`transition-colors ${copied ? 'text-green-400' : 'text-text-muted group-hover/copy:text-accent'}`}>
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </span>
    </button>
  );
}

function PollRow({ poll, onMutate, onEdit }: { poll: Poll; onMutate: () => void; onEdit: (id: string) => void }) {
  const { addToast } = useUIStore();
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPos, setConfirmPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const status = !poll.isActive ? 'Closed' : isExpired ? 'Expired' : 'Active';
  const statusColor = status === 'Active' ? 'text-green-500' : status === 'Expired' ? 'text-yellow-500' : 'text-text-muted';

  const openConfirm = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setConfirmPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setConfirmOpen(true);
  };

  useEffect(() => {
    if (!confirmOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setConfirmOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmOpen(false);
    };
    const handleReposition = () => setConfirmOpen(false);
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [confirmOpen]);

  const handleClose = async () => {
    setClosing(true);
    const res = await closePoll(poll.id);
    setClosing(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Poll closed' });
      onMutate();
    } else {
      addToast({ type: 'error', message: 'Failed to close poll' });
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setDeleting(true);
    const res = await deletePoll(poll.id);
    setDeleting(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Poll deleted' });
      onMutate();
    } else {
      addToast({ type: 'error', message: 'Failed to delete poll' });
    }
  };

  return (
    <tr className="border-b border-border hover:bg-bg-elevated/50 transition-colors">
      <td className="py-3 px-4">
        <p className="text-sm font-medium text-text-primary line-clamp-2 max-w-xs">{poll.question}</p>
        {poll.expiresAt && (
          <p className="text-xs text-text-muted mt-0.5">Expires {formatDate(poll.expiresAt)}</p>
        )}
      </td>
      {/* -- Poll ID with copy button -- */}
      <td className="py-3 px-4">
        <CopyIdButton id={poll.id} />
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">{poll.Options.length} options</td>
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          {poll.homepageSlot != null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#00e5a0]/15 text-[#00e5a0] w-fit">
              <Home className="w-3 h-3" /> Slot {poll.homepageSlot} — {poll.homepageSlot === 1 ? 'Below News' : 'Below Mod Guides'}
            </span>
          )}
          {poll.articleId && (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 w-fit">
                <FileText className="w-3 h-3" /> Article
              </span>
              {poll.Article && (
                <a
                  href={`/${poll.Article.contentType === 'REVIEW' ? 'reviews' : poll.Article.contentType === 'MOD_GUIDE' ? 'mod-guides' : 'articles'}/${poll.Article.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent transition-colors max-w-[160px] truncate"
                  title={poll.Article.title}
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{poll.Article.title}</span>
                </a>
              )}
            </div>
          )}
          {poll.inlineArticles && poll.inlineArticles.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 w-fit">
                <FileCode2 className="w-3 h-3" /> Inline
              </span>
              {poll.inlineArticles.map((a) => (
                <a
                  key={a.id}
                  href={`/${a.contentType === 'REVIEW' ? 'reviews' : a.contentType === 'MOD_GUIDE' ? 'mod-guides' : 'articles'}/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent transition-colors max-w-[160px] truncate"
                  title={a.title}
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{a.title}</span>
                </a>
              ))}
            </div>
          )}
          {poll.homepageSlot == null && !poll.articleId && !poll.inlineArticles?.length && (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-sm font-semibold text-text-primary">{poll.totalVotes}</td>
      <td className="py-3 px-4">
        <span className={`text-xs font-bold ${statusColor}`}>{status}</span>
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">{formatDate(poll.createdAt)}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(poll.id)} className="p-1.5 text-text-muted hover:text-accent transition-colors" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          {poll.isActive && !isExpired && (
            <button onClick={handleClose} disabled={closing} className="p-1.5 text-text-muted hover:text-yellow-500 transition-colors" title="Close poll">
              {closing ? <Spinner className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            </button>
          )}
          <button
            ref={triggerRef}
            onClick={() => (confirmOpen ? setConfirmOpen(false) : openConfirm())}
            disabled={deleting}
            className={`p-1.5 transition-colors ${confirmOpen ? 'text-red-500' : 'text-text-muted hover:text-red-400'}`}
            title="Delete"
          >
            {deleting ? <Spinner className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>

          {confirmOpen && createPortal(
            <div
              ref={popoverRef}
              style={{ position: 'fixed', top: confirmPos.top, right: confirmPos.right }}
              className="z-50 w-56 p-3 rounded-lg border border-border bg-bg-surface shadow-xl"
            >
              <p className="text-xs text-text-primary font-medium mb-2.5">Delete this poll? This can&apos;t be undone.</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>,
            document.body
          )}
        </div>
      </td>
    </tr>
  );
}

type ModalState = { mode: 'create' } | { mode: 'edit'; pollId: string } | null;

export default function AdminPollsPage() {
  const { data, mutate, isLoading } = useSWR(
    'admin-polls',
    () => fetchPolls({ active: false }).then((r) => r.data ?? [])
  );
  const [modalState, setModalState] = useState<ModalState>(null);

  const polls: Poll[] = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Polls</h1>
          <p className="text-sm text-text-muted mt-0.5">Create and manage community polls</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setModalState({ mode: 'create' })}>
          New Poll
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">No polls yet</p>
          <p className="text-sm">Create your first community poll</p>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} className="mt-4" onClick={() => setModalState({ mode: 'create' })}>
            Create Poll
          </Button>
        </div>
      ) : (
        <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-bg-elevated">
                <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase tracking-widest">Question</th>
                <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase tracking-widest">Poll ID</th>
                <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase tracking-widest">Options</th>
                <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase tracking-widest">Placement</th>
                <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase tracking-widest">Votes</th>
                <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase tracking-widest">Status</th>
                <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase tracking-widest">Created</th>
                <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {polls.map((p) => (
                <PollRow key={p.id} poll={p} onMutate={mutate} onEdit={(id) => setModalState({ mode: 'edit', pollId: id })} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PollFormModal
        pollId={modalState?.mode === 'edit' ? modalState.pollId : null}
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        onMutate={mutate}
      />
    </div>
  );
}
