'use client';

import { useState, useEffect } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR from 'swr';
import Image from 'next/image';
import { fetchGames, fetchGame, createGame, updateGame, deleteGame, fetchAdminScreenshots, updateScreenshotStatus, deleteScreenshot } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ImageUploader from '@/components/admin/ImageUploader';
import IgdbSearch, { type IgdbGameData, type IgdbWebsiteLinks } from '@/components/admin/IgdbSearch';
import { revalidateGamePage } from '@/app/admin/actions';
import { formatRelativeDate } from '@/lib/utils';
import { Plus, Pencil, Trash2, ExternalLink, RefreshCw, Check, X, Camera, Copy } from 'lucide-react';

// --- Screenshot moderation queue ----------------------------------------------

function ScreenshotModerationQueue() {
  const { addToast } = useUIStore();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [screenshotToDelete, setScreenshotToDelete] = useState<string | null>(null);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const { data, mutate, isLoading } = useSWR(
    ['admin-screenshots', statusFilter],
    () => fetchAdminScreenshots({ status: statusFilter })
  );
  const screenshots = data?.data || [];

  const handleAction = async (id: string, status: string) => {
    const res = await updateScreenshotStatus(id, status);
    if (res.success) { 
      addToast({ type: 'success', message: `Screenshot ${status.toLowerCase()}` }); 
      mutate(); 
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; }); 
    } else {
      addToast({ type: 'error', message: res.error || 'Failed' });
    }
  };

  const confirmDelete = async () => {
    if (isDeletingBulk) {
      if (selectedIds.size === 0) return;
      setIsBulkLoading(true);
      let count = 0;
      await Promise.all(Array.from(selectedIds).map(async (id) => {
        const res = await deleteScreenshot(id);
        if (res.success) count++;
      }));
      addToast({ type: 'success', message: `Permanently deleted ${count} screenshot(s)` });
      setSelectedIds(new Set());
      mutate();
      setIsBulkLoading(false);
      setIsDeletingBulk(false);
    } else {
      if (!screenshotToDelete) return;
      const res = await deleteScreenshot(screenshotToDelete);
      if (res.success) {
        addToast({ type: 'success', message: 'Screenshot permanently deleted' });
        mutate();
        setSelectedIds(prev => { const n = new Set(prev); n.delete(screenshotToDelete); return n; });
      } else {
        addToast({ type: 'error', message: res.error || 'Failed to delete' });
      }
      setScreenshotToDelete(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkLoading(true);
    let count = 0;
    await Promise.all(Array.from(selectedIds).map(async (id) => {
      const res = await updateScreenshotStatus(id, 'APPROVED');
      if (res.success) count++;
    }));
    addToast({ type: 'success', message: `Approved ${count} screenshot(s)` });
    setSelectedIds(new Set());
    mutate();
    setIsBulkLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === screenshots.length && screenshots.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(screenshots.map((s: any) => s.id)));
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Camera className="w-4 h-4 text-accent" />
          Screenshot Moderation
        </h2>
        <div className="flex items-center gap-4">
          {screenshots.length > 0 && (
            <div className="flex items-center gap-3 pr-4 border-r border-border">
              <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-text-primary transition-colors select-none">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === screenshots.length && screenshots.length > 0} 
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-border bg-bg-surface text-accent focus:ring-accent/20 cursor-pointer"
                />
                Select All
              </label>
              {selectedIds.size > 0 && (
                <div className="flex gap-2">
                  {statusFilter === 'PENDING' && (
                    <button
                      onClick={handleBulkApprove}
                      disabled={isBulkLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold shadow-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      {isBulkLoading && !isDeletingBulk ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approve Selected ({selectedIds.size})
                    </button>
                  )}
                  <button
                    onClick={() => setIsDeletingBulk(true)}
                    disabled={isBulkLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold shadow-sm hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {isBulkLoading && isDeletingBulk ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete Selected ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            {['PENDING', 'APPROVED'].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setSelectedIds(new Set()); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-accent/10 text-accent-light' : 'text-text-muted hover:bg-bg-elevated'}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-h-[800px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {!isLoading && screenshots.map((s: any) => (
            <div key={s.id} className={`rounded-none bg-bg-surface border overflow-hidden transition-all ${selectedIds.has(s.id) ? 'border-accent ring-1 ring-accent' : 'border-border'}`}>
              <div className="relative w-full aspect-[2/3] bg-bg-elevated group cursor-pointer" onClick={() => toggleSelect(s.id)}>
                <Image src={s.imageUrl} alt={s.caption || 'Screenshot'} fill unoptimized className="object-cover group-hover:brightness-90 transition-all" />
                <div className="absolute top-3 left-3 z-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded border-white/20 bg-black/50 text-accent focus:ring-accent/50 shadow-sm cursor-pointer"
                  />
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-text-primary truncate" title={s.Game?.title}>{s.Game?.title || 'Unknown game'}</p>
                  <Badge variant={s.status === 'APPROVED' ? 'success' : 'warning'}>{s.status}</Badge>
                </div>
                <p className="text-xs text-text-dim mb-1">by {s.User?.displayName || 'Unknown'} · {formatRelativeDate(s.createdAt)}</p>
                {s.caption && <p className="text-sm text-text-muted mb-3 line-clamp-2">{s.caption}</p>}
                <div className="flex gap-2">
                  {s.status !== 'APPROVED' && (
                    <button onClick={() => handleAction(s.id, 'APPROVED')} className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20"><Check className="w-3 h-3" />Approve</button>
                  )}
                  {s.status !== 'PENDING' && (
                    <button onClick={() => handleAction(s.id, 'PENDING')} className="flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs font-medium hover:bg-yellow-500/20"><X className="w-3 h-3" />Unapprove</button>
                  )}
                  <button onClick={() => setScreenshotToDelete(s.id)} className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 ml-auto"><Trash2 className="w-3 h-3" />Delete</button>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="col-span-full p-12 flex flex-col items-center justify-center text-text-muted rounded-xl bg-bg-surface border border-border">
              <Spinner className="w-12 h-12 animate-spin mb-4 text-accent" />
              <p>Loading screenshots...</p>
            </div>
          )}
          {!isLoading && screenshots.length === 0 && (
            <div className="col-span-full p-8 text-center text-text-muted rounded-xl bg-bg-surface border border-border">No screenshots to moderate</div>
          )}
        </div>
      </div>

      <Modal isOpen={!!screenshotToDelete || isDeletingBulk} onClose={() => { setScreenshotToDelete(null); setIsDeletingBulk(false); }} title={isDeletingBulk ? "Delete Screenshots" : "Delete Screenshot"} size="sm">
        <p className="text-sm text-text-secondary mb-6 mt-2">
          {isDeletingBulk 
            ? `Are you sure you want to permanently delete ${selectedIds.size} screenshot(s)? This action cannot be undone and the images will be removed from storage.`
            : `Are you sure you want to permanently delete this screenshot? This action cannot be undone and the image will be removed from storage.`}
        </p>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" size="sm" onClick={() => { setScreenshotToDelete(null); setIsDeletingBulk(false); }}>Cancel</Button>
          <Button size="sm" className="!bg-red-500 hover:!bg-red-600 !text-white" onClick={confirmDelete} loading={isBulkLoading}>
            Yes, Delete Permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// --- Helpers ------------------------------------------------------------------

const inputCls = 'w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent transition-colors placeholder:text-text-dim';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-accent uppercase tracking-widest pb-1.5 mb-3 border-b border-border/60">
      {children}
    </p>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1">{children}</label>;
}

function SteamAppIdInput({
  value,
  onChange,
  inputCls
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputCls: string;
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const steamCoverUrl = value
    ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${value}/library_600x900_2x.jpg`
    : null;

  const copy = (text: string, which: 'id' | 'url') => {
    navigator.clipboard.writeText(text);
    if (which === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="mt-4 mb-4 border border-border rounded-lg p-3 bg-bg-surface">
      <Label>Steam App ID <span className="opacity-60 font-normal normal-case">(Used for prices &amp; reviews)</span></Label>
      <div className="flex gap-2 items-center mb-3">
        <input
          value={value}
          onChange={onChange}
          className={inputCls}
          placeholder="e.g. 1245620"
        />
        {value && (
          <button
            type="button"
            onClick={() => copy(value, 'id')}
            title="Copy Steam App ID"
            className="shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg border border-border text-xs text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
          >
            {copiedId ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedId ? 'Copied!' : 'Copy ID'}
          </button>
        )}
      </div>

      <Label>Steam Cover URL</Label>
      <div className="flex items-center gap-2">
        <code className="flex-1 block text-[11px] font-mono text-text-dim bg-bg-elevated border border-border rounded-lg px-2.5 py-1.5 truncate">
          {steamCoverUrl
            ? steamCoverUrl
            : 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/APPID/library_600x900_2x.jpg'}
        </code>
        <button
          type="button"
          onClick={() => copy(steamCoverUrl || 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/APPID/library_600x900_2x.jpg', 'url')}
          title="Copy Steam cover URL"
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
        >
          {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedUrl ? 'Copied!' : 'Copy URL'}
        </button>
      </div>
    </div>
  );
}

// --- State --------------------------------------------------------------------

interface GameState {
  title: string; description: string; coverImageUrl: string;
  backgroundImageUrl: string;
  trailerUrl: string;
  developer: string; publisher: string; releaseDate: string;
  platforms: string; genres: string; tags: string;
  steamAppId: string;
  website: string; redditUrl: string;
  metacritic: string; esrbRating: string; pegiRating: string;
  dlcOfId: string;
  gameEdition: string;
}

const emptyState: GameState = {
  title: '', description: '', coverImageUrl: '',
  backgroundImageUrl: '',
  trailerUrl: '', developer: '', publisher: '', releaseDate: '',
  platforms: '', genres: '', tags: '', steamAppId: '',
  website: '', redditUrl: '', metacritic: '', esrbRating: '', pegiRating: '',
  dlcOfId: '', gameEdition: 'STANDARD',
};

interface IgdbStats {
  igdbCommunityRating?: number;
  aggregatedRating?: number;
  igdbFollows?: number;
  igdbHypes?: number;
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  'Early Access': '#f59e0b',
  Cancelled: '#e11d48',
  Beta: '#7b5cfa',
  Alpha: '#06b6d4',
  Offline: '#64748b',
  Rumored: '#64748b',
  Released: '#22c55e',
  'Coming Soon': '#8b5cf6',
};

const GAME_MODE_ICONS: Record<string, string> = {
  'Single player': '🎮',
  Multiplayer: '👥',
  'Co-operative': '🤝',
  'Split screen': '📺',
  MMO: '🌐',
};

// --- Component ----------------------------------------------------------------

export default function AdminGamesPage() {
  const { addToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: response, mutate, isLoading } = useSWR(
    ['admin-games', debouncedQuery], 
    () => fetchGames({ limit: 100, search: debouncedQuery })
  );
  const data = response?.data || [];
  const totalCount = response?.pagination?.total ?? data.length;

  const { data: allGamesResponse } = useSWR(
    'admin-games-all', 
    () => fetchGames({ limit: 10000, fields: 'card' })
  );
  const allGames = allGamesResponse?.data || [];
  // Shares its SWR cache key with ScreenshotModerationQueue's default (PENDING)
  // filter, so this only adds a network request when that tab isn't mounted.
  const { data: pendingScreenshotsRes } = useSWR(['admin-screenshots', 'PENDING'], () => fetchAdminScreenshots({ status: 'PENDING' }));
  const pendingScreenshotCount = pendingScreenshotsRes?.data?.length ?? 0;
  const [activeTab, setActiveTab] = useState<'catalog' | 'moderation'>('catalog');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState<string | null>(null);
  const [isFetchingIgdb, setIsFetchingIgdb] = useState(false);
  const [igdbId, setIgdbId] = useState<number | null>(null);
  const [igdbWebsites, setIgdbWebsites] = useState<IgdbWebsiteLinks>({});
  const [igdbGameEngine, setIgdbGameEngine] = useState<string | undefined>();
  const [igdbGameModes, setIgdbGameModes] = useState<string[]>([]);
  const [igdbReleaseStatus, setIgdbReleaseStatus] = useState<string>('Released');
  const [igdbStats, setIgdbStats] = useState<IgdbStats>({});
  const [form, setForm] = useState<GameState>(emptyState);

  const set = (field: keyof GameState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleClose = () => {
    setShowModal(false); setEditingId(null);
    setForm(emptyState);
    setIgdbId(null); setIgdbWebsites({}); setIgdbGameEngine(undefined);
    setIgdbGameModes([]); setIgdbReleaseStatus('Released'); setIgdbStats({});
  };

  // Apply IGDB data to the form. When `overwrite` is true (explicit search
  // selection), values replace whatever is currently in the field. Otherwise
  // (auto-fetch on edit) only empty fields are filled.
  const applyIgdbData = (igdb: IgdbGameData, overwrite: boolean) => {
    setForm(prev => ({
      ...prev,
      title: overwrite && igdb.name ? igdb.name : prev.title,
      description: overwrite ? (igdb.description || prev.description) : (prev.description || igdb.description || ''),
      coverImageUrl: overwrite ? (igdb.coverImageUrl || prev.coverImageUrl) : (prev.coverImageUrl || igdb.coverImageUrl || ''),
      backgroundImageUrl: overwrite ? (igdb.backgroundImageUrl || prev.backgroundImageUrl) : (prev.backgroundImageUrl || igdb.backgroundImageUrl || ''),
      developer: overwrite ? (igdb.developer || prev.developer) : (prev.developer || igdb.developer || ''),
      publisher: overwrite ? (igdb.publisher || prev.publisher) : (prev.publisher || igdb.publisher || ''),
      releaseDate: overwrite ? (igdb.releaseDate || prev.releaseDate) : (prev.releaseDate || igdb.releaseDate || ''),
      platforms: overwrite ? (igdb.platforms || prev.platforms) : (prev.platforms || igdb.platforms || ''),
      genres: overwrite ? (igdb.genres || prev.genres) : (prev.genres || igdb.genres || ''),
      website: overwrite ? (igdb.websites?.official || prev.website) : (prev.website || igdb.websites?.official || ''),
      redditUrl: overwrite ? (igdb.websites?.reddit || prev.redditUrl) : (prev.redditUrl || igdb.websites?.reddit || ''),
      metacritic: igdb.aggregatedRating != null
        ? (overwrite ? String(Math.round(igdb.aggregatedRating)) : (prev.metacritic || String(Math.round(igdb.aggregatedRating))))
        : prev.metacritic,
      esrbRating: overwrite ? (igdb.esrbRating || prev.esrbRating) : (prev.esrbRating || igdb.esrbRating || ''),
      pegiRating: overwrite ? (igdb.pegiRating || prev.pegiRating) : (prev.pegiRating || igdb.pegiRating || ''),
      tags: (() => {
        const tags = [igdb.themes, igdb.keywords].filter(Boolean).join(' ');
        if (!tags) return prev.tags;
        return overwrite ? tags : (prev.tags || tags);
      })(),
      steamAppId: (() => {
        if (igdb.steamAppId) return overwrite ? igdb.steamAppId : (prev.steamAppId || igdb.steamAppId);
        const match = igdb.websites?.steam?.match(/app\/(\d+)/);
        if (!match) return prev.steamAppId;
        return overwrite ? match[1] : (prev.steamAppId || match[1]);
      })(),
    }));

    setIgdbId(igdb.igdbId);
    setIgdbWebsites(igdb.websites || {});
    setIgdbGameEngine(igdb.gameEngine);
    setIgdbGameModes(igdb.gameModes || []);
    setIgdbReleaseStatus(igdb.releaseStatus || 'Released');
    setIgdbStats({
      igdbCommunityRating: igdb.igdbCommunityRating,
      aggregatedRating: igdb.aggregatedRating,
      igdbFollows: igdb.igdbFollows,
      igdbHypes: igdb.igdbHypes,
    });
  };

  const autoFetchIgdb = async (id: number, overwrite = false) => {
    setIsFetchingIgdb(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${backendUrl}/api/games/igdb-search?id=${id}`);
      if (!res.ok) return;
      const { data } = await res.json();
      applyIgdbData(data as IgdbGameData, overwrite);
    } catch (err) { console.error('IGDB auto-fetch error', err); }
    finally { setIsFetchingIgdb(false); }
  };

  const populateFormFromGame = (g: any) => {
    setForm({
      title: g.title || '', description: g.description || '',
      coverImageUrl: g.coverImageUrl || '',
      backgroundImageUrl: g.backgroundImageUrl || '',
      trailerUrl: g.trailerUrl || '', developer: g.developer || '', publisher: g.publisher || '',
      releaseDate: g.releaseDate ? new Date(g.releaseDate).toISOString().split('T')[0] : '',
      platforms: Array.isArray(g.platforms) ? g.platforms.join(', ') : (g.platforms || ''),
      genres: Array.isArray(g.genres) ? g.genres.join(', ') : (g.genres || ''),
      tags: Array.isArray(g.tags) ? g.tags.join(', ') : (g.tags || ''),
      steamAppId: g.steamAppId || '',
      website: g.website || '', redditUrl: g.redditUrl || '',
      metacritic: g.metacritic != null ? String(g.metacritic) : '',
      esrbRating: g.esrbRating || '',
      pegiRating: g.pegiRating || '',
      dlcOfId: g.dlcOfId || '',
      gameEdition: g.gameEdition || 'STANDARD',
    });
    setIgdbId(g.igdbId ?? null);
    setIgdbWebsites((g.websitesJson as IgdbWebsiteLinks) || {});
    setIgdbGameEngine(g.gameEngine || undefined);
    setIgdbGameModes(Array.isArray(g.gameModes) ? g.gameModes : []);
    setIgdbReleaseStatus(g.releaseStatus || 'Released');
    setIgdbStats({
      igdbCommunityRating: g.igdbCommunityRating ?? undefined,
      aggregatedRating: g.aggregatedRating ?? undefined,
      igdbFollows: g.igdbFollows ?? undefined,
      igdbHypes: g.igdbHypes ?? undefined,
    });
  };

  const handleEditClick = async (g: any) => {
    if (!g.slug) { addToast({ type: 'error', message: 'Game has no slug' }); return; }

    // The A-Z sidebar fetches games with fields='card' (a lean projection that
    // only includes id/slug/title/publisher/coverImageUrl/releaseDate/platforms/genres/totalRating).
    // Detect a partial card object by checking for the absence of 'description'
    // (undefined — not present on the object at all, vs '' which the full row returns).
    const isPartialCard = !('description' in g);
    if (isPartialCard) {
      setIsLoadingEdit(g.slug);
      try {
        const res = await fetchGame(g.slug, 0);
        if (!res.data) { addToast({ type: 'error', message: 'Failed to load game data' }); return; }
        g = res.data;
      } catch (err) {
        addToast({ type: 'error', message: 'Failed to load game data' });
        return;
      } finally {
        setIsLoadingEdit(null);
      }
    }

    setEditingId(g.slug);
    populateFormFromGame(g);
    setShowModal(true);
    if (g.igdbId) autoFetchIgdb(g.igdbId);
  };

  const handleIgdbSelect = (gd: IgdbGameData) => {
    setForm(emptyState);
    applyIgdbData(gd, true);
    setForm(prev => ({ ...prev, dlcOfId: '', gameEdition: 'STANDARD' }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setIsSaving(true);
    const payload = {
      title: form.title, description: form.description || undefined,
      coverImageUrl: form.coverImageUrl || undefined,
      backgroundImageUrl: form.backgroundImageUrl || undefined,
      trailerUrl: form.trailerUrl || undefined, developer: form.developer || undefined,
      publisher: form.publisher || undefined,
      releaseDate: form.releaseDate ? new Date(form.releaseDate).toISOString() : undefined,
      platforms: form.platforms ? form.platforms.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      genres: form.genres ? form.genres.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      steamAppId: form.steamAppId || undefined,
      website: form.website || undefined, redditUrl: form.redditUrl || undefined,
      metacritic: form.metacritic ? Number(form.metacritic) : undefined,
      esrbRating: form.esrbRating || undefined,
      pegiRating: form.pegiRating || undefined,
      dlcOfId: form.dlcOfId || undefined,
      gameEdition: form.gameEdition || 'STANDARD',
    };
    try {
      const res = editingId ? await updateGame(editingId, payload) : await createGame(payload);
      if (res.success) {
        const savedGameId = (res.data as any)?.id || editingId;
        if (igdbId && savedGameId) {
          try {
            await fetch('/api/admin/games/import-igdb', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ igdbId, gameId: savedGameId }),
            });
          } catch (err) { console.error('IGDB sync error:', err); }
        }
        const savedSlug = (res.data as any)?.slug || editingId;
        await revalidateGamePage(savedSlug);
        addToast({ type: 'success', message: editingId ? 'Game updated' : 'Game created' }); handleClose(); mutate();
      }
      else addToast({ type: 'error', message: res.error || 'Failed to save' });
    } finally { setIsSaving(false); }
  };

  const handleDeleteClick = async (g: any) => {
    if (!window.confirm(`Delete "${g.title}"?`)) return;
    setDeletingId(g.id);
    const res = await deleteGame(g.slug || g.id);
    setDeletingId(null);
    if (res.success) { addToast({ type: 'success', message: 'Game deleted' }); mutate(); }
    else addToast({ type: 'error', message: res.error || 'Failed to delete' });
  };

  const platformList = form.platforms.split(',').map(s => s.trim()).filter(Boolean);
  const genreList = form.genres.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div>
      {/* Sticky header + tabs — bleeds to the edges of the padded content
          area (negative margin cancels the parent's padding, then re-applies
          it inside) so the sticky bar spans full width instead of floating
          inside the page's own padding. */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 bg-bg-primary">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Games</h1>
          <Button size="sm" className="w-full sm:w-auto" icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            Add Game
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border mb-6">
          {([
            { key: 'catalog', label: `Game Catalog (${totalCount})` },
            { key: 'moderation', label: `Screenshot Moderation (${pendingScreenshotCount})` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'moderation' && <ScreenshotModerationQueue />}

      {activeTab === 'catalog' && (
        <div className="flex flex-col gap-6">
          <div className="max-w-md">
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-6 gap-6 items-start">
            <div className="xl:col-span-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {isLoading && (
              <div className="col-span-full p-12 flex flex-col items-center justify-center text-text-muted">
                <Spinner className="w-12 h-12 animate-spin mb-4 text-accent" />
                <p>Loading games...</p>
              </div>
            )}
            {!isLoading && data.length === 0 && (
              <div className="col-span-full p-8 text-center text-text-muted">No games found.</div>
            )}
            {!isLoading && data.map(g => (
              <div key={g.id} className="rounded-none bg-bg-surface border border-border overflow-hidden relative group">
                {g.coverImageUrl
                  ? <img src={g.coverImageUrl} alt={g.title} className="w-full aspect-[2/3] object-cover" />
                  : <div className="w-full aspect-[2/3] bg-gradient-to-br from-accent/20 to-accent-green/20 flex items-center justify-center text-3xl">🎮</div>
                }
                <div className="p-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate" title={g.title}>{g.title}</p>
                    {g.createdAt && (
                      <p className="text-[10px] text-text-dim mt-0.5" title="Added to library">
                        {new Date(g.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2 mt-0.5">
                    <button onClick={() => handleEditClick(g)} className="text-text-muted hover:text-accent transition-colors p-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteClick(g)} disabled={deletingId === g.id} className="text-text-muted hover:text-danger transition-colors p-1 disabled:opacity-50">
                      {deletingId === g.id ? <Spinner className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {!isLoading && allGames && allGames.length > 0 && (
            <div className="xl:col-span-1 xl:sticky xl:top-[140px] max-h-[calc(100vh-160px)] overflow-y-auto bg-bg-surface border border-border p-4 rounded-lg scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60">
                <div className="w-1.5 h-4 bg-accent rounded-full"></div>
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">A-Z Directory ({allGames.length})</h3>
              </div>
              <ul className="space-y-1.5">
                {[...allGames].sort((a, b) => a.title.localeCompare(b.title)).map((g, index) => (
                  <li 
                    key={g.id} 
                    className={`text-sm hover:text-accent hover:bg-bg-elevated cursor-pointer transition-all px-2 py-1.5 rounded-md break-words flex items-start ${
                      isLoadingEdit === g.slug ? 'text-accent opacity-70' : 'text-text-muted'
                    }`}
                    onClick={() => handleEditClick(g)}
                    title={g.title}
                  >
                    {isLoadingEdit === g.slug
                      ? <Spinner className="w-3 h-3 animate-spin mr-2 mt-1 shrink-0 text-accent" />
                      : <span className="opacity-50 mr-2 font-mono shrink-0 mt-0.5">{index + 1}.</span>
                    }
                    <span>{g.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </div>
      )}

      {/* -- Wide Modal -- */}
      <Modal isOpen={showModal} onClose={handleClose} title={editingId ? 'Edit Game' : 'Add Game'} size="full">
        {/* IGDB search bar — full width at top */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1">
            <IgdbSearch onSelectGame={handleIgdbSelect} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-muted uppercase">OR FETCH ID:</span>
            <input
              type="number"
              placeholder="e.g. 113112"
              value={igdbId ?? ''}
              onChange={(e) => setIgdbId(e.target.value ? Number(e.target.value) : null)}
              className="px-2 py-1.5 w-24 bg-bg-surface border border-border rounded-lg text-xs text-text-primary focus:border-accent outline-none font-mono"
            />
            <Button size="sm" variant="secondary" className="!py-1.5 !px-3" disabled={!igdbId || isFetchingIgdb} onClick={() => igdbId && autoFetchIgdb(igdbId, true)}>
              Fetch
            </Button>
          </div>
          {isFetchingIgdb && (
            <span className="flex items-center gap-1.5 text-xs text-accent shrink-0 ml-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching...
            </span>
          )}
        </div>

        {/* Release status badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Release Status</span>
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
            style={{ 
              backgroundColor: STATUS_BADGE_COLORS[
                !form.releaseDate
                  ? 'Coming Soon'
                  : (new Date(form.releaseDate).getTime() > Date.now() 
                      ? 'Coming Soon' 
                      : (igdbReleaseStatus === 'Coming Soon' && new Date(form.releaseDate).getTime() <= Date.now() ? 'Released' : igdbReleaseStatus) || 'Released')
              ] || '#64748b' 
            }}
          >
            {!form.releaseDate
              ? 'Coming Soon'
              : (new Date(form.releaseDate).getTime() > Date.now() 
                  ? 'Coming Soon' 
                  : (igdbReleaseStatus === 'Coming Soon' && new Date(form.releaseDate).getTime() <= Date.now() ? 'Released' : (igdbReleaseStatus || 'Released')))}
          </span>
        </div>

        {/* -- 3-column grid -- */}
        <div className="grid grid-cols-3 gap-5">

          {/* ══ COL 1: Basic info + Metadata ══ */}
          <div className="space-y-4">
            <SectionTitle>Basic Info</SectionTitle>

            <div>
              <Label>Title *</Label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Cyberpunk 2077" className={inputCls} />
            </div>

            <div>
              <Label>Description</Label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} className={`${inputCls} resize-none`} placeholder="Short description..." />
            </div>

            <div className="pt-1">
              <SectionTitle>Publisher & Developer</SectionTitle>
              <div className="space-y-2">
                <div>
                  <Label>Developer</Label>
                  <input value={form.developer} onChange={e => set('developer', e.target.value)} placeholder="CD Projekt Red" className={inputCls} />
                </div>
                <div>
                  <Label>Publisher</Label>
                  <input value={form.publisher} onChange={e => set('publisher', e.target.value)} placeholder="CD Projekt" className={inputCls} />
                </div>
                <div>
                  <Label>Release Date</Label>
                  <input type="date" value={form.releaseDate} onChange={e => set('releaseDate', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            <div>
              <Label>Platforms <span className="opacity-60 font-normal normal-case">(comma-separated)</span></Label>
              <input value={form.platforms} onChange={e => set('platforms', e.target.value)} placeholder="PC, PlayStation 5, Xbox Series X/S" className={inputCls} />
              {platformList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {platformList.map(p => <span key={p} className="text-[10px] px-2 py-0.5 bg-blue-900/30 text-blue-300 border border-blue-700/40 rounded-full">{p}</span>)}
                </div>
              )}
            </div>

            <div>
              <Label>Genres <span className="opacity-60 font-normal normal-case">(comma-separated)</span></Label>
              <input value={form.genres} onChange={e => set('genres', e.target.value)} placeholder="Action, RPG, Open World" className={inputCls} />
              {genreList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {genreList.map(g => <span key={g} className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full">{g}</span>)}
                </div>
              )}
            </div>

            <div>
              <Label>Tags <span className="opacity-60 font-normal normal-case">(themes + keywords from IGDB)</span></Label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Open World, Story Rich, Singleplayer..." className={inputCls} />
            </div>

            <SteamAppIdInput 
              value={form.steamAppId || ''} 
              onChange={e => set('steamAppId', e.target.value)} 
              inputCls={inputCls} 
            />

            {igdbGameEngine && (
              <div>
                <Label>Game Engine <span className="opacity-60 font-normal normal-case">(from IGDB)</span></Label>
                <input value={igdbGameEngine} readOnly className={`${inputCls} opacity-70 cursor-not-allowed`} />
              </div>
            )}

            {igdbGameModes.length > 0 && (
              <div>
                <Label>Game Modes <span className="opacity-60 font-normal normal-case">(from IGDB)</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {igdbGameModes.map(m => (
                    <span key={m} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-bg-elevated border border-border rounded-full text-text-primary">
                      <span>{GAME_MODE_ICONS[m] || '🎯'}</span> {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Game Edition</Label>
                <select 
                  value={form.gameEdition} 
                  onChange={e => set('gameEdition', e.target.value)} 
                  className={inputCls}
                >
                  <option value="STANDARD">Standard</option>
                  <option value="DELUXE">Deluxe</option>
                  <option value="COMPLETE">Complete</option>
                  <option value="GOTY_EDITION">GOTY</option>
                  <option value="EXPANSION">Expansion</option>
                  <option value="DLC">DLC</option>
                </select>
              </div>
              <div>
                <Label>DLC Of (Base Game ID)</Label>
                <input 
                  value={form.dlcOfId} 
                  onChange={e => set('dlcOfId', e.target.value)} 
                  placeholder="Paste base game ID..." 
                  className={inputCls} 
                />
              </div>
            </div>
          </div>

          {/* ══ COL 2: Scores + Links ══ */}
          <div className="space-y-4">
            <SectionTitle>Scores & Ratings</SectionTitle>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Critic Rating (IGDB) <span className="opacity-60">/100</span></Label>
                <input type="number" value={form.metacritic} onChange={e => set('metacritic', e.target.value)} placeholder="85" min="0" max="100" className={inputCls} />
              </div>
              <div>
                <Label>ESRB Rating</Label>
                <input value={form.esrbRating} onChange={e => set('esrbRating', e.target.value)} placeholder="Mature" className={inputCls} />
              </div>
              <div>
                <Label>PEGI Rating</Label>
                <input value={form.pegiRating} onChange={e => set('pegiRating', e.target.value)} placeholder="18" className={inputCls} />
              </div>
            </div>

            {/* IGDB read-only stats */}
            {(igdbStats.igdbCommunityRating != null || igdbStats.aggregatedRating != null || igdbStats.igdbFollows != null || igdbStats.igdbHypes != null) && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                {igdbStats.igdbCommunityRating != null && (
                  <div className="bg-bg-elevated border border-border rounded-lg p-2 text-center">
                    <p className="text-[9px] text-text-dim uppercase tracking-wide">IGDB Community</p>
                    <p className="text-xs font-bold text-text-primary">{igdbStats.igdbCommunityRating.toFixed(1)} / 100</p>
                  </div>
                )}
                {igdbStats.aggregatedRating != null && (
                  <div className="bg-bg-elevated border border-border rounded-lg p-2 text-center">
                    <p className="text-[9px] text-text-dim uppercase tracking-wide">Critic Aggregate</p>
                    <p className="text-xs font-bold text-text-primary">{igdbStats.aggregatedRating.toFixed(1)} / 100</p>
                  </div>
                )}
                {igdbStats.igdbFollows != null && (
                  <div className="bg-bg-elevated border border-border rounded-lg p-2 text-center">
                    <p className="text-[9px] text-text-dim uppercase tracking-wide">Follows</p>
                    <p className="text-xs font-bold text-text-primary">{igdbStats.igdbFollows.toLocaleString()}</p>
                  </div>
                )}
                {igdbStats.igdbHypes != null && (
                  <div className="bg-bg-elevated border border-border rounded-lg p-2 text-center">
                    <p className="text-[9px] text-text-dim uppercase tracking-wide">Hypes</p>
                    <p className="text-xs font-bold text-text-primary">{igdbStats.igdbHypes.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <SectionTitle>External Links</SectionTitle>
              <div className="space-y-2">
                <div>
                  <Label>Official Website</Label>
                  <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://www.example.com" className={inputCls} />
                  {form.website && (
                    <a href={form.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent mt-1 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Visit
                    </a>
                  )}
                </div>
                <div>
                  <Label>Reddit URL</Label>
                  <input value={form.redditUrl} onChange={e => set('redditUrl', e.target.value)} placeholder="https://reddit.com/r/..." className={inputCls} />
                  {form.redditUrl && (
                    <a href={form.redditUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-orange-400 mt-1 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Visit
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Store Links</Label>
              <p className="text-[11px] text-text-dim mb-1">
                Store links (Steam, GOG, Epic, itch.io) are auto-populated from IGDB and ITAD.
              </p>
              {(() => {
                const storeLinks = [
                  { name: 'Steam', url: igdbWebsites.steam },
                  { name: 'GOG', url: igdbWebsites.gog },
                  { name: 'Epic Games', url: igdbWebsites.epicgames },
                  { name: 'itch.io', url: igdbWebsites.itch },
                ].filter(s => s.url);
                if (storeLinks.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {storeLinks.map(s => (
                      <a key={s.name} href={s.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-elevated border border-border rounded-lg text-xs font-medium text-text-primary hover:border-accent/50 hover:text-accent transition-colors">
                        <ExternalLink className="w-3 h-3" />{s.name}
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ══ COL 3: Images ══ */}
          <div className="space-y-4">
            <SectionTitle>Images</SectionTitle>

            {/* Cover 2:3 */}
            <div>
              <Label>Cover Image <span className="opacity-60 font-normal normal-case">(2:3 — portrait from IGDB)</span></Label>
              {form.coverImageUrl && (
                <div className="mb-2 w-[140px] aspect-[2/3] rounded-lg overflow-hidden border border-border">
                  <img src={form.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                </div>
              )}
              <input value={form.coverImageUrl} onChange={e => set('coverImageUrl', e.target.value)} placeholder="https://..." className={`${inputCls} text-xs font-mono`} />
              <div className="mt-2"><ImageUploader value={form.coverImageUrl} onChange={v => set('coverImageUrl', v)} /></div>
            </div>

            {/* Background image 16:9 */}
            <div>
              <Label>Background Image <span className="opacity-60 font-normal normal-case">(16:9 — wide hero backdrop from IGDB artwork)</span></Label>
              <div className="mb-2 w-full max-w-[280px] aspect-[16/9] rounded-lg overflow-hidden border border-border bg-bg-elevated flex items-center justify-center">
                {form.backgroundImageUrl ? (
                  <img src={form.backgroundImageUrl} alt="Background preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-text-muted" />
                )}
              </div>
              <input value={form.backgroundImageUrl} onChange={e => set('backgroundImageUrl', e.target.value)} placeholder="https://..." className={`${inputCls} text-xs font-mono`} />
              <div className="mt-2"><ImageUploader value={form.backgroundImageUrl} onChange={v => set('backgroundImageUrl', v)} /></div>
            </div>
          </div>
        </div>

        {/* -- Footer actions -- */}
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" loading={isSaving} onClick={handleSave}>
            {editingId ? 'Save Changes' : 'Create Game'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
