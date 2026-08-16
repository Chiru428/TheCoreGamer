import { redis, cacheGet } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma";
import type { Game } from "@/generated/prisma";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE = "https://api.igdb.com/v4";
const TOKEN_CACHE_KEY = "igdb:token";

// ============================================================================
// Types
// ============================================================================

export interface IGDBImage {
  id: number;
  image_id: string;
}

export interface IGDBCompany {
  id: number;
  company: {
    id: number;
    name: string;
    logo?: IGDBImage;
  };
  developer?: boolean;
  publisher?: boolean;
  porting?: boolean;
  supporting?: boolean;
}

export interface IGDBPlatform {
  id: number;
  name: string;
  abbreviation?: string;
}

interface IGDBNamedEntity {
  id: number;
  name: string;
}

interface IGDBFranchise {
  id: number;
  name: string;
  slug: string;
}

export interface IGDBVideo {
  id: number;
  video_id: string;
  name?: string;
}

interface IGDBAgeRating {
  id: number;
  organization: number; // 1 = ESRB, 2 = PEGI
  rating_category: number;
}

export interface IGDBDlc {
  id: number;
  name: string;
  cover?: IGDBImage;
  first_release_date?: number;
  version_parent?: number;
  category?: string;
}

export interface IGDBSimilarGame {
  id: number;
  name: string;
  slug: string;
  cover?: IGDBImage;
  aggregated_rating?: number;
  platforms?: IGDBPlatform[];
}

export interface IGDBReleaseDate {
  id: number;
  date?: number;
  platform?: { name: string };
  region?: number;
}

export interface IGDBWebsite {
  id: number;
  // IGDB API v4 calls this field "type" (the old "category" field is no
  // longer returned by the API, though the enum values are unchanged).
  // 22 = Xbox Store and 23 = PlayStation Store are newer additions not
  // covered by most third-party docs/enums, confirmed against live API data.
  type: number;
  url: string;
}

export interface IGDBLanguageSupport {
  id: number;
  language?: { name: string };
  language_support_type?: { name: string };
}

export interface IGDBMultiplayerMode {
  id: number;
  onlinecoop?: boolean;
  lancoop?: boolean;
  offlinecoop?: boolean;
  splitscreen?: boolean;
  onlinecoopmax?: number;
  offlinecoopmax?: number;
}

export interface IGDBGame {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  status?: number;
  first_release_date?: number; // unix seconds
  cover?: IGDBImage;
  screenshots?: IGDBImage[];
  artworks?: IGDBImage[];
  videos?: IGDBVideo[];
  involved_companies?: IGDBCompany[];
  platforms?: IGDBPlatform[];
  genres?: IGDBNamedEntity[];
  themes?: IGDBNamedEntity[];
  keywords?: IGDBNamedEntity[];
  game_modes?: IGDBNamedEntity[];
  player_perspectives?: IGDBNamedEntity[];
  game_engines?: IGDBNamedEntity[];
  age_ratings?: IGDBAgeRating[];
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  rating?: number;
  rating_count?: number;
  total_rating?: number;
  total_rating_count?: number;
  follows?: number;
  hypes?: number;
  franchises?: IGDBFranchise[];
  collections?: IGDBNamedEntity[];
  dlcs?: IGDBDlc[];
  expansions?: IGDBDlc[];
  standalone_expansions?: IGDBDlc[];
  remakes?: IGDBDlc[];
  remasters?: IGDBDlc[];
  bundles?: IGDBDlc[];
  expanded_games?: IGDBDlc[];
  similar_games?: IGDBSimilarGame[];
  release_dates?: IGDBReleaseDate[];
  websites?: IGDBWebsite[];
  language_supports?: IGDBLanguageSupport[];
  multiplayer_modes?: IGDBMultiplayerMode[];
  url?: string;
}

// ============================================================================
// Twitch OAuth token manager
// ============================================================================

async function fetchNewToken(): Promise<string> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("[IGDB] IGDB_CLIENT_ID / IGDB_CLIENT_SECRET not set");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const res = await fetch(`${TWITCH_TOKEN_URL}?${params.toString()}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`[IGDB] Twitch token request failed: ${res.status} ${await res.text()}`);
  }

  const data: { access_token: string; expires_in: number } = await res.json();

  // Cache with a 60s safety margin so we never use a token at the edge of expiry
  const ttl = Math.max(data.expires_in - 60, 60);
  await redis.set(TOKEN_CACHE_KEY, data.access_token, { ex: ttl });

  return data.access_token;
}

async function getToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    try {
      const cached = await cacheGet<string>(TOKEN_CACHE_KEY);
      if (cached) return cached;
    } catch (err) {
      logger.warn({ err }, "[IGDB] Token cache read failed — fetching fresh token");
    }
  }
  return fetchNewToken();
}

// ============================================================================
// IGDB request helper
// ============================================================================

async function igdbFetch<T>(endpoint: string, body: string): Promise<T> {
  const clientId = process.env.IGDB_CLIENT_ID;
  if (!clientId) {
    throw new Error("[IGDB] IGDB_CLIENT_ID not set");
  }

  const doRequest = async (token: string) =>
    fetch(`${IGDB_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body,
    });

  let res = await doRequest(await getToken());

  // Token may have been revoked before its TTL — refresh once and retry
  if (res.status === 401) {
    logger.warn("[IGDB] 401 from IGDB — refreshing Twitch token and retrying");
    res = await doRequest(await getToken(true));
  }

  if (!res.ok) {
    throw new Error(`[IGDB] ${endpoint} request failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

// Apicalypse field list shared by search and single-game lookups.
// involved_companies.developer/publisher/porting/supporting flags are needed
// to split the company list into roles for allCompaniesJson + developer/publisher.
const GAME_FIELDS = [
  "id",
  "name",
  "slug",
  "summary",
  "storyline",
  "status",
  "first_release_date",
  "cover.image_id",
  "screenshots.image_id",
  "artworks.image_id",
  "videos.video_id",
  "videos.name",
  "involved_companies.company.name",
  "involved_companies.company.logo.image_id",
  "involved_companies.developer",
  "involved_companies.publisher",
  "involved_companies.porting",
  "involved_companies.supporting",
  "platforms.name",
  "platforms.abbreviation",
  "genres.name",
  "themes.name",
  "keywords.name",
  "game_modes.name",
  "player_perspectives.name",
  "game_engines.name",
  "age_ratings.organization",
  "age_ratings.rating_category",
  "aggregated_rating",
  "aggregated_rating_count",
  "rating",
  "rating_count",
  "total_rating",
  "total_rating_count",
  "follows",
  "hypes",
  "franchises.name",
  "franchises.slug",
  "collections.name",
  "dlcs.name",
  "dlcs.cover.image_id",
  "dlcs.first_release_date",
  "expansions.name",
  "expansions.cover.image_id",
  "expansions.first_release_date",
  "standalone_expansions.name",
  "standalone_expansions.cover.image_id",
  "standalone_expansions.first_release_date",
  "remakes.name",
  "remakes.cover.image_id",
  "remakes.first_release_date",
  "remasters.name",
  "remasters.cover.image_id",
  "remasters.first_release_date",
  "bundles.name",
  "bundles.cover.image_id",
  "bundles.first_release_date",
  "expanded_games.name",
  "expanded_games.cover.image_id",
  "expanded_games.first_release_date",
  "similar_games.name",
  "similar_games.slug",
  "similar_games.cover.image_id",
  "similar_games.aggregated_rating",
  "similar_games.platforms.name",
  "release_dates.date",
  "release_dates.platform.name",
  "release_dates.region",
  "websites.type",
  "websites.url",
  "language_supports.language.name",
  "language_supports.language_support_type.name",
  "multiplayer_modes.onlinecoop",
  "multiplayer_modes.lancoop",
  "multiplayer_modes.offlinecoop",
  "multiplayer_modes.splitscreen",
  "multiplayer_modes.onlinecoopmax",
  "multiplayer_modes.offlinecoopmax",
  "url",
].join(",");

// ============================================================================
// Public API
// ============================================================================

export async function searchIGDB(query: string): Promise<IGDBGame[]> {
  // Escape double quotes so user input can't break out of the Apicalypse string
  const safeQuery = query.replace(/"/g, '\\"');
  const body = `search "${safeQuery}"; fields ${GAME_FIELDS}; limit 20;`;
  return igdbFetch<IGDBGame[]>("games", body);
}

export async function getIGDBGame(igdbId: number): Promise<IGDBGame> {
  const body = `fields ${GAME_FIELDS}; where id = ${igdbId};`;
  const results = await igdbFetch<IGDBGame[]>("games", body);
  if (!results.length) {
    throw new Error(`[IGDB] Game ${igdbId} not found`);
  }
  const game = results[0];

  // Games already linked via the expansions/standalone_expansions/remakes/remasters/
  // expanded_games relations are rendered under "Expansions" — skip them here to avoid duplicates.
  const expansionIds = new Set(
    [
      ...(game.expansions ?? []),
      ...(game.standalone_expansions ?? []),
      ...(game.remakes ?? []),
      ...(game.remasters ?? []),
      ...(game.expanded_games ?? []),
    ].map((e) => e.id)
  );
  // Games IGDB already lists under the dlcs/bundles relations — keep their
  // existing "DLC"/"Bundle" labels rather than relabelling as "Pack".
  const dlcIds = new Set((game.dlcs ?? []).map((d) => d.id));
  const bundleIds = new Set((game.bundles ?? []).map((d) => d.id));

  try {
    const childrenBody = `fields name,category,cover.image_id,first_release_date,version_parent; where parent_game = ${igdbId} | version_parent = ${igdbId}; limit 50;`;
    const children = await igdbFetch<any[]>("games", childrenBody);

    for (const child of children) {
      if (expansionIds.has(child.id)) continue;

      // Skip mods (5) and forks (12) entirely
      if (child.category === 5 || child.category === 12) continue;

      // category 2 = expansion, 4 = standalone_expansion, 8 = remake, 9 = remaster, 10 = expanded_game
      if ([2, 4, 8, 9, 10].includes(child.category)) {
        game.expansions = game.expansions || [];
        if (!game.expansions.some(e => e.id === child.id)) {
          game.expansions.push({
            id: child.id,
            name: child.name,
            cover: child.cover,
            first_release_date: child.first_release_date,
          });
        }
        continue;
      }

      // Different purchasable version of the same game (Operator Edition, Dark Edition, etc.)
      const isEdition = child.version_parent === igdbId;
      // category 7 = season, 6 = episode — also catch untagged "Season N" / "Episode N" content
      const isSeason = child.category === 7 || child.category === 6 || /season|episode/i.test(child.name ?? "");

      let category: string;
      if (isEdition) category = "Edition";
      else if (isSeason) category = "Season";
      else if (dlcIds.has(child.id)) category = "DLC";
      else if (bundleIds.has(child.id)) category = "Bundle";
      // Content related to the game but not in IGDB's dlcs/bundles relations —
      // matches IGDB's own "Packs/Addons" grouping.
      else category = "Pack";

      const childObj: IGDBDlc = {
        id: child.id,
        name: child.name,
        cover: child.cover,
        first_release_date: child.first_release_date,
        category,
      };

      game.dlcs = game.dlcs || [];
      if (!game.dlcs.some(d => d.id === child.id)) {
        game.dlcs.push(childObj);
      }
    }
  } catch (err) {
    logger.warn({ err }, `[IGDB] Failed to fetch children for game ${igdbId}`);
  }

  return game;
}

export type IGDBImageSize =
  | "cover_big"
  | "cover_small"
  | "screenshot_big"
  | "screenshot_huge"
  | "screenshot_med"
  | "720p"
  | "1080p";

export function buildIGDBImageUrl(imageId: string, size: IGDBImageSize = "cover_big"): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

// Steam's library capsule art (2:3 aspect ratio) — preferred cover source when
// a Steam app ID is available, since it's higher quality than IGDB's cover art.
export function buildSteamCoverUrl(steamAppId: string): string {
  return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900_2x.jpg`;
}

// Resolves a game's cover image: Steam's library capsule art if a Steam
// store link is present, otherwise falls back to IGDB's cover art.
export function resolveCoverUrl(game: Pick<IGDBGame, "cover" | "websites">): string | null {
  const steamAppId = game.websites
    ?.filter((w) => w.type === 13)
    ?.map((w) => w.url.match(/app\/(\d+)/)?.[1])
    ?.find((id) => !!id);

  if (steamAppId) return buildSteamCoverUrl(steamAppId);
  return game.cover?.image_id ? buildIGDBImageUrl(game.cover.image_id, "1080p") : null;
}

// Resolves a game's background image: Steam's library hero art if a Steam
// store link is present, otherwise falls back to IGDB's artwork or screenshot.
export function resolveBackgroundUrl(game: Pick<IGDBGame, "artworks" | "screenshots" | "websites">): string | null {
  const steamAppId = game.websites
    ?.filter((w) => w.type === 13)
    ?.map((w) => w.url.match(/app\/(\d+)/)?.[1])
    ?.find((id) => !!id);

  if (steamAppId) return `https://shared.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_hero_2x.jpg`;
  
  if (game.artworks?.[0]) return buildIGDBImageUrl(game.artworks[0].image_id, "1080p");
  if (game.screenshots?.[0]) return buildIGDBImageUrl(game.screenshots[0].image_id, "screenshot_huge");
  
  return null;
}

// ============================================================================
// Enum / lookup mappers
// ============================================================================

// IGDB game status enum → human-readable release status
const STATUS_LABELS: Record<number, string> = {
  0: "Released",
  2: "Alpha",
  3: "Beta",
  4: "Early Access",
  5: "Offline",
  6: "Cancelled",
  7: "Rumored",
};

export function mapIGDBStatus(status?: number, firstReleaseDate?: number): string {
  const mappedStatus = status != null ? STATUS_LABELS[status] : null;
  
  if (mappedStatus && mappedStatus !== "Released") {
    return mappedStatus;
  }
  
  if (firstReleaseDate != null) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (firstReleaseDate > nowSeconds) {
      return "Coming Soon";
    }
  }

  return "Released";
}

// IGDB age_rating_categories.id → human-readable labels (organization 1 = ESRB)
const ESRB_RATINGS: Record<number, string> = {
  1: "RP",
  2: "EC",
  3: "E",
  4: "E10+",
  5: "T",
  6: "M",
  7: "AO",
};

// IGDB age_rating_categories.id → human-readable labels (organization 2 = PEGI)
const PEGI_RATINGS: Record<number, string> = {
  8: "3",
  9: "7",
  10: "12",
  11: "16",
  12: "18",
};

export function mapIGDBEsrb(
  ageRatings: { organization: number; rating_category: number }[] | undefined,
  organization: 1
): string | undefined {
  const esrb = ageRatings?.find((r) => r.organization === organization);
  return esrb ? ESRB_RATINGS[esrb.rating_category] : undefined;
}

export function mapIGDBPegi(
  ageRatings: { organization: number; rating_category: number }[] | undefined,
  organization: 2
): string | undefined {
  const pegi = ageRatings?.find((r) => r.organization === organization);
  return pegi ? PEGI_RATINGS[pegi.rating_category] : undefined;
}

// IGDB release_dates.region enum → human-readable region names
const REGION_LABELS: Record<number, string> = {
  1: "Europe",
  2: "North America",
  3: "Australia",
  4: "New Zealand",
  5: "Japan",
  6: "China",
  7: "Asia",
  8: "Worldwide",
  9: "Korea",
  10: "Brazil",
};

export function mapIGDBRegion(region?: number): string {
  if (region == null) return "Worldwide";
  return REGION_LABELS[region] ?? "Worldwide";
}

// ============================================================================
// Full IGDB → game-detail-page mapping
// ============================================================================

export interface IGDBCompanyEntry {
  name: string;
  logoUrl: string | null;
  role: "Developer" | "Publisher" | "Porting" | "Supporting";
}

export interface IGDBReleaseDateEntry {
  platform: string | undefined;
  date: string | null;
  region: string;
}

export interface IGDBMediaEntry {
  name: string | undefined;
  coverUrl: string | null;
  releaseDate: string | null;
  category?: string;
}

export interface IGDBSimilarGameEntry {
  name: string;
  slug: string;
  coverUrl: string | null;
  rating: number | undefined;
  platforms: string[];
}

export interface IGDBVideoEntry {
  videoId: string;
  name: string | undefined;
  youtubeEmbedUrl: string;
}

export interface IGDBWebsiteLinks {
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
  xbox?: string;
  playstation?: string;
  bluesky?: string;
}

export interface IGDBMultiplayerModeEntry {
  onlineCoop?: boolean;
  lanCoop?: boolean;
  offlineCoop?: boolean;
  splitscreen?: boolean;
  onlineCoopMax?: number;
  offlineCoopMax?: number;
}

export interface IGDBLanguageSupportEntry {
  language: string | undefined;
  type: string | undefined;
}

/**
 * Full mapping of an IGDB game payload into the shape consumed by the
 * game detail page (and persisted into Game's IGDB columns).
 */
export interface IGDBFullGame {
  igdbId: number;
  igdbSlug: string | undefined;
  description: string | undefined;
  storyline: string | undefined;
  releaseStatus: string;
  coverImageUrl: string | undefined;
  steamAppId: string | undefined;
  backgroundImageUrl: string | undefined;
  screenshotUrls: string[];
  artworkUrls: string[];
  developer: string | undefined;
  publisher: string | undefined;
  allCompanies: IGDBCompanyEntry[];
  releaseDate: string | undefined;
  releaseDatesByPlatform: IGDBReleaseDateEntry[];
  platforms: string | undefined;
  genres: string | undefined;
  themes: string | undefined;
  keywords: string | undefined;
  gameModes: string[];
  playerPerspectives: string[];
  gameEngine: string | undefined;
  esrbRating: string | undefined;
  pegiRating: string | undefined;
  aggregatedRating: number | undefined;
  aggregatedRatingCount: number | undefined;
  totalRating: number | undefined;
  totalRatingCount: number | undefined;

  igdbHypes: number | undefined;
  collectionName: string | undefined;
  dlcs: IGDBMediaEntry[];
  expansions: IGDBMediaEntry[];
  similarGames: IGDBSimilarGameEntry[];
  videos: IGDBVideoEntry[];
  websites: IGDBWebsiteLinks;
  multiplayerModes: IGDBMultiplayerModeEntry | null;
  languageSupports: IGDBLanguageSupportEntry[];
  igdbUrl: string | undefined;
}

// When the same release (e.g. "X: Deluxe Edition") shows up under multiple IGDB
// relations — typically as both a version (Edition) and a bundle (Bundle) — keep
// only the most specific category instead of listing it twice.
const DLC_CATEGORY_PRIORITY: Record<string, number> = {
  Edition: 0,
  Season: 1,
  DLC: 2,
  Bundle: 3,
  Remaster: 4,
  Remake: 5,
  "Standalone Expansion": 6,
  Expansion: 7,
  "Expanded Game": 8,
};

function dedupeMediaEntries(entries: IGDBMediaEntry[]): IGDBMediaEntry[] {
  const byName = new Map<string, IGDBMediaEntry>();
  for (const entry of entries) {
    const key = entry.name?.trim().toLowerCase();
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, entry);
      continue;
    }
    const existingPriority = DLC_CATEGORY_PRIORITY[existing.category ?? "DLC"] ?? 99;
    const newPriority = DLC_CATEGORY_PRIORITY[entry.category ?? "DLC"] ?? 99;
    if (newPriority < existingPriority) {
      byName.set(key, entry);
    }
  }
  return Array.from(byName.values());
}

export function mapIGDBToDb(igdb: IGDBGame): IGDBFullGame {
  const steamAppId = igdb.websites?.find((w) => w.type === 13)?.url?.match(/app\/(\d+)/)?.[1];

  return {
    igdbId: igdb.id,
    igdbSlug: igdb.slug,
    description: igdb.summary,
    storyline: igdb.storyline,
    releaseStatus: mapIGDBStatus(igdb.status, igdb.first_release_date),
    coverImageUrl: resolveCoverUrl(igdb) ?? undefined,
    steamAppId,
    backgroundImageUrl: resolveBackgroundUrl(igdb) ?? undefined,
    screenshotUrls: igdb.screenshots?.map((s) => buildIGDBImageUrl(s.image_id, "1080p")) ?? [],
    artworkUrls: igdb.artworks?.map((a) => buildIGDBImageUrl(a.image_id, "1080p")) ?? [],
    developer: igdb.involved_companies?.filter((c) => c.developer).map((c) => c.company.name).join(", ") || undefined,
    publisher: igdb.involved_companies?.filter((c) => c.publisher).map((c) => c.company.name).join(", ") || undefined,
    allCompanies:
      igdb.involved_companies?.map((c) => ({
        name: c.company.name,
        logoUrl: c.company.logo ? buildIGDBImageUrl(c.company.logo.image_id, "cover_small") : null,
        role: c.developer ? "Developer" : c.publisher ? "Publisher" : c.porting ? "Porting" : "Supporting",
      })) ?? [],
    releaseDate: igdb.first_release_date
      ? new Date(igdb.first_release_date * 1000).toISOString().split("T")[0]
      : undefined,
    releaseDatesByPlatform:
      igdb.release_dates?.map((rd) => ({
        platform: rd.platform?.name,
        date: rd.date ? new Date(rd.date * 1000).toISOString().split("T")[0] : null,
        region: mapIGDBRegion(rd.region),
      })) ?? [],
    platforms: igdb.platforms?.map((p) => p.name).join(", ") || undefined,
    genres: igdb.genres?.map((g) => g.name).join(", ") || undefined,
    themes: igdb.themes?.map((t) => t.name).join(", ") || undefined,
    keywords: igdb.keywords?.slice(0, 20).map((k) => k.name).join(", ") || undefined,
    gameModes: igdb.game_modes?.map((m) => m.name) ?? [],
    playerPerspectives: igdb.player_perspectives?.map((p) => p.name) ?? [],
    gameEngine: igdb.game_engines?.[0]?.name,
    esrbRating: mapIGDBEsrb(igdb.age_ratings, 1),
    pegiRating: mapIGDBPegi(igdb.age_ratings, 2),
    aggregatedRating: igdb.aggregated_rating,
    aggregatedRatingCount: igdb.aggregated_rating_count,
    totalRating: igdb.total_rating,
    totalRatingCount: igdb.total_rating_count,

    igdbHypes: igdb.hypes,
    collectionName: igdb.collections?.[0]?.name,
    dlcs: dedupeMediaEntries(
      [
        ...(igdb.dlcs || []).map((d) => ({ ...d, category: d.category ?? "DLC" })),
        ...(igdb.bundles || []).map((d) => ({ ...d, category: d.category ?? "Bundle" })),
      ].map((d) => ({
        name: d.name,
        coverUrl: d.cover ? buildIGDBImageUrl(d.cover.image_id, "cover_big") : null,
        releaseDate: d.first_release_date ? new Date(d.first_release_date * 1000).toISOString().split("T")[0] : null,
        category: d.category,
      })) ?? []
    ),
    expansions: dedupeMediaEntries(
      [
        ...(igdb.expansions || []).map((e) => ({ ...e, category: "Expansion" })),
        ...(igdb.standalone_expansions || []).map((e) => ({ ...e, category: "Standalone Expansion" })),
        ...(igdb.remakes || []).map((e) => ({ ...e, category: "Remake" })),
        ...(igdb.remasters || []).map((e) => ({ ...e, category: "Remaster" })),
        ...(igdb.expanded_games || []).map((e) => ({ ...e, category: "Expanded Game" })),
      ].map((e) => ({
        name: e.name,
        coverUrl: e.cover ? buildIGDBImageUrl(e.cover.image_id, "cover_big") : null,
        releaseDate: e.first_release_date ? new Date(e.first_release_date * 1000).toISOString().split("T")[0] : null,
        category: e.category,
      })) ?? []
    ),
    similarGames:
      igdb.similar_games?.slice(0, 6).map((g) => ({
        name: g.name,
        slug: g.slug,
        coverUrl: g.cover ? buildIGDBImageUrl(g.cover.image_id, "cover_big") : null,
        rating: g.aggregated_rating,
        platforms: g.platforms?.map((p) => p.name) ?? [],
      })) ?? [],
    videos:
      igdb.videos?.map((v) => ({
        videoId: v.video_id,
        name: v.name,
        youtubeEmbedUrl: `https://www.youtube.com/embed/${v.video_id}`,
      })) ?? [],
    websites: {
      official: igdb.websites?.find((w) => w.type === 1)?.url,
      wikia: igdb.websites?.find((w) => w.type === 2)?.url,
      wikipedia: igdb.websites?.find((w) => w.type === 3)?.url,
      facebook: igdb.websites?.find((w) => w.type === 4)?.url,
      twitter: igdb.websites?.find((w) => w.type === 5)?.url,
      twitch: igdb.websites?.find((w) => w.type === 6)?.url,
      instagram: igdb.websites?.find((w) => w.type === 8)?.url,
      youtube: igdb.websites?.find((w) => w.type === 9)?.url,
      steam: igdb.websites?.find((w) => w.type === 13)?.url,
      reddit: igdb.websites?.find((w) => w.type === 14)?.url,
      discord: igdb.websites?.find((w) => w.type === 18)?.url,
      epicgames: igdb.websites?.find((w) => w.type === 16)?.url,
      gog: igdb.websites?.find((w) => w.type === 17)?.url,
      itch: igdb.websites?.find((w) => w.type === 15)?.url,
      xbox: igdb.websites?.find((w) => w.type === 22)?.url,
      playstation: igdb.websites?.find((w) => w.type === 23)?.url,
      bluesky: igdb.websites?.find((w) => w.type === 19)?.url,
    },
    multiplayerModes: igdb.multiplayer_modes?.[0]
      ? {
          onlineCoop: igdb.multiplayer_modes[0].onlinecoop,
          lanCoop: igdb.multiplayer_modes[0].lancoop,
          offlineCoop: igdb.multiplayer_modes[0].offlinecoop,
          splitscreen: igdb.multiplayer_modes[0].splitscreen,
          onlineCoopMax: igdb.multiplayer_modes[0].onlinecoopmax,
          offlineCoopMax: igdb.multiplayer_modes[0].offlinecoopmax,
        }
      : null,
    languageSupports:
      igdb.language_supports?.map((ls) => ({
        language: ls.language?.name,
        type: ls.language_support_type?.name,
      })) ?? [],
    igdbUrl: igdb.url,
  };
}

// ============================================================================
// Prisma persistence mapping (admin import + nightly sync)
// ============================================================================

// Only the fields the mapper actually sets — keeps the result assignable to
// Prisma update `data` (full Partial<Game> trips the checked/unchecked
// update-input union via the Json columns).
export type IGDBMappedGame = Pick<
  Partial<Game>,
  | "igdbId"
  | "igdbSlug"
  | "title"
  | "description"
  | "storyline"
  | "igdbUrl"
  | "coverImageUrl"
  | "backgroundImageUrl"
  | "screenshotUrls"
  | "artworkUrls"
  | "releaseDate"
  | "developer"
  | "publisher"
  | "platforms"
  | "genres"
  | "tags"
  | "themes"
  | "keywords"
  | "gameModes"
  | "playerPerspectives"
  | "gameEngine"
  | "collectionName"
  | "esrbRating"
  | "pegiRating"
  | "aggregatedRating"
  | "aggregatedRatingCount"
  | "totalRating"
  | "totalRatingCount"

  | "releaseStatus"
  | "steamAppId"
> & {
  allCompaniesJson?: Prisma.InputJsonValue;
  releaseDatesByPlatformJson?: Prisma.InputJsonValue;
  dlcsJson?: Prisma.InputJsonValue;
  expansionsJson?: Prisma.InputJsonValue;
  similarGamesJson?: Prisma.InputJsonValue;
  videosJson?: Prisma.InputJsonValue;
  websitesJson?: Prisma.InputJsonValue;
  multiplayerModesJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  languageSupportsJson?: Prisma.InputJsonValue;
};

export function mapIGDBGameToDb(igdb: IGDBGame): IGDBMappedGame {
  const full = mapIGDBToDb(igdb);

  return {
    igdbId: full.igdbId,
    igdbSlug: full.igdbSlug ?? null,
    title: igdb.name,
    description: full.description ?? null,
    storyline: full.storyline ?? null,
    igdbUrl: full.igdbUrl ?? null,
    coverImageUrl: full.coverImageUrl ?? null,
    backgroundImageUrl: full.backgroundImageUrl ?? null,
    screenshotUrls: full.screenshotUrls,
    artworkUrls: full.artworkUrls,
    releaseDate: igdb.first_release_date ? new Date(igdb.first_release_date * 1000) : null,
    developer: full.developer ?? null,
    publisher: full.publisher ?? null,
    platforms: igdb.platforms?.map((p) => p.name) ?? [],
    genres: igdb.genres?.map((g) => g.name) ?? [],
    tags: [
      ...(igdb.themes?.map((t) => t.name) ?? []),
      ...(igdb.keywords?.slice(0, 20).map((k) => k.name) ?? []),
    ],
    themes: full.themes ?? null,
    keywords: full.keywords ?? null,
    gameModes: full.gameModes,
    playerPerspectives: full.playerPerspectives,
    gameEngine: full.gameEngine ?? null,
    collectionName: full.collectionName ?? null,
    esrbRating: full.esrbRating ?? null,
    pegiRating: full.pegiRating ?? null,
    aggregatedRating: full.aggregatedRating ?? null,
    aggregatedRatingCount: full.aggregatedRatingCount ?? null,
    totalRating: full.totalRating ?? null,
    totalRatingCount: full.totalRatingCount ?? null,

    releaseStatus: full.releaseStatus,
    steamAppId: full.steamAppId ?? null,
    allCompaniesJson: full.allCompanies as unknown as Prisma.InputJsonValue,
    releaseDatesByPlatformJson: full.releaseDatesByPlatform as unknown as Prisma.InputJsonValue,
    dlcsJson: full.dlcs as unknown as Prisma.InputJsonValue,
    expansionsJson: full.expansions as unknown as Prisma.InputJsonValue,
    similarGamesJson: full.similarGames as unknown as Prisma.InputJsonValue,
    videosJson: full.videos as unknown as Prisma.InputJsonValue,
    websitesJson: full.websites as unknown as Prisma.InputJsonValue,
    multiplayerModesJson: full.multiplayerModes
      ? (full.multiplayerModes as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
    languageSupportsJson: full.languageSupports as unknown as Prisma.InputJsonValue,
  };
}
