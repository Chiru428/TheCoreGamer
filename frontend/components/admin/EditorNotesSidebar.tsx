'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR from 'swr';
import { MessageSquare, Send } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

interface EditorNote {
  id: string;
  content: string;
  createdAt: string;
  User: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

const API_BASE =
  typeof window === 'undefined'
    ? process.env.BACKEND_URL || 'http://localhost:3001'
    : '';

const apiFetcher = (url: string) =>
  fetch(`${API_BASE}${url}`, { credentials: 'include' }).then(r => r.json());

export default function EditorNotesSidebar({ slug }: { slug: string }) {
  const { addToast } = useUIStore();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, error, mutate, isLoading } = useSWR<{ data: EditorNote[] }>(
    slug ? `/api/articles/${slug}/notes` : null,
    apiFetcher
  );

  const notes = data?.data || [];

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/articles/${slug}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setNewNote('');
        mutate();
      } else {
        addToast({ type: 'error', message: json.error || 'Failed to add note' });
      }
    } catch {
      addToast({ type: 'error', message: 'Network error — could not add note' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!slug) return null;

  return (
    <div className="bg-bg-surface border border-border rounded-xl flex flex-col max-h-[500px]">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-sm text-text-primary">Internal Editor Notes</h3>
        <span className="ml-auto text-xs font-mono bg-bg-elevated px-2 py-0.5 rounded-full text-text-muted">
          {notes.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-bg-primary/50">
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner className="w-5 h-5 animate-spin text-text-muted" /></div>
        ) : error ? (
          <div className="text-xs text-danger text-center">Failed to load notes</div>
        ) : notes.length === 0 ? (
          <div className="text-xs text-text-dim text-center italic py-4">No notes yet. Add one below.</div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-bg-elevated rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                {note.User.avatarUrl ? (
                  <img src={note.User.avatarUrl} alt={note.User.displayName} className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold">
                    {note.User.displayName.charAt(0)}
                  </div>
                )}
                <span className="text-xs font-semibold text-text-primary">{note.User.displayName}</span>
                <span className="text-[10px] text-text-dim ml-auto">
                  {new Date(note.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-text-muted whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-border bg-bg-surface">
        <div className="relative">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type a note (internal only)..."
            className="w-full bg-bg-primary border border-border rounded-lg pl-3 pr-10 py-2 text-xs text-text-primary outline-none focus:border-accent resize-none h-16"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote();
            }}
          />
          <button
            type="button"
            onClick={handleAddNote}
            disabled={!newNote.trim() || isSubmitting}
            className="absolute right-2 bottom-2 p-1.5 bg-accent text-white rounded-md disabled:opacity-50 hover:bg-accent-light transition-colors"
          >
            {isSubmitting ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[9px] text-text-dim mt-1 text-right">Cmd/Ctrl + Enter to send</p>
      </div>
    </div>
  );
}
