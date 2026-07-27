'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ListPlus, ListChecks, Plus, Check, Loader2, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { fetchUserLists, fetchUserList, createReadingList, addItemToList, removeItemFromList } from '@/lib/api';

interface SaveToListDropdownProps {
  articleId?: string;
  gameId?: string;
}

interface ListWithMembership {
  id: string;
  name: string;
  /** ReadingListItem id if this content is already saved to the list, else null */
  itemId: string | null;
}

export default function SaveToListDropdown({ articleId, gameId }: SaveToListDropdownProps) {
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const { data, mutate, isLoading } = useSWR(
    isAuthenticated ? ['user-lists-with-items', articleId, gameId] : null,
    async () => {
      const listsRes = await fetchUserLists();
      const lists = listsRes.data ?? [];
      const detailed: ListWithMembership[] = await Promise.all(
        lists.map(async (list) => {
          const detail = await fetchUserList(list.id);
          const item = detail.data?.items?.find(
            (it) => (articleId && it.articleId === articleId) || (gameId && it.gameId === gameId)
          );
          return { id: list.id, name: list.name, itemId: item?.id ?? null };
        })
      );
      return detailed;
    }
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Optimistic toggle: flip the checkbox in the local cache immediately, then
  // sync with the server in the background — no blocking N+1 refetch. Mirrors
  // BookmarkButton so it feels instant.
  const handleToggle = async (list: ListWithMembership) => {
    // Ignore lists that only exist optimistically (still being created on the
    // server) — toggling their placeholder id would 404 with "List not found".
    if (list.id.startsWith('temp-')) return;
    if (busy === list.id) return;
    const wasSaved = !!list.itemId;
    const prevItemId = list.itemId;
    setBusy(list.id);

    mutate(
      (cur) => (cur ?? []).map((l) =>
        l.id === list.id ? { ...l, itemId: wasSaved ? null : `optimistic-${Date.now()}` } : l
      ),
      { revalidate: false }
    );

    try {
      if (wasSaved) {
        const res = await removeItemFromList(list.id, prevItemId!);
        if (!res.success) throw new Error(res.error || 'Failed to remove item');
        addToast({ type: 'success', message: `Removed from "${list.name}"` });
      } else {
        const res = await addItemToList(list.id, { articleId, gameId });
        if (!res.success) throw new Error(res.error || 'Failed to save item');
        // Record the real item id (needed for a later remove) without a refetch.
        const realItemId = res.data?.id ?? `saved-${Date.now()}`;
        mutate(
          (cur) => (cur ?? []).map((l) => (l.id === list.id ? { ...l, itemId: realItemId } : l)),
          { revalidate: false }
        );
        addToast({ type: 'success', message: `Saved to "${list.name}"` });
      }
    } catch (err) {
      // Roll back to the previous membership on failure.
      mutate(
        (cur) => (cur ?? []).map((l) => (l.id === list.id ? { ...l, itemId: prevItemId } : l)),
        { revalidate: false }
      );
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update list' });
    } finally {
      setBusy(null);
    }
  };

  // Optimistic create: show the new (already-saved) list and close the input
  // right away, then create it + add the item in the background.
  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || busy === 'create') return;
    const tempId = `temp-${Date.now()}`;
    setBusy('create');

    mutate(
      (cur) => [...(cur ?? []), { id: tempId, name, itemId: `optimistic-${Date.now()}` }],
      { revalidate: false }
    );
    setNewName('');
    setCreating(false);

    try {
      const res = await createReadingList({ name });
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to create list');
      const listId = res.data.id;
      const addRes = await addItemToList(listId, { articleId, gameId });
      const realItemId = addRes.success ? (addRes.data?.id ?? `saved-${Date.now()}`) : null;
      // Swap the temp entry for the real list id.
      mutate(
        (cur) => (cur ?? []).map((l) => (l.id === tempId ? { id: listId, name, itemId: realItemId } : l)),
        { revalidate: false }
      );
      addToast({ type: 'success', message: `Created "${name}" and saved` });
    } catch (err) {
      // Remove the optimistic entry on failure.
      mutate((cur) => (cur ?? []).filter((l) => l.id !== tempId), { revalidate: false });
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create list' });
    } finally {
      setBusy(null);
    }
  };

  const isSaved = (data ?? []).some((l) => l.itemId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full text-white text-[13px] font-semibold whitespace-nowrap transition-transform hover:scale-105"
        style={{ backgroundColor: isSaved ? 'var(--accent)' : '#6b7280' }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={isSaved ? 'In your lists' : 'Add to list'}
        title={isSaved ? 'In your lists' : 'Add to list'}
      >
        {isSaved ? <ListChecks className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
        <span>{isSaved ? 'In your lists' : 'Add to list'}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden z-50"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
          role="menu"
        >
          {!isAuthenticated ? (
            <div className="p-4 text-sm" style={{ color: 'var(--text)' }}>
              <Link href="/auth/login" className="text-accent hover:underline">Sign in</Link> to save this to a list.
            </div>
          ) : (
            <>
              <div className="p-1.5 max-h-64 overflow-y-auto">
                {isLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
                {!isLoading && (data?.length ?? 0) === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No lists yet. Create one below.</p>
                )}
                {data?.map((list) => (
                  <label
                    key={list.id}
                    className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-xl cursor-pointer transition-all hover:bg-accent-dim"
                    style={{ color: 'var(--text)' }}
                  >
                    <input
                      type="checkbox"
                      checked={!!list.itemId}
                      onChange={() => handleToggle(list)}
                      disabled={busy === list.id || list.id.startsWith('temp-')}
                      className="w-4 h-4 accent-[var(--accent)]"
                    />
                    <span className="flex-1 truncate">{list.name}</span>
                    {(busy === list.id || list.id.startsWith('temp-')) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  </label>
                ))}
              </div>
              <div className="p-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                {creating ? (
                  <div className="flex items-center gap-2 p-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      placeholder="List name"
                      maxLength={100}
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg outline-none"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                    <button
                      onClick={handleCreate}
                      disabled={busy === 'create' || !newName.trim()}
                      className="p-1.5 rounded-lg text-accent hover:bg-accent-dim disabled:opacity-50"
                    >
                      {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setCreating(false); setNewName(''); }}
                      className="p-1.5 rounded-lg hover:bg-accent-dim"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all hover:bg-accent-dim"
                    style={{ color: 'var(--text)' }}
                  >
                    <Plus className="w-4 h-4 opacity-70" /> Create new list
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
