'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { fetchUserLists, createReadingList, updateReadingList, deleteReadingList } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ListChecks, Plus, Pencil, Trash2, Globe, Lock, ChevronRight } from 'lucide-react';
import type { ReadingList } from '@/types';

interface ListFormState {
  name: string;
  description: string;
  isPublic: boolean;
}

const EMPTY_FORM: ListFormState = { name: '', description: '', isPublic: false };

export default function SettingsListsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { addToast } = useUIStore();
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReadingList | null>(null);
  const [form, setForm] = useState<ListFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/settings/lists');
    }
  }, [isLoading, isAuthenticated, router]);

  // Close the delete-confirm popover on outside click or Escape.
  useEffect(() => {
    if (!confirmingId) return;
    const onDown = (e: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) setConfirmingId(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmingId(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [confirmingId]);

  const { data: lists, isLoading: listsLoading, mutate } = useSWR(
    isAuthenticated ? 'user-lists' : null,
    () => fetchUserLists().then((r) => r.data ?? [])
  );

  if (!isAuthenticated) return null;

  const openCreateModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (list: ReadingList) => {
    setEditing(list);
    setForm({ name: list.name, description: list.description ?? '', isPublic: list.isPublic });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      addToast({ type: 'error', message: 'List name is required' });
      return;
    }
    setSaving(true);
    const payload = { name, description: form.description.trim() || undefined, isPublic: form.isPublic };
    const res = editing
      ? await updateReadingList(editing.id, { ...payload, description: payload.description ?? null })
      : await createReadingList(payload);
    setSaving(false);
    if (res.success) {
      addToast({ type: 'success', message: editing ? 'List updated' : 'List created' });
      setModalOpen(false);
      mutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to save list' });
    }
  };

  const handleDelete = async (list: ReadingList) => {
    setConfirmingId(null);
    setDeletingId(list.id);
    const res = await deleteReadingList(list.id);
    setDeletingId(null);
    if (res.success) {
      addToast({ type: 'success', message: 'List deleted' });
      mutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to delete list' });
    }
  };

  // Shared row class
  const rowCls = 'flex items-center gap-4 px-5 py-4 border-b border-border dark:border-white/[0.07] last:border-0 transition-colors';

  return (
    <div className="w-full space-y-6" style={{ fontFamily: "'Gibson', sans-serif" }}>
      
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-[18px] font-bold text-text-primary">Reading Lists</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Organize articles and games into custom collections.</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal} className="shrink-0 whitespace-nowrap">New List</Button>
      </div>

      {listsLoading ? (
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={rowCls}>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-32 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : !lists?.length ? (
        <div className="rounded-xl border border-border dark:border-white/[0.08] py-16 text-center">
          <ListChecks className="w-12 h-12 text-text-muted mb-4 mx-auto" />
          <p className="text-[16px] font-semibold text-text-primary">No lists yet</p>
          <p className="text-[14px] text-text-muted mt-1 mb-4">Create collections of your favorite content.</p>
          <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>Create your first list</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          {lists.map((list) => (
            <div key={list.id} className={rowCls + ' group hover:bg-black/5 dark:hover:bg-white/[0.02]'}>
              <Link href={`/settings/lists/${list.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-[15px] text-text-primary truncate group-hover:text-accent transition-colors">{list.name}</p>
                </div>
                {list.description && <p className="text-[13px] text-text-muted truncate mb-1">{list.description}</p>}
                <p className="text-[12px] text-text-muted">{list.itemCount ?? 0} {list.itemCount === 1 ? 'item' : 'items'}</p>
              </Link>
              
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={() => openEditModal(list)} aria-label="Edit list" />
                <div className="relative" ref={confirmingId === list.id ? confirmRef : undefined}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="w-4 h-4" />}
                    loading={deletingId === list.id}
                    onClick={() => setConfirmingId((id) => (id === list.id ? null : list.id))}
                    className="text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    aria-label="Delete list"
                    aria-haspopup="dialog"
                    aria-expanded={confirmingId === list.id}
                  />
                  {confirmingId === list.id && (
                    <div
                      className="absolute right-0 top-full mt-2 w-64 z-50 rounded-xl border border-border p-4 shadow-2xl"
                      style={{ background: 'var(--bg3)' }}
                      role="dialog"
                      aria-label="Confirm delete list"
                    >
                      <p className="text-[14px] text-text-primary mb-3">
                        Delete <span className="font-semibold">&ldquo;{list.name}&rdquo;</span>? This cannot be undone.
                      </p>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>Cancel</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(list)}>Delete</Button>
                      </div>
                    </div>
                  )}
                </div>
                <Link href={`/settings/lists/${list.id}`} className="p-2 text-text-muted hover:text-text-primary transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit List' : 'New List'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-text-primary mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={100}
              placeholder="e.g. Must-Play RPGs"
              className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 text-black dark:text-white rounded-xl px-4 py-3 text-[14px] outline-none transition-all placeholder:text-gray-400"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[14px] font-medium text-text-primary mb-1.5">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={500}
              rows={3}
              placeholder="What's this list about?"
              className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 text-black dark:text-white rounded-xl px-4 py-3 text-[14px] outline-none transition-all placeholder:text-gray-400 resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} variant="auth" onClick={handleSave}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
