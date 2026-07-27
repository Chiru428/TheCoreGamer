'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR from 'swr';
import { ChevronDown, ChevronUp, Pin, PinOff, Trash2, Radio, Bold, Italic } from 'lucide-react';
import { fetchLiveUpdates, postLiveUpdate, toggleLiveUpdatePin, deleteLiveUpdate, endLiveBlog } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import type { LiveBlogUpdate } from '@/types';

/** Splits the textarea on newlines and parses **bold** / *italic* into a minimal TipTap doc. */
function textToTipTapDoc(text: string) {
  const parseInline = (line: string) => {
    const nodes: Record<string, unknown>[] = [];
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line))) {
      if (match.index > lastIndex) {
        nodes.push({ type: 'text', text: line.slice(lastIndex, match.index) });
      }
      if (match[1] !== undefined) {
        nodes.push({ type: 'text', text: match[1], marks: [{ type: 'bold' }] });
      } else if (match[2] !== undefined) {
        nodes.push({ type: 'text', text: match[2], marks: [{ type: 'italic' }] });
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      nodes.push({ type: 'text', text: line.slice(lastIndex) });
    }
    return nodes.length ? nodes : [{ type: 'text', text: line }];
  };

  const paragraphs = text.split('\n').filter((line) => line.trim().length > 0);
  return {
    type: 'doc',
    content: paragraphs.map((line) => ({ type: 'paragraph', content: parseInline(line) })),
  };
}

interface LiveBlogPanelProps {
  slug: string;
  isEnded: boolean;
}

export default function LiveBlogPanel({ slug, isEnded }: LiveBlogPanelProps) {
  const { addToast } = useUIStore();
  const [collapsed, setCollapsed] = useState(false);
  const [content, setContent] = useState('');
  const [label, setLabel] = useState('');
  const [posting, setPosting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(isEnded);

  const { data, mutate, isLoading } = useSWR(
    `/api/articles/${slug}/live-updates`,
    () => fetchLiveUpdates(slug).then((r) => r.data || [])
  );

  const updates: LiveBlogUpdate[] = data || [];

  const handlePost = async () => {
    if (!content.trim()) {
      addToast({ type: 'error', message: 'Update content is required' });
      return;
    }
    setPosting(true);
    const res = await postLiveUpdate(slug, {
      content: textToTipTapDoc(content),
      label: label.trim() || undefined,
    });
    setPosting(false);
    if (res.success) {
      setContent('');
      setLabel('');
      mutate();
      addToast({ type: 'success', message: 'Live update posted' });
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to post update' });
    }
  };

  const handleTogglePin = async (updateId: string) => {
    const res = await toggleLiveUpdatePin(slug, updateId);
    if (res.success) {
      mutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to toggle pin' });
    }
  };

  const handleDelete = async (updateId: string) => {
    if (!confirm('Delete this live update? This cannot be undone.')) return;
    const res = await deleteLiveUpdate(slug, updateId);
    if (res.success) {
      mutate();
      addToast({ type: 'success', message: 'Update deleted' });
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to delete update' });
    }
  };

  const handleEndLiveBlog = async () => {
    if (!confirm('End this live blog? No further updates can be posted afterward.')) return;
    setEnding(true);
    const res = await endLiveBlog(slug);
    setEnding(false);
    if (res.success) {
      setEnded(true);
      addToast({ type: 'success', message: 'Live blog ended' });
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to end live blog' });
    }
  };

  const wrapSelection = (before: string, after: string = before) => {
    const textarea = document.getElementById('live-blog-update-input') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const newValue = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
    setContent(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart + before.length, selectionEnd + before.length);
    });
  };

  return (
    <div className="rounded-xl bg-bg-surface border border-border p-4 space-y-3">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Live Updates</h3>
          <span className="text-[10px] font-mono bg-bg-elevated px-2 py-0.5 rounded-full text-text-muted">
            {updates.length}
          </span>
          {ended && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim border border-border rounded px-1.5 py-0.5">
              Ended
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronUp className="w-4 h-4 text-text-muted" />}
      </button>

      {!collapsed && (
        <>
          {!ended && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Label (optional)</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={40}
                  placeholder="e.g. Breaking, Halftime, Patch Live"
                  className="w-full px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <button
                    type="button"
                    onClick={() => wrapSelection('**')}
                    title="Bold"
                    className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelection('*')}
                    title="Italic"
                    className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  id="live-blog-update-input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the update... use **bold** or *italic* for emphasis"
                  rows={4}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent resize-y"
                />
              </div>

              <button
                type="button"
                disabled={posting || !content.trim()}
                onClick={handlePost}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posting && <Spinner className="w-3.5 h-3.5 animate-spin" />}
                Post Update
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pt-2 border-t border-border">
            {isLoading ? (
              <div className="flex justify-center py-4"><Spinner className="w-5 h-5 animate-spin text-text-muted" /></div>
            ) : updates.length === 0 ? (
              <p className="text-xs text-text-dim italic py-2">No live updates yet.</p>
            ) : (
              updates.map((update) => (
                <div key={update.id} className="bg-bg-elevated rounded-lg p-2.5 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {update.label && (
                        <span className="live-badge">{update.label}</span>
                      )}
                      {update.isPinned && (
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                          📌 Pinned
                        </span>
                      )}
                      <span className="text-[10px] text-text-dim">
                        {new Date(update.publishedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(update.id)}
                        title={update.isPinned ? 'Unpin' : 'Pin'}
                        className="p-1 rounded hover:bg-bg-surface text-text-muted hover:text-text-primary"
                      >
                        {update.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(update.id)}
                        title="Delete"
                        className="p-1 rounded hover:bg-bg-surface text-text-muted hover:text-danger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted whitespace-pre-wrap line-clamp-3">
                    {extractPlainText(update.content)}
                  </p>
                </div>
              ))
            )}
          </div>

          {!ended && (
            <button
              type="button"
              disabled={ending}
              onClick={handleEndLiveBlog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger text-danger text-xs font-semibold hover:bg-danger/10 transition-colors disabled:opacity-50 w-full justify-center"
            >
              {ending && <Spinner className="w-3.5 h-3.5 animate-spin" />}
              End Live Blog
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Best-effort plain text preview of a TipTap JSON doc for the admin update list */
function extractPlainText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const node = content as { type?: string; text?: string; content?: unknown[] };
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) {
    return node.content.map((n) => extractPlainText(n)).join(' ');
  }
  return '';
}
