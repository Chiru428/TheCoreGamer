'use client';

import { useState, useEffect } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR from 'swr';
import { useUIStore } from '@/store/uiStore';
import { Users, Search, Plus, Trash2, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Author {
  userId: string;
  isPrimary: boolean;
  role: string;
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

/** MISMATCH-05: Use API_BASE so SSR and cross-origin deployments work correctly */
const apiFetcher = (url: string) =>
  fetch(`${API_BASE}${url}`, { credentials: 'include' }).then(r => r.json());

async function apiMutateRaw(url: string, method: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export default function BylineManager({ slug }: { slug: string }) {
  const { addToast } = useUIStore();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data, error, isLoading } = useSWR<{ data: Author[] }>(
    slug ? `/api/articles/${slug}/authors` : null,
    apiFetcher
  );

  useEffect(() => {
    if (data?.data) {
      setAuthors(data.data);
    }
  }, [data]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (search.trim().length >= 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`${API_BASE}/api/admin/users?search=${encodeURIComponent(search)}&role=AUTHOR,EDITOR,ADMIN&limit=10`, { credentials: 'include' });
          const json = await res.json();
          if (json.success) setSearchResults(json.data || []);
        } catch {}
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleAdd = (user: any) => {
    if (authors.some(a => a.userId === user.id)) return;
    setAuthors(prev => [...prev, {
      userId: user.id,
      isPrimary: prev.length === 0, // First one is primary by default
      role: user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()) : 'Author',
      User: user
    }]);
    setSearch('');
    setSearchResults([]);
  };

  const handleRemove = (userId: string) => {
    setAuthors(prev => {
      const next = prev.filter(a => a.userId !== userId);
      // Ensure there's a primary if possible
      if (next.length > 0 && !next.some(a => a.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const setPrimary = (userId: string) => {
    setAuthors(prev => prev.map(a => ({
      ...a,
      isPrimary: a.userId === userId
    })));
  };

  const updateRole = (userId: string, role: string) => {
    setAuthors(prev => prev.map(a => a.userId === userId ? { ...a, role } : a));
  };

  const handleSave = async () => {
    if (authors.length === 0) {
      addToast({ type: 'error', message: 'At least one author is required' });
      return;
    }
    setIsSaving(true);
    try {
      const json = await apiMutateRaw(`/api/articles/${slug}/authors`, 'PUT', {
        authors: authors.map(a => ({ userId: a.userId, isPrimary: a.isPrimary, role: a.role }))
      });
      if (json.success) {
        addToast({ type: 'success', message: 'Bylines updated' });
      } else {
        addToast({ type: 'error', message: json.error || 'Failed to update bylines' });
      }
    } catch {
      addToast({ type: 'error', message: 'Network error — could not save bylines' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!slug) return null;

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" /> Manage Bylines & Authors
        </h3>
        {authors !== data?.data && (
          <Button size="sm" onClick={handleSave} loading={isSaving}>Save Authors</Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4"><Spinner className="w-5 h-5 animate-spin text-text-muted" /></div>
      ) : error ? (
        <div className="text-danger text-xs text-center">Failed to load authors</div>
      ) : (
        <div className="space-y-2">
          {authors.map((author) => (
            <div key={author.userId} className={`flex items-center gap-3 p-2 border rounded-lg ${author.isPrimary ? 'border-accent bg-accent/5' : 'border-border bg-bg-elevated'}`}>
              <div className="w-8 h-8 shrink-0 rounded-full bg-bg-primary overflow-hidden border border-border flex items-center justify-center">
                {author.User.avatarUrl ? (
                  <img src={author.User.avatarUrl} alt={author.User.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold">{author.User.displayName.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{author.User.displayName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    value={author.role}
                    onChange={e => updateRole(author.userId, e.target.value)}
                    placeholder="e.g. Guest Writer"
                    className="text-[10px] px-1.5 py-0.5 bg-bg-primary border border-border rounded outline-none w-24 focus:border-accent"
                  />
                  {author.isPrimary && (
                    <span className="text-[9px] bg-accent text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Primary</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {!author.isPrimary && (
                  <button onClick={() => setPrimary(author.userId)} className="p-1.5 text-text-muted hover:text-accent transition-colors" title="Set as Primary">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {authors.length > 1 && (
                  <button onClick={() => handleRemove(author.userId)} className="p-1.5 text-danger hover:text-red-400 transition-colors" title="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Author Search */}
          <div className="relative mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users to add as co-author..."
                className="w-full pl-9 pr-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
              />
              {isSearching && <Spinner className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-text-muted" />}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-bg-surface border border-border rounded-lg shadow-xl overflow-hidden max-h-48 custom-scrollbar">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleAdd(u)}
                    disabled={authors.some(a => a.userId === u.id)}
                    className="w-full flex items-center justify-between p-2 hover:bg-bg-elevated transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.displayName} className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-[10px] font-bold">{u.displayName?.charAt(0) || '?'}</div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-text-primary">{u.displayName}</p>
                        <p className="text-[10px] text-text-muted">@{u.username}</p>
                      </div>
                    </div>
                    {!authors.some(a => a.userId === u.id) && <Plus className="w-4 h-4 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
