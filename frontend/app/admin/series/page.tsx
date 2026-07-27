'use client';

import { useState, useEffect, useCallback, useRef } from 'react';import { Spinner } from '@/components/ui/Spinner';

import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen, Plus, Edit2, Trash2, X, GripVertical, ExternalLink,
  CheckCircle, Search, ChevronRight, ChevronDown, ArrowLeft,
} from 'lucide-react';
import {
  fetchAdminSeries, fetchAdminSeriesById, createSeries, updateSeries, deleteSeries,
  type SeriesSummary, type SeriesDetail, type SeriesArticleEntry,
} from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { slugify } from '@/lib/utils';

// --- Helpers ------------------------------------------------------------------
function StatusDot({ status }: { status: string }) {
  const color = status === 'PUBLISHED' ? '#22c55e' : status === 'DRAFT' ? '#64748b' : '#f59e0b';
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

// --- Create/Edit Modal --------------------------------------------------------
function SeriesFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: SeriesSummary | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { addToast } = useUIStore();
  const [name, setName] = useState(editing?.name ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(editing?.coverImageUrl ?? '');
  const [isComplete, setIsComplete] = useState(editing?.isComplete ?? false);
  const [saving, setSaving] = useState(false);
  const autoSlug = useRef(true);

  const handleNameChange = (v: string) => {
    setName(v);
    if (autoSlug.current) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { name, slug, description, coverImageUrl, isComplete };
    const res = editing
      ? await updateSeries(editing.id, payload)
      : await createSeries(payload);
    setSaving(false);
    if (res.success) {
      addToast({ type: 'success', message: editing ? 'Series updated' : 'Series created' });
      onSaved();
      onClose();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to save' });
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 520, padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {editing ? 'Edit Series' : 'New Series'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Series Name *</span>
            <input value={name} onChange={(e) => handleNameChange(e.target.value)} required style={inputStyle} placeholder="e.g. The Art of Game Design" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Slug</span>
            <input
              value={slug}
              onChange={(e) => { autoSlug.current = false; setSlug(e.target.value); }}
              style={inputStyle}
              placeholder="auto-generated-from-name"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What is this series about?" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Cover Image URL</span>
            <input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} style={inputStyle} placeholder="https://..." />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={isComplete} onChange={(e) => setIsComplete(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Mark as complete</span>
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ ...btnBase, background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...btnBase, background: 'var(--accent)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving && <Spinner size={13} className="animate-spin" />}
              {editing ? 'Save Changes' : 'Create Series'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Article Search & Add -----------------------------------------------------
function ArticleSearch({
  onSelect,
}: {
  onSelect: (articleId: string, title: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/posts?q=${encodeURIComponent(query)}&limit=8&status=PUBLISHED,DRAFT,APPROVED`);
        const json = await res.json();
        setResults(json.data?.articles || json.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }}>
        <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles to add..."
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)' }}
        />
        {loading && <Spinner size={13} className="animate-spin" style={{ color: 'var(--muted)' }} />}
      </div>
      {results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: 240, overflowY: 'auto' }}>
          {results.map((a: any) => (
            <button
              key={a.id}
              onClick={() => { onSelect(a.id, a.title); setQuery(''); setResults([]); }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <StatusDot status={a.status} />
              <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const }}>{a.title}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto', flexShrink: 0 }}>{a.contentType}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Series Detail Panel ------------------------------------------------------
function SeriesDetailPanel({
  seriesId,
  onBack,
  onRefreshList,
}: {
  seriesId: string;
  onBack: () => void;
  onRefreshList: () => void;
}) {
  const { addToast } = useUIStore();
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<SeriesArticleEntry[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAdminSeriesById(seriesId);
    if (res.success && res.data) {
      setSeries(res.data);
      setEntries(res.data.entries);
    }
    setLoading(false);
  }, [seriesId]);

  useEffect(() => { load(); }, [load]);

  // Drag-to-reorder
  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOver.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const newEntries = [...entries];
    const [moved] = newEntries.splice(dragItem.current, 1);
    newEntries.splice(dragOver.current, 0, moved);
    // Re-assign positions
    const reindexed = newEntries.map((e, i) => ({ ...e, position: i + 1 }));
    setEntries(reindexed);
    dragItem.current = null;
    dragOver.current = null;
  };

  const saveOrder = async () => {
    setSaving(true);
    const res = await updateSeries(seriesId, {
      entries: entries.map((e) => ({ id: e.id, position: e.position })),
    });
    setSaving(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Order saved' });
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to save order' });
    }
  };

  const handleAddArticle = async (articleId: string, title: string) => {
    const res = await updateSeries(seriesId, { addArticleId: articleId });
    if (res.success) {
      addToast({ type: 'success', message: `"${title}" added to series` });
      load();
    } else {
      addToast({ type: 'error', message: res.error || 'Already in series or not found' });
    }
  };

  const handleRemove = async (entryId: string) => {
    if (!confirm('Remove this article from the series?')) return;
    const res = await updateSeries(seriesId, { removeEntryId: entryId });
    if (res.success) {
      addToast({ type: 'success', message: 'Removed' });
      load();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to remove' });
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--muted)' }}>
      <Spinner size={48} className="animate-spin" />
    </div>
  );

  if (!series) return null;

  return (
    <div>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> Back to All Series
      </button>

      {/* Series Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 24 }}>
        {series.coverImageUrl && (
          <div style={{ width: 80, height: 55, borderRadius: 6, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
            <Image src={series.coverImageUrl} alt={series.name} fill style={{ objectFit: 'cover' }} unoptimized />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{series.name}</h2>
            {series.isComplete && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                Complete
              </span>
            )}
          </div>
          {series.description && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>{series.description}</p>}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>/series/{series.slug}</span>
            <Link href={`/series/${series.slug}`} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
              <ExternalLink size={11} /> View public
            </Link>
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>
          {entries.length} part{entries.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Article */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Add Article
        </h3>
        <ArticleSearch onSelect={handleAddArticle} />
      </div>

      {/* Entries */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Parts — Drag to reorder
        </h3>
        <button
          onClick={saveOrder}
          disabled={saving}
          style={{ ...btnBase, background: 'var(--accent)', color: '#fff', fontSize: 12, padding: '6px 14px', opacity: saving ? 0.7 : 1 }}
        >
          {saving && <Spinner size={12} className="animate-spin" />}
          Save Order
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entries.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No articles in this series yet.</p>
        )}
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 8,
              cursor: 'grab',
            }}
          >
            <GripVertical size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {entry.position}
            </span>
            {entry.article?.featuredImageUrl && (
              <div style={{ width: 52, height: 35, borderRadius: 4, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                <Image src={entry.article.featuredImageUrl} alt="" fill style={{ objectFit: 'cover' }} unoptimized />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {entry.displayTitle || entry.article?.title || '(no title)'}
              </p>
              {entry.article && (
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                  {entry.article.status} &nbsp;·&nbsp; {entry.article.contentType} &nbsp;·&nbsp;/articles/{entry.article.slug}
                </p>
              )}
            </div>
            {entry.article && (
              <Link href={`/admin/posts/${entry.article.slug}/edit`} style={{ color: 'var(--muted)', display: 'flex' }}>
                <ExternalLink size={13} />
              </Link>
            )}
            <button
              onClick={() => handleRemove(entry.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Shared Styles ------------------------------------------------------------
const inputStyle: React.CSSProperties = {
  padding: '9px 12px', fontSize: 13, background: 'var(--bg3)',
  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
  outline: 'none', width: '100%', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--muted)',
};
const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 18px', borderRadius: 8, border: 'none',
  cursor: 'pointer', fontWeight: 700, fontSize: 13,
  transition: 'opacity 0.15s',
};

// --- Main Page ----------------------------------------------------------------
export default function AdminSeriesPage() {
  const { addToast } = useUIStore();
  const [seriesList, setSeriesList] = useState<SeriesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<SeriesSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchAdminSeries();
    if (res.success && res.data) setSeriesList(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? All entries will be removed.`)) return;
    const res = await deleteSeries(id);
    if (res.success) {
      addToast({ type: 'success', message: 'Series deleted' });
      load();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to delete' });
    }
  };

  if (selectedId) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <BookOpen size={18} style={{ color: 'var(--accent)' }} />
          <h1 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Series Management
          </h1>
        </div>
        <SeriesDetailPanel
          seriesId={selectedId}
          onBack={() => setSelectedId(null)}
          onRefreshList={load}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={18} style={{ color: 'var(--accent)' }} />
          <h1 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Article Series
          </h1>
        </div>
        <button
          onClick={() => { setEditingSeries(null); setFormOpen(true); }}
          style={{ ...btnBase, background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={14} /> New Series
        </button>
      </div>

      {/* Modal */}
      {formOpen && (
        <SeriesFormModal
          editing={editingSeries}
          onClose={() => setFormOpen(false)}
          onSaved={load}
        />
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--muted)' }}>
          <Spinner size={18} className="animate-spin" /> Loading…
        </div>
      ) : seriesList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <BookOpen size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0 }}>No series yet. Create your first one!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {seriesList.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', background: 'var(--bg2)',
                border: '1px solid var(--border)', borderRadius: 10,
                transition: 'border-color 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Cover thumbnail */}
              <div style={{ width: 56, height: 38, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', position: 'relative' }}>
                {s.coverImageUrl ? (
                  <Image src={s.coverImageUrl} alt={s.name} fill style={{ objectFit: 'cover' }} unoptimized />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={16} style={{ color: 'var(--muted)', opacity: 0.4 }} />
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.name}</span>
                  {s.isComplete && <CheckCircle size={13} style={{ color: '#22c55e' }} />}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  {s.articleCount} part{s.articleCount !== 1 ? 's' : ''}
                  {s.authorName && <> &nbsp;·&nbsp; {s.authorName}</>}
                  &nbsp;·&nbsp; /series/{s.slug}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Link
                  href={`/series/${s.slug}`}
                  target="_blank"
                  style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--muted)', textDecoration: 'none' }}
                >
                  <ExternalLink size={13} />
                </Link>
                <button
                  onClick={() => { setEditingSeries(s); setFormOpen(true); }}
                  style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--muted)' }}
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => setSelectedId(s.id)}
                  style={{ ...btnBase, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: 12 }}
                >
                  Manage <ChevronRight size={12} />
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, cursor: 'pointer', color: '#f87171' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
