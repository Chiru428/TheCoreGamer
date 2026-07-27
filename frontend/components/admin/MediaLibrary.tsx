'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR from 'swr';
import { useUIStore } from '@/store/uiStore';
import { Trash2, Search, Image as ImageIcon, CheckCircle, Upload, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Asset {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  avifUrl?: string | null;
  folder?: string;
  context?: { alt?: string; caption?: string };
}

const jsonFetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function MediaLibrary({ onSelect }: { onSelect?: (url: string) => void }) {
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [altTextSearch, setAltTextSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const [tempAlt, setTempAlt] = useState('');

  const { addToast } = useUIStore();

  const query = new URLSearchParams();
  query.set('folder', 'thecoregamer');
  if (search) query.set('search', search);
  if (altTextSearch) query.set('altText', altTextSearch);

  const { data, error, mutate, isLoading } = useSWR(
    `/api/upload/media-library?${query.toString()}`,
    jsonFetcher
  );

  const assets: Asset[] = data?.data?.assets || [];

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} assets permanently?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/upload/media-library/bulk-delete', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicIds: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ type: 'success', message: `Deleted ${json.data?.deleted?.length || 0} assets` });
        setSelectedIds(new Set());
        mutate();
      } else {
        addToast({ type: 'error', message: json.error || 'Delete failed' });
      }
    } catch {
      addToast({ type: 'error', message: 'Network error — could not delete assets' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateAlt = async (publicId: string) => {
    try {
      const res = await fetch('/api/upload/media-library/alt-text', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, altText: tempAlt }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ type: 'success', message: 'Alt text updated' });
        setEditingAlt(null);
        mutate();
      } else {
        addToast({ type: 'error', message: json.error || 'Failed to update' });
      }
    } catch {
      addToast({ type: 'error', message: 'Network error — could not update alt text' });
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-bg-surface border border-border p-4 rounded-xl">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filenames..."
            className="w-full bg-transparent border-none outline-none text-sm text-text-primary"
          />
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <ImageIcon className="w-4 h-4 text-text-muted" />
          <input
            value={altTextSearch}
            onChange={(e) => setAltTextSearch(e.target.value)}
            placeholder="Search alt text..."
            className="w-full bg-transparent border-none outline-none text-sm text-text-primary"
          />
        </div>
        <div className="h-6 w-px bg-border" />
        {selectedIds.size > 0 && (
          <Button variant="danger" size="sm" onClick={handleBulkDelete} loading={isDeleting} icon={<Trash2 className="w-4 h-4" />}>
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-48 shrink-0 flex flex-col gap-1 border-r border-border pr-4">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-2">Folders</h3>
          <button
            onClick={() => setActiveFolder(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              activeFolder === null ? 'bg-accent/10 text-accent font-medium' : 'text-text-primary hover:bg-bg-surface'
            }`}
          >
            All files
          </button>
          {[...new Set(assets.map(a => a.folder).filter(Boolean))].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFolder(f as string)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                activeFolder === f ? 'bg-accent/10 text-accent font-medium' : 'text-text-primary hover:bg-bg-surface'
              }`}
              title={f as string}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid Container */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Spinner className="w-8 h-8 animate-spin text-accent" /></div>
          ) : error ? (
            <div className="p-12 text-center text-danger">Failed to load media</div>
          ) : assets.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border rounded-xl text-text-muted">
              No media found.
            </div>
          ) : (() => {
            const filtered = activeFolder ? assets.filter(a => a.folder === activeFolder) : assets;
            if (filtered.length === 0) {
              return (
                <div className="p-12 text-center border-2 border-dashed border-border rounded-xl text-text-muted">
                  No media found in this folder.
                </div>
              );
            }
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map((asset) => (
                  <div key={asset.public_id} className={`group relative rounded-xl border overflow-hidden transition-all duration-200 ${selectedIds.has(asset.public_id) ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-text-muted'}`}>
              <div 
                className="aspect-video bg-bg-elevated cursor-pointer"
                onClick={() => onSelect ? onSelect(asset.secure_url) : toggleSelect(asset.public_id)}
              >
                <picture>
                  {asset.avifUrl && <source srcSet={asset.avifUrl} type="image/avif" />}
                  <source srcSet={asset.secure_url} type="image/webp" />
                  <img src={asset.secure_url} alt={asset.context?.alt || asset.public_id} className="w-full h-full object-cover" loading="lazy" />
                </picture>
              </div>
              
              <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleSelect(asset.public_id)}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${selectedIds.has(asset.public_id) ? 'bg-accent text-white' : 'bg-black/40 text-white/50 hover:bg-black/60 hover:text-white'}`}
                >
                  {selectedIds.has(asset.public_id) && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-2 bg-bg-surface border-t border-border">
                {editingAlt === asset.public_id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      autoFocus
                      value={tempAlt}
                      onChange={(e) => setTempAlt(e.target.value)}
                      placeholder="Alt text..."
                      className="w-full px-2 py-1 text-xs bg-bg-primary border border-border rounded outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateAlt(asset.public_id);
                        if (e.key === 'Escape') setEditingAlt(null);
                      }}
                    />
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditingAlt(null)} className="p-1 text-text-muted hover:text-text-primary"><X className="w-3 h-3" /></button>
                      <button onClick={() => handleUpdateAlt(asset.public_id)} className="px-2 py-1 text-[10px] bg-accent text-white rounded">Save</button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-xs text-text-muted truncate cursor-pointer hover:text-accent-light"
                    title="Click to edit alt text"
                    onClick={(e) => { e.stopPropagation(); setTempAlt(asset.context?.alt || ''); setEditingAlt(asset.public_id); }}
                  >
                    {asset.context?.alt || <span className="italic opacity-50">No alt text (click to add)</span>}
                  </div>
                )}
                <div className="text-[10px] text-text-dim mt-1 truncate font-mono">
                  {asset.public_id.split('/').pop()}
                </div>
              </div>
                </div>
              ))}
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
