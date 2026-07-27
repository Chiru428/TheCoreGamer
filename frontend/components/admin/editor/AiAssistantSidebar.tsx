'use client';

import { useEffect, useRef, useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import type { Editor } from '@tiptap/react';
import { Sparkles, X, RefreshCw, Plus, Check } from 'lucide-react';
import { generateAiHeadlines, generateAiExcerpt, suggestAiTags, streamAiRewrite } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';

type Tab = 'headlines' | 'excerpt' | 'tags' | 'rewrite';

interface AiTag {
  id: string;
  name: string;
}

interface AiAssistantSidebarProps {
  editor: Editor | null;
  articleContent: string;
  existingTagIds: string[];
  /** Full tag list (id + name) — used to resolve names for suggested tag IDs. */
  allTags?: AiTag[];
  /** Inserts the chosen headline into the article title field. */
  onUseHeadline: (headline: string) => void;
  /** Fills the chosen excerpt into the article excerpt field. */
  onUseExcerpt: (excerpt: string) => void;
  /** Adds an existing tag (by ID) to the article's selected tags. */
  onAddTag: (tagId: string) => void;
  /** Creates a brand-new tag and adds it to the article's selected tags. */
  onCreateAndAddTag: (name: string) => void | Promise<void>;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'headlines', label: 'Headlines' },
  { key: 'excerpt', label: 'Excerpt' },
  { key: 'tags', label: 'Tags' },
  { key: 'rewrite', label: 'Rewrite' },
];

export default function AiAssistantSidebar({
  editor,
  articleContent,
  existingTagIds,
  allTags = [],
  onUseHeadline,
  onUseExcerpt,
  onAddTag,
  onCreateAndAddTag,
}: AiAssistantSidebarProps) {
  const { addToast } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('headlines');

  // Tab 1 — Headlines
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [headlinesLoading, setHeadlinesLoading] = useState(false);

  // Tab 2 — Excerpt
  const [excerpt, setExcerpt] = useState('');
  const [excerptLoading, setExcerptLoading] = useState(false);

  // Tab 3 — Tags
  const [suggestedTagIds, setSuggestedTagIds] = useState<string[]>([]);
  const [suggestedNewTags, setSuggestedNewTags] = useState<string[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [creatingTagName, setCreatingTagName] = useState<string | null>(null);

  // Tab 4 — Rewrite
  const [hasSelection, setHasSelection] = useState(false);
  const [rewriteOptions, setRewriteOptions] = useState<string[]>([]);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const rewriteAbortRef = useRef<AbortController | null>(null);

  // Track whether there's an active text selection in the editor
  useEffect(() => {
    if (!editor) return;
    const update = () => setHasSelection(!editor.state.selection.empty);
    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  const getArticleContent = () => (editor?.getText() || articleContent || '').slice(0, 2000);

  const handleGenerateHeadlines = async () => {
    const content = getArticleContent();
    if (!content.trim()) {
      addToast({ type: 'error', message: 'Add some article content first' });
      return;
    }
    setHeadlinesLoading(true);
    const res = await generateAiHeadlines(content);
    if (res.success && res.data) {
      setHeadlines(res.data.headlines);
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to generate headlines' });
    }
    setHeadlinesLoading(false);
  };

  const handleGenerateExcerpt = async () => {
    const content = getArticleContent();
    if (!content.trim()) {
      addToast({ type: 'error', message: 'Add some article content first' });
      return;
    }
    setExcerptLoading(true);
    const res = await generateAiExcerpt(content);
    if (res.success && res.data) {
      setExcerpt(res.data.excerpt);
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to generate excerpt' });
    }
    setExcerptLoading(false);
  };

  const handleSuggestTags = async () => {
    const content = getArticleContent();
    if (!content.trim()) {
      addToast({ type: 'error', message: 'Add some article content first' });
      return;
    }
    setTagsLoading(true);
    const res = await suggestAiTags(content, existingTagIds);
    if (res.success && res.data) {
      setSuggestedTagIds(res.data.suggestedTagIds);
      setSuggestedNewTags(res.data.suggestedNewTags);
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to suggest tags' });
    }
    setTagsLoading(false);
  };

  const handleCreateAndAddTag = async (name: string) => {
    setCreatingTagName(name);
    await onCreateAndAddTag(name);
    setSuggestedNewTags((prev) => prev.filter((n) => n !== name));
    setCreatingTagName(null);
  };

  const handleRewrite = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ').trim();
    if (!text) return;

    rewriteAbortRef.current?.abort();
    const controller = new AbortController();
    rewriteAbortRef.current = controller;

    setRewriteOptions([]);
    setRewriteLoading(true);

    let buffer = '';
    const res = await streamAiRewrite(
      text.slice(0, 500),
      (chunk) => {
        buffer += chunk;
        setRewriteOptions(
          buffer
            .split('---OPTION---')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      },
      controller.signal
    );

    if (!res.success) {
      addToast({ type: 'error', message: res.error || 'Rewrite failed' });
    }
    setRewriteLoading(false);
  };

  const handleUseRewrite = (text: string) => {
    if (!editor) return;
    editor.chain().focus().deleteSelection().insertContent(text).run();
    setRewriteOptions([]);
  };

  const visibleSuggestedTagIds = suggestedTagIds.filter((id) => !existingTagIds.includes(id));
  const tagNameById = new Map(allTags.map((t) => [t.id, t.name]));

  return (
    <div className="relative flex-shrink-0 h-full">
      {/* Floating toggle tab */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="absolute z-20 flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold uppercase tracking-wider border border-border rounded-l-lg transition-colors"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          right: isOpen ? '300px' : '0px',
          background: 'var(--bg2)',
          color: 'var(--accent)',
          borderRight: 'none',
        }}
      >
        AI <Sparkles className="w-3.5 h-3.5" />
      </button>

      {/* Panel */}
      <aside
        className="h-full border-l overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          width: isOpen ? '300px' : '0px',
          background: 'var(--bg2)',
          borderColor: isOpen ? 'var(--border)' : 'transparent',
        }}
      >
        <div style={{ width: '300px' }} className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="section-title-bar">AI ASSISTANT</div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-text-primary"
              aria-label="Close AI assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 px-4 py-3 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`genre-tag ${activeTab === tab.key ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-4 pb-5 space-y-3">
            {/* TAB 1 — HEADLINES */}
            {activeTab === 'headlines' && (
              <div className="space-y-3">
                <button
                  type="button"
                  className="btn-primary w-full justify-center"
                  onClick={handleGenerateHeadlines}
                  disabled={headlinesLoading}
                >
                  {headlinesLoading ? <Spinner className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Headlines
                </button>

                {headlinesLoading && (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="shimmer h-10 rounded" />
                    ))}
                  </div>
                )}

                {!headlinesLoading && headlines.length > 0 && (
                  <>
                    <ol className="space-y-2 list-decimal list-inside">
                      {headlines.map((h, i) => (
                        <li key={i} className="text-sm text-text-primary">
                          <span>{h}</span>
                          <button
                            type="button"
                            onClick={() => onUseHeadline(h)}
                            className="ml-2 text-xs font-semibold text-accent hover:underline whitespace-nowrap"
                          >
                            Use this
                          </button>
                        </li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      onClick={handleGenerateHeadlines}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-accent"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </>
                )}
              </div>
            )}

            {/* TAB 2 — EXCERPT */}
            {activeTab === 'excerpt' && (
              <div className="space-y-3">
                <button
                  type="button"
                  className="btn-primary w-full justify-center"
                  onClick={handleGenerateExcerpt}
                  disabled={excerptLoading}
                >
                  {excerptLoading ? <Spinner className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Write Excerpt
                </button>

                {excerptLoading && (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="shimmer h-4 rounded" />
                    ))}
                  </div>
                )}

                {!excerptLoading && excerpt && (
                  <>
                    <blockquote
                      className="text-sm text-text-primary italic px-3 py-2 border-l-2 rounded-r"
                      style={{ borderColor: 'var(--accent)', background: 'var(--bg3)' }}
                    >
                      {excerpt}
                    </blockquote>
                    <div className="text-xs" style={{ color: excerpt.length <= 200 ? 'var(--green)' : '#ef4444' }}>
                      {excerpt.length}/200 characters
                    </div>
                    <button
                      type="button"
                      onClick={() => onUseExcerpt(excerpt)}
                      className="btn-primary w-full justify-center"
                    >
                      <Check className="w-4 h-4" /> Copy to Excerpt Field
                    </button>
                  </>
                )}
              </div>
            )}

            {/* TAB 3 — TAGS */}
            {activeTab === 'tags' && (
              <div className="space-y-3">
                <button
                  type="button"
                  className="btn-primary w-full justify-center"
                  onClick={handleSuggestTags}
                  disabled={tagsLoading}
                >
                  {tagsLoading ? <Spinner className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Suggest Tags
                </button>

                {tagsLoading && (
                  <div className="flex flex-wrap gap-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="shimmer h-6 w-16 rounded" />
                    ))}
                  </div>
                )}

                {!tagsLoading && visibleSuggestedTagIds.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Existing Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {visibleSuggestedTagIds.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onAddTag(id)}
                          className="genre-tag flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> {tagNameById.get(id) || id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!tagsLoading && suggestedNewTags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">New Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedNewTags.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleCreateAndAddTag(name)}
                          disabled={creatingTagName === name}
                          className="genre-tag flex items-center gap-1"
                          style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.35)' }}
                        >
                          {creatingTagName === name ? (
                            <Spinner className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}{' '}
                          {name} · Create &amp; Add
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!tagsLoading && visibleSuggestedTagIds.length === 0 && suggestedNewTags.length === 0 && headlines.length === 0 && (
                  <p className="text-xs text-text-dim">Suggestions will appear here.</p>
                )}
              </div>
            )}

            {/* TAB 4 — REWRITE */}
            {activeTab === 'rewrite' && (
              <div className="space-y-3">
                <p className="text-xs text-text-muted">Select text in the editor, then click Rewrite.</p>
                <button
                  type="button"
                  className="btn-primary w-full justify-center"
                  onClick={handleRewrite}
                  disabled={!hasSelection || rewriteLoading}
                >
                  {rewriteLoading ? <Spinner className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Rewrite Selection
                </button>

                {rewriteLoading && rewriteOptions.length === 0 && (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="shimmer h-16 rounded" />
                    ))}
                  </div>
                )}

                {rewriteOptions.length > 0 && (
                  <div className="space-y-2">
                    {rewriteOptions.map((opt, i) => (
                      <div key={i} className="text-sm text-text-primary p-2 rounded border border-border" style={{ background: 'var(--bg3)' }}>
                        <p className="mb-2 whitespace-pre-wrap">{opt}</p>
                        <button
                          type="button"
                          onClick={() => handleUseRewrite(opt)}
                          className="text-xs font-semibold text-accent hover:underline"
                        >
                          Use this
                        </button>
                      </div>
                    ))}
                    {rewriteLoading && (
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Spinner className="w-3 h-3 animate-spin" /> Generating more options…
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
