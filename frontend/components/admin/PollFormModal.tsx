'use client';

import { useEffect, useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR from 'swr';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import PollForm, { type PollFormValues } from '@/components/admin/PollForm';
import { createPoll, updatePoll, closePoll, deletePoll, fetchPollAdmin } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import type { Poll } from '@/types';
import { Archive, Trash2, BarChart3, FileCode2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const emptyValues: PollFormValues = {
  question: '',
  options: [{ text: '', allowCustomInput: false }, { text: '', allowCustomInput: false }],
  allowMultiple: false,
  homepageSlot: null,
  articleId: '',
  expiresAt: '',
};

interface PollFormModalProps {
  /** null = create a new poll, otherwise edit the poll with this id */
  pollId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Refresh the polls list after a create/update/close/delete */
  onMutate: () => void;
}

export default function PollFormModal({ pollId, isOpen, onClose, onMutate }: PollFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={pollId ? 'Edit Poll' : 'New Poll'} size="xl">
      {pollId
        ? <EditPollForm pollId={pollId} onClose={onClose} onMutate={onMutate} />
        : <CreatePollForm onClose={onClose} onMutate={onMutate} />}
    </Modal>
  );
}

function CreatePollForm({ onClose, onMutate }: { onClose: () => void; onMutate: () => void }) {
  const { addToast } = useUIStore();
  const [values, setValues] = useState<PollFormValues>(emptyValues);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const validOptions = values.options
      .map(o => ({ text: o.text.trim(), allowCustomInput: o.allowCustomInput }))
      .filter(o => o.text);
    if (!values.question.trim()) {
      addToast({ type: 'error', message: 'Question is required' });
      return;
    }
    if (validOptions.length < 2) {
      addToast({ type: 'error', message: 'At least 2 options are required' });
      return;
    }

    setSaving(true);
    const res = await createPoll({
      question: values.question.trim(),
      options: validOptions,
      allowMultiple: values.allowMultiple,
      homepageSlot: values.homepageSlot,
      articleId: values.articleId.trim() || undefined,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
    });
    setSaving(false);

    if (res.success) {
      addToast({ type: 'success', message: 'Poll created!' });
      onMutate();
      onClose();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to create poll' });
    }
  };

  return (
    <div className="space-y-5">
      <PollForm values={values} onChange={setValues} />
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button onClick={handleSubmit} disabled={saving} icon={saving ? <Spinner className="w-4 h-4 animate-spin" /> : undefined}>
          {saving ? 'Creating…' : 'Create Poll'}
        </Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function EditPollForm({ pollId, onClose, onMutate }: { pollId: string; onClose: () => void; onMutate: () => void }) {
  const { addToast } = useUIStore();

  const { data: poll, isLoading, mutate: mutatePoll } = useSWR<Poll | null>(
    `poll-admin-${pollId}`,
    () => fetchPollAdmin(pollId).then((r) => r.data ?? null)
  );

  const [values, setValues] = useState<PollFormValues>(emptyValues);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (poll) {
      setValues({
        question: poll.question,
        options: poll.Options.map((o: any) => ({ text: o.text, allowCustomInput: o.allowCustomInput || false })),
        allowMultiple: poll.allowMultiple,
        homepageSlot: (poll.homepageSlot as 1 | 2 | null) ?? null,
        articleId: poll.articleId ?? '',
        expiresAt: poll.expiresAt ? poll.expiresAt.slice(0, 16) : '',
      });
    }
  }, [poll]);

  if (isLoading || !poll) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  const totalVotes = poll.totalVotes;
  const totalOptionVotes = poll.Options.reduce((sum, o) => sum + o.voteCount, 0);
  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;

  const handleSave = async () => {
    if (!values.question.trim()) {
      addToast({ type: 'error', message: 'Question is required' });
      return;
    }
    setSaving(true);
    const res = await updatePoll(pollId, {
      question: values.question.trim(),
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
      homepageSlot: values.homepageSlot,
    });
    setSaving(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Poll updated' });
      mutatePoll();
      onMutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to update' });
    }
  };

  const handleClose = async () => {
    setClosing(true);
    const res = await closePoll(pollId);
    setClosing(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Poll closed' });
      onMutate();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    const res = await deletePoll(pollId);
    setDeleting(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Poll deleted' });
      onMutate();
      onClose();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-xs font-bold px-2 py-1 rounded',
          !poll.isActive || isExpired ? 'bg-bg-elevated text-text-muted' : 'bg-green-500/10 text-green-500'
        )}>
          {!poll.isActive ? 'Closed' : isExpired ? 'Expired' : 'Active'}
        </span>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-bg-elevated border border-border rounded-xl text-center">
          <p className="text-2xl font-black text-text-primary">{totalVotes}</p>
          <p className="text-xs text-text-muted mt-0.5">Total votes</p>
        </div>
        <div className="p-4 bg-bg-elevated border border-border rounded-xl text-center">
          <p className="text-2xl font-black text-text-primary">{poll.Options.length}</p>
          <p className="text-xs text-text-muted mt-0.5">Options</p>
        </div>
      </div>

      {/* Results breakdown */}
      {totalVotes > 0 && (
        <div className="p-4 bg-bg-elevated border border-border rounded-xl">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" /> Results
          </h3>
          <div className="space-y-2">
            {poll.Options.map((opt) => {
              const pct = totalOptionVotes > 0 ? Math.round((opt.voteCount / totalOptionVotes) * 100) : 0;
              return (
                <div key={opt.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-primary font-medium truncate">{opt.text}</span>
                    <span className="text-text-muted shrink-0 ml-2">{opt.voteCount} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Text Results */}
      {poll.customTextVotes && poll.customTextVotes.length > 0 && (
        <div className="p-4 bg-bg-elevated border border-border rounded-xl">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" /> Custom Text Answers
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {poll.customTextVotes.map((vote, i) => {
              const optionText = poll.Options.find(o => o.id === vote.optionId)?.text || 'Unknown Option';
              return (
                <div key={i} className="p-2 bg-bg-surface border border-border rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-accent">{optionText}</span>
                    <span className="text-[10px] text-text-muted">{new Date(vote.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-text-primary">{vote.customText}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline usage */}
      {poll.inlineArticles && poll.inlineArticles.length > 0 && (
        <div className="p-4 bg-bg-elevated border border-border rounded-xl">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-accent" /> Embedded inline in
          </h3>
          <div className="space-y-1.5">
            {poll.inlineArticles.map((a) => {
              const href = `/${a.contentType === 'REVIEW' ? 'reviews' : a.contentType === 'MOD_GUIDE' ? 'mod-guides' : 'articles'}/${a.slug}`;
              return (
                <a key={a.id} href={href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors">
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{a.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <PollForm values={values} onChange={setValues} locked />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
        <Button onClick={handleSave} disabled={saving} icon={saving ? <Spinner className="w-4 h-4 animate-spin" /> : undefined}>
          Save Changes
        </Button>

        {poll.isActive && !isExpired && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-500/40 text-yellow-500 text-sm font-semibold hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
          >
            {closing ? <Spinner className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Close Poll
          </button>
        )}

        <button
          onClick={handleDelete}
          onBlur={() => setConfirmDelete(false)}
          disabled={deleting}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50',
            confirmDelete
              ? 'border-red-500 bg-red-500/10 text-red-500'
              : 'border-border text-text-muted hover:border-red-400 hover:text-red-400'
          )}
        >
          {deleting ? <Spinner className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          {confirmDelete ? 'Confirm Delete' : 'Delete Poll'}
        </button>
      </div>
    </div>
  );
}
