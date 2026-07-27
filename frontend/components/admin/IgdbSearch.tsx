'use client';

import { useState, useEffect } from 'react';import { Spinner } from '@/components/ui/Spinner';

import { Search } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

interface IgdbSearchResult {
  igdbId: number;
  name: string;
  coverUrl: string | null;
  releaseYear: number | null;
  platforms: string[];
  genres: string[];
  developer: string | null;
  summary: string | null;
  releaseStatus: string;
}

export interface IgdbCompanyEntry {
  name: string;
  logoUrl: string | null;
  role: 'Developer' | 'Publisher' | 'Porting' | 'Supporting';
}

export interface IgdbReleaseDateEntry {
  platform?: string;
  date: string | null;
  region: string;
}

export interface IgdbMediaEntry {
  name?: string;
  coverUrl: string | null;
  releaseDate: string | null;
}

export interface IgdbSimilarGameEntry {
  name: string;
  slug: string;
  coverUrl: string | null;
  rating?: number;
  platforms: string[];
}

export interface IgdbVideoEntry {
  videoId: string;
  name?: string;
  youtubeEmbedUrl: string;
}

export interface IgdbWebsiteLinks {
  official?: string;
  wikia?: string;
  wikipedia?: string;
  facebook?: string;
  twitter?: string;
  twitch?: string;
  instagram?: string;
  youtube?: string;
  steam?: string;
  reddit?: string;
  discord?: string;
  epicgames?: string;
  gog?: string;
  itch?: string;
}

export interface IgdbMultiplayerModeEntry {
  onlineCoop?: boolean;
  lanCoop?: boolean;
  offlineCoop?: boolean;
  splitscreen?: boolean;
  onlineCoopMax?: number;
  offlineCoopMax?: number;
}

export interface IgdbLanguageSupportEntry {
  language?: string;
  type?: string;
}

export interface IgdbGameData {
  igdbId: number;
  name?: string;
  igdbSlug?: string;
  description?: string;
  storyline?: string;
  releaseStatus: string;
  coverImageUrl?: string;
  steamAppId?: string;
  backgroundImageUrl?: string;
  screenshotUrls: string[];
  artworkUrls: string[];
  developer?: string;
  publisher?: string;
  allCompanies: IgdbCompanyEntry[];
  releaseDate?: string;
  releaseDatesByPlatform: IgdbReleaseDateEntry[];
  platforms?: string;
  genres?: string;
  themes?: string;
  keywords?: string;
  gameModes: string[];
  playerPerspectives: string[];
  gameEngine?: string;
  esrbRating?: string;
  pegiRating?: string;
  aggregatedRating?: number;
  aggregatedRatingCount?: number;
  igdbCommunityRating?: number;
  igdbCommunityRatingCount?: number;
  totalRating?: number;
  totalRatingCount?: number;
  igdbFollows?: number;
  igdbHypes?: number;
  franchiseNames: string[];
  collectionName?: string;
  dlcs: IgdbMediaEntry[];
  expansions: IgdbMediaEntry[];
  similarGames: IgdbSimilarGameEntry[];
  videos: IgdbVideoEntry[];
  websites: IgdbWebsiteLinks;
  multiplayerModes: IgdbMultiplayerModeEntry | null;
  languageSupports: IgdbLanguageSupportEntry[];
  igdbUrl?: string;
}

interface IgdbSearchProps {
  onSelectGame: (gameData: IgdbGameData) => void;
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  'Early Access': '#f59e0b',
  Cancelled: '#e11d48',
  Beta: '#7b5cfa',
  Alpha: '#06b6d4',
  Offline: '#64748b',
  Rumored: '#64748b',
};

export default function IgdbSearch({ onSelectGame }: IgdbSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IgdbSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const { addToast } = useUIStore();

  useEffect(() => {
    const searchIgdb = async () => {
      if (!query.trim()) { setResults([]); return; }
      setIsSearching(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/games/igdb-search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch from IGDB');
        const data = await res.json();
        setResults(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };
    const debounce = setTimeout(searchIgdb, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = async (game: IgdbSearchResult) => {
    setIsFetchingDetails(true);
    setResults([]);
    setQuery('');
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${backendUrl}/api/games/igdb-search?id=${game.igdbId}&refresh=1`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch game details');
      const { data } = await res.json();

      onSelectGame({ ...data, name: game.name } as IgdbGameData);
      addToast({ message: `"${game.name}" auto-filled from IGDB!`, type: 'success' });
    } catch (err) {
      console.error(err);
      addToast({ message: 'Error fetching game details from IGDB', type: 'error' });
    } finally {
      setIsFetchingDetails(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search IGDB to auto-fill all details..."
          className="w-full bg-bg-surface border border-border rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:border-accent-light text-sm"
        />
        {(isSearching || isFetchingDetails) && (
          <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-light w-5 h-5 animate-spin" />
        )}
      </div>
      {results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-bg-surface border border-border rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {results.map((game) => (
            <button
              key={game.igdbId}
              type="button"
              onClick={() => handleSelect(game)}
              className="w-full flex items-center gap-3 p-3 hover:bg-bg-elevated text-left transition-colors border-b border-border last:border-b-0"
            >
              {game.coverUrl ? (
                <img src={game.coverUrl} alt={game.name} className="w-12 aspect-[3/4] object-cover rounded shrink-0" />
              ) : (
                <div className="w-12 aspect-[3/4] bg-bg-primary rounded flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4 text-text-muted" />
                </div>
              )}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium text-text-primary text-sm flex items-center gap-2">
                  {game.name}
                  {game.releaseStatus !== 'Released' && (
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: STATUS_BADGE_COLORS[game.releaseStatus] || '#64748b' }}
                    >
                      {game.releaseStatus}
                    </span>
                  )}
                </span>
                <span className="text-xs text-text-muted truncate">
                  {game.releaseYear ?? '—'}
                  {game.platforms.length > 0 ? ` · ${game.platforms.slice(0, 3).join(', ')}` : ''}
                  {game.developer ? ` · ${game.developer}` : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
