'use client';

import useSWR from 'swr';import { Spinner } from '@/components/ui/Spinner';

import { useState } from 'react';
import { fetchTags, createTag, updateTag, deleteTag } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, X, Trash2, Pencil } from 'lucide-react';

interface Tag { id: string; name: string; slug: string; description?: string | null; color?: string | null; _count?: { ArticleTag: number } }

const DEFAULT_COLOR = '#7b5cfa';

function DeletableTag({ tag, onDeleted, onEdit }: { tag: Tag; onDeleted: () => void; onEdit: (t: Tag) => void }) {
  const { addToast } = useUIStore();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteTag(tag.id);
    setDeleting(false);
    if (res.success) {
      addToast({ type: 'success', message: `Tag "${tag.name}" deleted` });
      onDeleted();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to delete tag' });
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 border border-red-500/40 text-red-400">
        <Trash2 className="w-3 h-3" />
        <span>Delete "{tag.name}"?</span>
        <button onClick={handleDelete} disabled={deleting} className="ml-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
          {deleting ? '...' : 'Yes'}
        </button>
        <button onClick={() => setConfirming(false)} disabled={deleting} className="px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted text-[10px] font-bold hover:text-text-primary transition-colors">
          No
        </button>
      </div>
    );
  }

  return (
    <div
      className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
      style={{
        background: tag.color ? `${tag.color}18` : 'var(--accent-muted, rgba(123,92,250,0.1))',
        borderColor: tag.color ? `${tag.color}40` : 'var(--accent-border, rgba(123,92,250,0.2))',
        color: tag.color ?? 'var(--accent-light)',
      }}
    >
      {tag.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tag.color }} />}
      <span>{tag.name}</span>
      {tag._count !== undefined && <span className="opacity-70">({tag._count.ArticleTag})</span>}
      {/* MINOR-02: Edit button wired to updateTag */}
      <button onClick={() => onEdit(tag)} title={`Edit tag "${tag.name}"`} className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-accent transition-all">
        <Pencil className="w-3 h-3" />
      </button>
      <button onClick={() => setConfirming(true)} title={`Delete tag "${tag.name}"`} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function AdminTagsPage() {
  const { addToast } = useUIStore();
  const { data, mutate, isLoading } = useSWR('admin-tags', () => fetchTags().then(r => r.data || []));

  const [newTag, setNewTag] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCreate = async () => {
    if (!newTag.trim()) return;
    setCreating(true);
    const res = await createTag({ name: newTag.trim(), description: newDescription.trim() || undefined, color: newColor || undefined });
    setCreating(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Tag created' });
      setNewTag(''); setNewDescription(''); setNewColor('');
      mutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed' });
    }
  };

  const openEdit = (tag: Tag) => {
    setEditTarget(tag);
    setEditName(tag.name);
    setEditDescription(tag.description || '');
    setEditColor(tag.color || '');
  };

  const handleUpdate = async () => {
    if (!editTarget || !editName.trim()) return;
    setIsUpdating(true);
    const res = await updateTag(editTarget.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      color: editColor || undefined,
    });
    setIsUpdating(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Tag updated' });
      setEditTarget(null);
      mutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to update tag' });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Tags</h1>

      {/* Create form */}
      <div className="bg-bg-surface border border-border rounded-xl p-5 mb-8 space-y-4 max-w-lg">
        <h2 className="text-sm font-semibold text-text-primary">New Tag</h2>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Name <span className="text-red-400">*</span></label>
          <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="e.g. open-world" onKeyDown={e => e.key === 'Enter' && handleCreate()} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Description <span className="text-text-dim">(optional)</span></label>
          <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Short description shown on the tag landing page…" maxLength={300} rows={2} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent resize-none" />
          <p className="text-[11px] text-text-dim mt-0.5">{newDescription.length}/300</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Accent color <span className="text-text-dim">(optional)</span></label>
          <div className="flex items-center gap-2">
            <input type="color" value={newColor || DEFAULT_COLOR} onChange={e => setNewColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer border border-border bg-transparent p-0.5 shrink-0" />
            <input value={newColor} onChange={e => setNewColor(e.target.value)} placeholder="#7b5cfa" maxLength={7} className="w-32 px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent font-mono" />
            {newColor && <button onClick={() => setNewColor('')} className="text-xs text-text-dim hover:text-text-muted transition-colors">Clear</button>}
          </div>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleCreate} loading={creating}>Add Tag</Button>
      </div>

      {/* Tag list */}
      <div className="flex flex-wrap gap-2">
        {isLoading && (
          <div className="w-full p-8 flex flex-col items-center justify-center text-text-muted">
            <Spinner className="w-6 h-6 animate-spin mb-2 text-accent" />
            <p className="text-xs">Loading tags...</p>
          </div>
        )}
        {!isLoading && (data || []).map((t: Tag) => (
          <DeletableTag key={t.id} tag={t} onDeleted={() => mutate()} onEdit={openEdit} />
        ))}
        {!isLoading && (!data || data.length === 0) && <p className="text-sm text-text-muted italic">No tags yet. Create one above.</p>}
      </div>

      {/* Edit Modal — MINOR-02 */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Tag">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} maxLength={300} rows={2} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Accent color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={editColor || DEFAULT_COLOR} onChange={e => setEditColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer border border-border bg-transparent p-0.5 shrink-0" />
              <input value={editColor} onChange={e => setEditColor(e.target.value)} placeholder="#7b5cfa" maxLength={7} className="w-32 px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent font-mono" />
              {editColor && <button onClick={() => setEditColor('')} className="text-xs text-text-dim hover:text-text-muted">Clear</button>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" loading={isUpdating} onClick={handleUpdate}>Update Tag</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
