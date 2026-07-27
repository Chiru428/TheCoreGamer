'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import { RefreshCw, Clock } from 'lucide-react';
import { apiMutate } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';

export default function MajorUpdateSection({ slug }: { slug: string }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useUIStore();
  const router = useRouter();

  const handleRefresh = async () => {
    if (!note.trim()) {
      addToast({ type: 'error', message: 'Update note is required' });
      return;
    }
    setSaving(true);
    const res = await apiMutate<{ lastMajorUpdateAt: string; lastMajorUpdateNote: string }>(
      `/api/posts/${slug}/refresh`,
      'PATCH',
      { updateNote: note.trim() }
    );
    setSaving(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Article marked as updated' });
      setNote('');
      router.refresh();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to update' });
    }
  };

  return (
    <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 space-y-3 mt-6">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Mark as Major Update</h3>
      </div>
      <p className="text-xs text-text-muted mb-2">
        If you've made significant changes, log an update note. This refreshes the article's "last updated" date for readers and SEO.
      </p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Added section on 1.05 patch changes"
        maxLength={200}
        className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
      />
      <div className="flex justify-between items-center pt-1">
        <span className={`text-[10px] ${note.length > 180 ? 'text-danger' : 'text-text-dim'}`}>
          {note.length}/200
        </span>
        <button
          type="button"
          disabled={saving || !note.trim()}
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
          Save Update Notice
        </button>
      </div>
    </div>
  );
}
