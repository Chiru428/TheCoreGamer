'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import {
  Save, ArrowLeft, AlertCircle, RefreshCw, ExternalLink,
  ChevronDown, ChevronUp, Gamepad2, Star, BarChart2, Image as ImageIcon, Copy, Check
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';
import ImageUploader from '@/components/admin/ImageUploader';
import Link from 'next/link';
import IgdbSearch, { type IgdbGameData, type IgdbWebsiteLinks } from '@/components/admin/IgdbSearch';
import { revalidateGamePage } from '@/app/admin/actions';

// --- Zod Schema --------------------------------------------------------------

const gameSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  coverImageUrl: z.string().optional(),
  backgroundImageUrl: z.string().optional().nullable(),
  steamAppId: z.string().optional(),
  trailerUrl: z.string().optional(),
  developer: z.string().optional(),
  publisher: z.string().optional(),
  releaseDate: z.string().optional(),
  platforms: z.string().optional(),
  genres: z.string().optional(),
  // Extended fields
  metacritic: z.string().optional(),
  website: z.string().optional(),
  redditUrl: z.string().optional(),
  esrbRating: z.string().optional(),
  pegiRating: z.string().optional(),
  regionalReleaseDateEU: z.string().optional(),
  regionalReleaseDateJP: z.string().optional(),
  regionalReleaseDateNA: z.string().optional(),
  tags: z.string().optional(),
});

type GameFormData = z.infer<typeof gameSchema>;

interface GameFormProps {
  mode: 'create' | 'edit';
  gameId?: string;
}

const GAME_MODE_ICONS: Record<string, string> = {
  'Single player': '🎮',
  Multiplayer: '👥',
  'Co-operative': '🤝',
  'Split screen': '📺',
  MMO: '🌐',
};

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

// --- Section component for collapsible groups ---------------------------------

function FormSection({
  title, icon, children, defaultOpen = true
}: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border">{children}</div>}
    </div>
  );
}

// --- Field component ----------------------------------------------------------

function Field({
  label, hint, children, colSpan
}: {
  label: string; hint?: string; children: React.ReactNode; colSpan?: string;
}) {
  return (
    <div className={colSpan}>
      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">{label}</label>
      {hint && <p className="text-[11px] text-text-dim mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = "w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-light transition-colors placeholder:text-text-dim";
const textareaCls = `${inputCls} resize-y`;

// --- Steam App ID field with copy helpers -------------------------------------

function SteamAppIdField({
  value,
  register,
  inputCls: cls,
}: {
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
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
    <div className="col-span-full sm:col-span-1">
      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
        Steam App ID
      </label>
      <p className="text-[11px] text-text-dim mb-1.5">Used for prices &amp; reviews. Auto-filled from IGDB when available.</p>

      {/* App ID input + copy button */}
      <div className="flex gap-2 items-center">
        <input
          {...(register as any)('steamAppId')}
          className={cls}
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

      {/* Steam cover URL preview + copy */}
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 block text-[11px] font-mono text-text-dim bg-bg-elevated border border-border rounded-lg px-2.5 py-1.5 truncate">
          {steamCoverUrl
            ? steamCoverUrl
            : 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/APPID/library_600x900_2x.jpg'}
        </code>
        <button
          type="button"
          onClick={() => steamCoverUrl && copy(steamCoverUrl, 'url')}
          disabled={!steamCoverUrl}
          title={steamCoverUrl ? 'Copy Steam cover URL' : 'Enter a Steam App ID first'}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedUrl ? 'Copied!' : 'Copy URL'}
        </button>
      </div>
    </div>
  );
}

// --- Main Component -----------------------------------------------------------

interface IgdbStats {
  igdbCommunityRating?: number;
  igdbCommunityRatingCount?: number;
  aggregatedRating?: number;
  aggregatedRatingCount?: number;
  igdbFollows?: number;
  igdbHypes?: number;
}

export default function GameForm({ mode, gameId }: GameFormProps) {
  const router = useRouter();
  const { addToast } = useUIStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingIgdb, setIsFetchingIgdb] = useState(false);

  // IGDB-derived display-only state (persisted to the DB via the dedicated
  // import-igdb sync, not this form's basic payload)
  const [igdbId, setIgdbId] = useState<number | null>(null);
  const [igdbGameEngine, setIgdbGameEngine] = useState<string | undefined>();
  const [igdbGameModes, setIgdbGameModes] = useState<string[]>([]);
  const [igdbReleaseStatus, setIgdbReleaseStatus] = useState<string>('Released');
  const [igdbWebsites, setIgdbWebsites] = useState<IgdbWebsiteLinks>({});
  const [igdbStats, setIgdbStats] = useState<IgdbStats>({});

  const { data: existingGame, error: fetchError } = useSWR(
    mode === 'edit' && gameId ? `/api/games/${gameId}` : null
  );

  const {
    register, handleSubmit, setValue, watch, reset, getValues,
    formState: { errors },
  } = useForm<GameFormData>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      title: '', slug: '', description: '', coverImageUrl: '',
      backgroundImageUrl: '',
      steamAppId: '', trailerUrl: '',
      website: '', redditUrl: '', metacritic: '', esrbRating: '', pegiRating: '',
      regionalReleaseDateEU: '', regionalReleaseDateJP: '', regionalReleaseDateNA: '',
      tags: '',
    },
  });

  const watchAll = watch();
  const { coverImageUrl, backgroundImageUrl, title, releaseDate } = watchAll;
  const watchedSteamAppId = watch('steamAppId');

  const displayReleaseStatus = useMemo(() => {
    if (!releaseDate) {
      return 'Coming Soon';
    }
    const rd = new Date(releaseDate);
    if (rd.getTime() > Date.now()) {
      return 'Coming Soon';
    }
    if (rd.getTime() <= Date.now() && igdbReleaseStatus === 'Coming Soon') {
      return 'Released';
    }
    return igdbReleaseStatus || 'Released';
  }, [releaseDate, igdbReleaseStatus]);

  // Live sync Steam App ID -> Cover/Background Images. If a Steam App ID is present and the
  // current images are either empty or already managed (IGDB/Steam), update them
  // to the high-quality Steam library capsule/hero art.
  // NOTE: use `coverImageUrl` and `backgroundImageUrl` from watchAll directly — calling watch() inside
  // a useEffect creates a stale closure that may read outdated form state.
  useEffect(() => {
    if (!watchedSteamAppId || !/^\d+$/.test(watchedSteamAppId)) return;

    const isCoverManaged = !coverImageUrl || coverImageUrl.includes('steamstatic.com') || coverImageUrl.includes('images.igdb.com');
    const isBackgroundManaged = !backgroundImageUrl || backgroundImageUrl.includes('steamstatic.com') || backgroundImageUrl.includes('images.igdb.com');

    if (isCoverManaged) {
      const steamCoverUrl = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${watchedSteamAppId}/library_600x900_2x.jpg`;
      if (coverImageUrl !== steamCoverUrl) {
        setValue('coverImageUrl', steamCoverUrl, { shouldDirty: true });
      }
    }
    
    if (isBackgroundManaged) {
      const steamBackgroundUrl = `https://shared.steamstatic.com/store_item_assets/steam/apps/${watchedSteamAppId}/library_hero_2x.jpg`;
      if (backgroundImageUrl !== steamBackgroundUrl) {
        setValue('backgroundImageUrl', steamBackgroundUrl, { shouldDirty: true });
      }
    }
  }, [watchedSteamAppId, coverImageUrl, backgroundImageUrl, setValue]);

  // Auto-generate slug from title in create mode
  useEffect(() => {
    if (mode === 'create' && title && !watch('slug')) {
      const generatedSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [title, mode, setValue, watch]);

  // Populate form with saved game data
  useEffect(() => {
    if (existingGame?.data) {
      const d = existingGame.data;
      reset({
        title: d.title || '',
        slug: d.slug || '',
        description: d.description || '',
        coverImageUrl: d.coverImageUrl || '',
        backgroundImageUrl: d.backgroundImageUrl || '',
        steamAppId: d.steamAppId || '',
        trailerUrl: d.trailerUrl || '',
        developer: d.developer || '',
        publisher: d.publisher || '',
        releaseDate: d.releaseDate ? new Date(d.releaseDate).toISOString().split('T')[0] : '',
        platforms: Array.isArray(d.platforms) ? d.platforms.join(', ') : '',
        genres: Array.isArray(d.genres) ? d.genres.join(', ') : '',
        website: d.website || '',
        redditUrl: d.redditUrl || '',
        metacritic: d.metacritic != null ? String(d.metacritic) : '',
        esrbRating: d.esrbRating || '',
        pegiRating: d.pegiRating || '',
        regionalReleaseDateEU: (d.regionalReleaseDates as any)?.eu || '',
        regionalReleaseDateJP: (d.regionalReleaseDates as any)?.jp || '',
        regionalReleaseDateNA: (d.regionalReleaseDates as any)?.na || '',
        tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
      });

      setIgdbId(d.igdbId ?? null);
      setIgdbGameEngine(d.gameEngine || undefined);
      setIgdbGameModes(Array.isArray(d.gameModes) ? d.gameModes : []);
      setIgdbReleaseStatus(d.releaseStatus || 'Released');
      setIgdbWebsites((d.websitesJson as IgdbWebsiteLinks) || {});
      setIgdbStats({
        igdbCommunityRating: d.igdbCommunityRating ?? undefined,
        igdbCommunityRatingCount: d.igdbCommunityRatingCount ?? undefined,
        aggregatedRating: d.aggregatedRating ?? undefined,
        aggregatedRatingCount: d.aggregatedRatingCount ?? undefined,
        igdbFollows: d.igdbFollows ?? undefined,
        igdbHypes: d.igdbHypes ?? undefined,
      });
    }
  }, [existingGame, reset]);

  // Apply IGDB data to the form. When `overwrite` is true (explicit search
  // selection), values replace whatever is currently in the field. Otherwise
  // (auto-fetch / refresh) only empty fields are filled.
  const applyIgdbData = (igdb: IgdbGameData, overwrite: boolean) => {
    const currentVals = watch();

    const setField = (field: keyof GameFormData, value: string | undefined) => {
      if (!value) return;
      if (overwrite || !currentVals[field]) {
        setValue(field, value, { shouldDirty: true });
      }
    };

    // Cover/background images are also overwritten on refresh if the current
    // value is itself IGDB/Steam-managed (i.e. not a custom-uploaded image).
    const isManagedImageUrl = (url?: string) =>
      !url || url.includes('images.igdb.com') || url.includes('steamstatic.com');

    const setImageField = (field: 'coverImageUrl' | 'backgroundImageUrl', value: string | undefined) => {
      if (!value) return;
      if (overwrite || isManagedImageUrl(currentVals[field] ?? undefined)) {
        setValue(field, value, { shouldDirty: true });
      }
    };

    if (overwrite) {
      if (igdb.name) setValue('title', igdb.name, { shouldValidate: true, shouldDirty: true });
      if (mode === 'create' && igdb.igdbSlug) setValue('slug', igdb.igdbSlug, { shouldValidate: true, shouldDirty: true });
    }

    setField('description', igdb.description);

    // Cover/Background image priority: Steam art (primary) > IGDB cover (fallback).
    // Build the Steam URL here explicitly so the correct image is set immediately
    // without waiting for the steamAppId useEffect to fire separately.
    const steamAppIdForImages = igdb.steamAppId || (overwrite ? undefined : currentVals.steamAppId);
    
    const resolvedCoverUrl = steamAppIdForImages
      ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${steamAppIdForImages}/library_600x900_2x.jpg`
      : (igdb.coverImageUrl as string | undefined);
    setImageField('coverImageUrl', resolvedCoverUrl);

    const resolvedBackgroundUrl = steamAppIdForImages
      ? `https://shared.steamstatic.com/store_item_assets/steam/apps/${steamAppIdForImages}/library_hero_2x.jpg`
      : (igdb.backgroundImageUrl as string | undefined);
    setImageField('backgroundImageUrl', resolvedBackgroundUrl);
    setField('developer', igdb.developer);
    setField('publisher', igdb.publisher);
    setField('releaseDate', igdb.releaseDate);
    setField('platforms', igdb.platforms);
    setField('genres', igdb.genres);
    setField('website', igdb.websites?.official);
    setField('redditUrl', igdb.websites?.reddit);
    if (igdb.aggregatedRating != null) setField('metacritic', String(Math.round(igdb.aggregatedRating)));
    setField('esrbRating', igdb.esrbRating);
    setField('pegiRating', igdb.pegiRating);

    const tags = [igdb.themes, igdb.keywords].filter(Boolean).join(' ');
    if (tags) setField('tags', tags);

    // Steam App ID (provided directly by backend mapper)
    if (igdb.steamAppId && (overwrite || !currentVals.steamAppId)) {
      setValue('steamAppId', igdb.steamAppId, { shouldDirty: true });
    }

    setIgdbId(igdb.igdbId);
    setIgdbGameEngine(igdb.gameEngine);
    setIgdbGameModes(igdb.gameModes || []);
    setIgdbReleaseStatus(igdb.releaseStatus || 'Released');
    setIgdbWebsites(igdb.websites || {});
    setIgdbStats({
      igdbCommunityRating: igdb.igdbCommunityRating,
      igdbCommunityRatingCount: igdb.igdbCommunityRatingCount,
      aggregatedRating: igdb.aggregatedRating,
      aggregatedRatingCount: igdb.aggregatedRatingCount,
      igdbFollows: igdb.igdbFollows,
      igdbHypes: igdb.igdbHypes,
    });
  };

  // Auto-fetch IGDB data when editing an existing game already linked to IGDB
  useEffect(() => {
    const autoFetch = async () => {
      if (mode !== 'edit' || !existingGame?.data?.igdbId) return;

      setIsFetchingIgdb(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${backendUrl}/api/games/igdb-search?id=${existingGame.data.igdbId}`);
        if (!res.ok) return;
        const { data } = await res.json();
        const igdbData = data as IgdbGameData;
        applyIgdbData(igdbData, false);

        // -- Steam images enforcement (post-await) ---------------------------
        // applyIgdbData runs inside an async closure so `watch()` may be stale.
        // Use `getValues()` here — it always reads the CURRENT form state
        // synchronously — to enforce Steam-primary cover and background art one final time.
        const steamId = igdbData.steamAppId;
        if (steamId) {
          const steamCoverUrl = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${steamId}/library_600x900_2x.jpg`;
          const steamBackgroundUrl = `https://shared.steamstatic.com/store_item_assets/steam/apps/${steamId}/library_hero_2x.jpg`;
          
          const currentCover = getValues('coverImageUrl');
          const isCoverManagedNow = !currentCover || currentCover.includes('images.igdb.com') || currentCover.includes('steamstatic.com');
          if (isCoverManagedNow && currentCover !== steamCoverUrl) {
            setValue('coverImageUrl', steamCoverUrl, { shouldDirty: true });
          }

          const currentBackground = getValues('backgroundImageUrl');
          const isBackgroundManagedNow = !currentBackground || currentBackground.includes('images.igdb.com') || currentBackground.includes('steamstatic.com');
          if (isBackgroundManagedNow && currentBackground !== steamBackgroundUrl) {
            setValue('backgroundImageUrl', steamBackgroundUrl, { shouldDirty: true });
          }
          
          // Also ensure steamAppId is persisted if it wasn't already
          if (!getValues('steamAppId')) {
            setValue('steamAppId', steamId, { shouldDirty: true });
          }
        }
      } catch (err) {
        console.error('IGDB auto-fetch error:', err);
      } finally {
        setIsFetchingIgdb(false);
      }
    };

    autoFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingGame]);

  // Handle IGDB search selection (always overwrite with selected game data)
  const handleIgdbSelect = (gameData: IgdbGameData) => {
    applyIgdbData(gameData, true);
  };

  // Re-fetch IGDB data for the currently linked igdbId
  const handleRefreshIgdb = async () => {
    if (!igdbId) {
      addToast({ message: 'No IGDB game linked yet — use IGDB search above', type: 'error' });
      return;
    }
    setIsFetchingIgdb(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${backendUrl}/api/games/igdb-search?id=${igdbId}&refresh=1`);
      if (!res.ok) throw new Error('Not found on IGDB');
      const { data } = await res.json();
      applyIgdbData(data as IgdbGameData, false);
      addToast({ message: 'IGDB data refreshed!', type: 'success' });
    } catch {
      addToast({ message: 'Could not refresh from IGDB', type: 'error' });
    } finally {
      setIsFetchingIgdb(false);
    }
  };

  const onSubmit = async (data: GameFormData) => {
    setIsSubmitting(true);
    try {
      const url = mode === 'create' ? '/api/games' : `/api/games/${existingGame?.data?.slug || gameId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const payload = {
        ...data,
        platforms: data.platforms ? data.platforms.split(',').map(s => s.trim()).filter(Boolean) : [],
        genres: data.genres ? data.genres.split(',').map(s => s.trim()).filter(Boolean) : [],
        tags: data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        releaseDate: data.releaseDate ? new Date(data.releaseDate).toISOString() : undefined,
        coverImageUrl: data.coverImageUrl || undefined,
        backgroundImageUrl: data.backgroundImageUrl || undefined,
        trailerUrl: data.trailerUrl || undefined,
        metacritic: data.metacritic ? Number(data.metacritic) : undefined,
        website: data.website || undefined,
        redditUrl: data.redditUrl || undefined,
        esrbRating: data.esrbRating || undefined,
        pegiRating: data.pegiRating || undefined,
        regionalReleaseDates: (data.regionalReleaseDateEU || data.regionalReleaseDateJP || data.regionalReleaseDateNA)
          ? { eu: data.regionalReleaseDateEU, jp: data.regionalReleaseDateJP, na: data.regionalReleaseDateNA }
          : undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save game');

      // If this game is linked to an IGDB entry, trigger the full IGDB sync
      // (writes all the rich JSON columns via mapIGDBGameToDb on the backend)
      const savedGameId = result.data?.id || gameId;
      if (igdbId && savedGameId) {
        try {
          await fetch('/api/admin/games/import-igdb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ igdbId, gameId: savedGameId }),
          });
        } catch (err) {
          console.error('IGDB sync error:', err);
        }
      }

      const savedSlug = result.data?.slug || existingGame?.data?.slug;
      await revalidateGamePage(savedSlug);

      addToast({ message: `Game ${mode === 'create' ? 'created' : 'updated'} successfully.`, type: 'success' });
      router.push('/admin/games');
      router.refresh();
    } catch (err: unknown) {
      addToast({ message: err instanceof Error ? err.message : 'Unknown error', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'edit' && !existingGame && !fetchError) {
    return (
      <div className="p-8 text-center space-y-2">
        <div className="text-text-muted text-sm">Loading game data...</div>
        {isFetchingIgdb && <div className="text-accent text-xs flex items-center justify-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" /> Fetching IGDB data...</div>}
      </div>
    );
  }

  const platformList = watchAll.platforms ? watchAll.platforms.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const genreList = watchAll.genres ? watchAll.genres.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const storeLinks = [
    { name: 'Steam', url: igdbWebsites.steam },
    { name: 'GOG', url: igdbWebsites.gog },
    { name: 'Epic Games', url: igdbWebsites.epicgames },
    { name: 'itch.io', url: igdbWebsites.itch },
  ].filter(s => s.url);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/games" className="p-2 hover:bg-bg-elevated rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {mode === 'create' ? 'Create New Game' : 'Edit Game'}
            </h1>
            {isFetchingIgdb && (
              <p className="text-xs text-accent flex items-center gap-1 mt-0.5">
                <RefreshCw className="w-3 h-3 animate-spin" /> Syncing with IGDB...
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleRefreshIgdb}
              disabled={isFetchingIgdb}
              title="Re-fetch IGDB data for missing fields"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium text-text-muted hover:bg-bg-elevated transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingIgdb ? 'animate-spin' : ''}`} />
              Sync IGDB
            </button>
          )}
          <Button type="button" onClick={handleSubmit(onSubmit)} loading={isSubmitting} className="gap-2">
            <Save className="w-4 h-4" /> Save Game
          </Button>
        </div>
      </div>

      {/* IGDB Search — available in both modes */}
      <div className="bg-bg-surface border border-accent/30 rounded-xl p-4 space-y-1">
        <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">
          🎮 IGDB Auto-Fill {mode === 'edit' ? '— Overwrites current values' : ''}
        </p>
        <IgdbSearch onSelectGame={handleIgdbSelect} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* -- Basic Info -- */}
        <FormSection title="Basic Info" icon={<Gamepad2 className="w-4 h-4 text-accent" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Game Title *">
              <input {...register('title')} className={inputCls} placeholder="e.g. Cyberpunk 2077" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </Field>
            <Field label="URL Slug *" hint="Auto-generated from title">
              <input {...register('slug')} className={`${inputCls} font-mono`} placeholder="cyberpunk-2077" />
              {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
            </Field>
          </div>
          <Field label="Description">
            <textarea {...register('description')} rows={4} className={textareaCls} placeholder="Short description of the game..." />
          </Field>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Release Status</span>
            <span
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
              style={{ backgroundColor: STATUS_BADGE_COLORS[displayReleaseStatus] || '#64748b' }}
            >
              {displayReleaseStatus}
            </span>
          </div>
        </FormSection>

        {/* -- Metadata -- */}
        <FormSection title="Metadata" icon={<BarChart2 className="w-4 h-4 text-blue-400" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Developer">
              <input {...register('developer')} className={inputCls} placeholder="CD Projekt Red" />
            </Field>
            <Field label="Publisher">
              <input {...register('publisher')} className={inputCls} placeholder="CD Projekt" />
            </Field>
            <Field label="Release Date (Global/Primary)">
              <input type="date" {...register('releaseDate')} className={inputCls} />
            </Field>
            <Field label="Regional Release (EU)">
              <input type="date" {...register('regionalReleaseDateEU')} className={inputCls} />
            </Field>
            <Field label="Regional Release (Japan)">
              <input type="date" {...register('regionalReleaseDateJP')} className={inputCls} />
            </Field>
            <Field label="Regional Release (NA)">
              <input type="date" {...register('regionalReleaseDateNA')} className={inputCls} />
            </Field>
            <Field label="Trailer URL" hint="YouTube link">
              <input {...register('trailerUrl')} className={inputCls} placeholder="https://youtube.com/watch?v=..." />
            </Field>
            <SteamAppIdField
              value={watchedSteamAppId || ''}
              register={register}
              inputCls={inputCls}
            />
            <Field label="Platforms" hint="Comma-separated">
              <input {...register('platforms')} className={inputCls} placeholder="PC, PlayStation 5, Xbox Series X/S" />
              {platformList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {platformList.map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 bg-blue-900/30 text-blue-300 border border-blue-700/40 rounded-full">{p}</span>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Genres" hint="Comma-separated">
              <input {...register('genres')} className={inputCls} placeholder="Action, RPG, Open World" />
              {genreList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {genreList.map(g => (
                    <span key={g} className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full">{g}</span>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Tags" hint="Comma-separated (themes + keywords from IGDB)">
              <input {...register('tags')} className={inputCls} placeholder="Open World, Story Rich, Singleplayer..." />
            </Field>
          </div>

          {/* Game Engine (IGDB, read-only) */}
          {igdbGameEngine && (
            <Field label="Game Engine" hint="From IGDB">
              <input value={igdbGameEngine} readOnly className={`${inputCls} opacity-70 cursor-not-allowed`} />
            </Field>
          )}

          {/* Game Modes (IGDB, read-only) */}
          {igdbGameModes.length > 0 && (
            <Field label="Game Modes" hint="From IGDB">
              <div className="flex flex-wrap gap-2">
                {igdbGameModes.map(m => (
                  <span key={m} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-bg-elevated border border-border rounded-full text-text-primary">
                    <span>{GAME_MODE_ICONS[m] || '🎯'}</span> {m}
                  </span>
                ))}
              </div>
            </Field>
          )}
        </FormSection>

        {/* -- Scores & Ratings -- */}
        <FormSection title="Scores & Ratings" icon={<Star className="w-4 h-4 text-yellow-400" />} defaultOpen={true}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Critic Rating (IGDB)" hint="Aggregated critic score, out of 100">
              <input type="number" {...register('metacritic')} className={inputCls} placeholder="85" min="0" max="100" />
            </Field>
            <Field label="ESRB Rating">
              <input {...register('esrbRating')} className={inputCls} placeholder="Mature" />
            </Field>
            <Field label="PEGI Rating">
              <input {...register('pegiRating')} className={inputCls} placeholder="18" />
            </Field>
          </div>

          {/* IGDB stats (read-only display) */}
          {(igdbStats.igdbCommunityRating != null || igdbStats.aggregatedRating != null || igdbStats.igdbFollows != null || igdbStats.igdbHypes != null) && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {igdbStats.igdbCommunityRating != null && (
                <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">IGDB Community</p>
                  <p className="text-sm font-bold text-text-primary">{igdbStats.igdbCommunityRating.toFixed(1)} / 100</p>
                </div>
              )}
              {igdbStats.aggregatedRating != null && (
                <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Critic Aggregate</p>
                  <p className="text-sm font-bold text-text-primary">{igdbStats.aggregatedRating.toFixed(1)} / 100</p>
                </div>
              )}
              {igdbStats.igdbFollows != null && (
                <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Follows</p>
                  <p className="text-sm font-bold text-text-primary">{igdbStats.igdbFollows.toLocaleString()}</p>
                </div>
              )}
              {igdbStats.igdbHypes != null && (
                <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Hypes</p>
                  <p className="text-sm font-bold text-text-primary">{igdbStats.igdbHypes.toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </FormSection>

        {/* -- Links -- */}
        <FormSection title="External Links" icon={<ExternalLink className="w-4 h-4 text-green-400" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Official Website">
              <input {...register('website')} className={inputCls} placeholder="https://www.cyberpunk.net" />
              {watchAll.website && (
                <a href={watchAll.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent mt-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Visit site
                </a>
              )}
            </Field>
            <Field label="Reddit URL">
              <input {...register('redditUrl')} className={inputCls} placeholder="https://reddit.com/r/..." />
              {watchAll.redditUrl && (
                <a href={watchAll.redditUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-orange-400 mt-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Visit reddit
                </a>
              )}
            </Field>
          </div>

          {/* Store links */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Store Links</p>
            <p className="text-[11px] text-text-dim mb-2">
              Store links (Steam, GOG, Epic, itch.io) are auto-populated from IGDB and ITAD.
            </p>
            {storeLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {storeLinks.map(store => (
                  <a
                    key={store.name}
                    href={store.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-elevated border border-border rounded-lg text-xs font-medium text-text-primary hover:border-accent/50 hover:text-accent transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {store.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </FormSection>

        {/* -- Images -- */}
        <FormSection title="Images" icon={<ImageIcon className="w-4 h-4 text-purple-400" />}>

          {/* Cover image (2:3) */}
          <Field label="COVER IMAGE (2:3)" hint="Portrait 2:3 cover. Sourced from Steam's library art when available, otherwise IGDB. Used on game grid and game detail page.">
            {coverImageUrl && (
              <div className="mb-2 relative w-[200px] aspect-[2/3] rounded-lg overflow-hidden border border-border">
                <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
              </div>
            )}
            <input {...register('coverImageUrl')} className={`${inputCls} font-mono`} placeholder="https://... (paste URL)" />
            <div className="mt-2">
              <ImageUploader value={coverImageUrl || ''} onChange={(url) => setValue('coverImageUrl', url)} />
            </div>
          </Field>

          {/* Background image (16:9) */}
          <Field label="BACKGROUND IMAGE" hint="Wide 16:9 hero image — auto-filled from IGDB artworks. Used as blurred backdrop on game detail page (desktop). Portrait cover is used on mobile.">
            <div className="mb-2 relative w-full max-w-[400px] aspect-[16/9] rounded-lg overflow-hidden border border-border bg-bg-elevated">
              {backgroundImageUrl ? (
                <img src={backgroundImageUrl} alt="Background preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </div>
            <input {...register('backgroundImageUrl')} className={`${inputCls} font-mono`} placeholder="https://images.igdb.com/igdb/image/upload/t_1080p/..." />
            <div className="mt-2">
              <ImageUploader value={backgroundImageUrl || ''} onChange={(url) => setValue('backgroundImageUrl', url)} />
            </div>
          </Field>

        </FormSection>

        {/* -- Identity -- */}
        <FormSection title="Identity & Slug" defaultOpen={false}>
          <Field label="URL Slug" hint="Changing this will break existing URLs.">
            <input {...register('slug')} className={`${inputCls} font-mono`} />
            {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
          </Field>
        </FormSection>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" loading={isSubmitting} className="gap-2 px-6">
            <Save className="w-4 h-4" /> Save Game
          </Button>
        </div>
      </form>
    </div>
  );
}
