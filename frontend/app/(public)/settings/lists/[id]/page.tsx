'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Reorder } from 'framer-motion';
import { ChevronLeft, GripVertical, X, Loader2, Globe, Lock } from 'lucide-react';
import { fetchUserList, removeItemFromList, reorderListItems } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import PostCard from '@/components/blog/PostCard';
import ReadingListGameCard from '@/components/public/lists/ReadingListGameCard';
import type { ReadingListItem } from '@/types';

export default function ListDetailPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { addToast } = useUIStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?callbackUrl=/settings/lists/${id}`);
    }
  }, [isLoading, isAuthenticated, router, id]);

  const { data: list, isLoading: listLoading, mutate } = useSWR(
    isAuthenticated ? `user-list-${id}` : null,
    () => fetchUserList(id).then((r) => r.data ?? null)
  );

  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (list?.items) setItems(list.items);
  }, [list]);

  if (!isAuthenticated) return null;

  const handleReorder = async (newOrder: ReadingListItem[]) => {
    setItems(newOrder);
    const res = await reorderListItems(id, newOrder.map((it) => it.id));
    if (!res.success) {
      addToast({ type: 'error', message: 'Failed to save order' });
      mutate();
    }
  };

  const handleRemove = async (item: ReadingListItem) => {
    setRemovingId(item.id);
    const res = await removeItemFromList(id, item.id);
    setRemovingId(null);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      addToast({ type: 'success', message: 'Item removed' });
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to remove item' });
    }
  };

  if (listLoading) {
    return (
      <div className="w-full px-4 py-8 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl shimmer" />)}
      </div>
    );
  }

  if (!list) {
    return (
      <div className="w-full px-4 py-8">
        <p className="text-text-muted mb-2">List not found.</p>
        <Link href="/settings/lists" className="text-accent hover:underline text-sm">Back to lists</Link>
      </div>
    );
  }

  return (
    <div className="w-full px-4 pt-0 pb-8">
      <Link href="/settings/lists" className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors mb-6 font-medium">
        <ChevronLeft className="w-5 h-5 -ml-1" /> Back to lists
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-3xl font-bold text-text-primary">{list.name}</h1>
      </div>
      <p className="text-text-muted mb-6">{list.description || `${items.length} ${items.length === 1 ? 'item' : 'items'}`}</p>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-bg-surface border border-border rounded-2xl">
          <p className="text-text-muted">This list is empty. Use &quot;Save to list&quot; on an article or game to add items here.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-text-muted mb-2">Drag items to reorder.</p>
          <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-2">
            {items.map((item) => (
              <Reorder.Item key={item.id} value={item} className="flex items-center gap-2 bg-bg-surface border border-border rounded-xl px-2">
                <GripVertical className="w-4 h-4 text-text-muted cursor-grab shrink-0" />
                <div className="flex-1 min-w-0">
                  {item.article ? (
                    <PostCard article={item.article} variant="small" showBadge={true} />
                  ) : item.game ? (
                    <ReadingListGameCard game={item.game} />
                  ) : null}
                </div>
                <button
                  onClick={() => handleRemove(item)}
                  disabled={removingId === item.id}
                  className="p-2 text-text-muted hover:text-danger transition-colors shrink-0"
                  aria-label="Remove from list"
                >
                  {removingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </>
      )}
    </div>
  );
}
