import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { logger } from "@/lib/logger";

const ITAD_BASE = "https://api.isthereanydeal.com";

export interface PriceResult {
  gameId: string;
  shop: string;
  price: number;
  regular?: number;
  storeLow?: number;
  voucher?: string;
  expiry?: string;
  drm?: string;
  cut: number;
  url: string;
}

function getApiKey(): string | null {
  const key = process.env.ITAD_API_KEY;
  if (!key) {
    logger.warn("[ITAD] ITAD_API_KEY not set — returning empty results");
    return null;
  }
  return key;
}

export async function findGameByTitle(title: string): Promise<{ id: string; slug: string } | null> {
  const key = getApiKey();
  if (!key) return null;
  const res = await fetch(
    `${ITAD_BASE}/games/search/v1?title=${encodeURIComponent(title)}&key=${key}`
  );
  if (!res.ok) {
    throw new Error(`ITAD findGameByTitle failed with status ${res.status}`);
  }
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first?.id) return null;
  return { id: first.id, slug: first.slug };
}

export async function findGameBySteamId(
  steamAppId: string
): Promise<{ id: string; slug: string } | null> {
  const key = getApiKey();
  if (!key) return null;
  // Note: ITAD API requires `appid=...` for Steam app ID lookups.
  const res = await fetch(
    `${ITAD_BASE}/games/lookup/v1?key=${key}&appid=${encodeURIComponent(steamAppId)}`
  );
  if (!res.ok) {
    throw new Error(`ITAD findGameBySteamId failed with status ${res.status}`);
  }
  const data = await res.json();
  if (!data?.game?.id) return null;
  return { id: data.game.id, slug: data.game.slug };
}

const NO_MATCH = "__NO_MATCH__";

// Resolves a game's ITAD id, falling back to title search for games with no
// Steam release (e.g. Epic-exclusive titles). Cached for a day per game since
// the mapping rarely changes and title search is otherwise re-run every poll.
export async function resolveItadId(
  gameId: string,
  steamAppId: string | null,
  title: string
): Promise<string | null> {
  const cacheKey = `itad:mapping:${gameId}`;
  try {
    const cached = await cacheGet<string>(cacheKey);
    if (cached != null) return cached === NO_MATCH ? null : cached;
  } catch {}

  let match: { id: string; slug: string } | null = null;
  try {
    match = steamAppId
      ? await findGameBySteamId(steamAppId)
      : await findGameByTitle(title);
  } catch (err) {
    logger.warn({ err }, `[ITAD] resolveItadId failed for ${title}, bypassing NO_MATCH cache`);
    return null; // Return null without caching NO_MATCH on error
  }

  try {
    await cacheSet(cacheKey, match?.id ?? NO_MATCH, CACHE_TTL.DAY);
  } catch {}

  return match?.id ?? null;
}

export async function getPrices(itadGameIds: string[]): Promise<PriceResult[]> {
  const key = getApiKey();
  if (!key || itadGameIds.length === 0) return [];

  const results: PriceResult[] = [];
  const uncached: string[] = [];

  for (const id of itadGameIds) {
    try {
      const cached = await cacheGet<PriceResult[]>(`itad:prices:${id}`);
      if (cached) {
        results.push(...cached);
      } else {
        uncached.push(id);
      }
    } catch {
      uncached.push(id);
    }
  }

  if (uncached.length === 0) return results;

  try {
    // ITAD prices/v3 expects POST body as an array of objects: [{ id: "..." }]
    // Sending a plain string array ["..."] returns an empty response.
    const res = await fetch(`${ITAD_BASE}/games/prices/v3?key=${key}&country=IN`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uncached),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error({ status: res.status, body }, "[ITAD] getPrices failed with non-OK status");
      return results;
    }

    const data: Array<{
      id: string;
      deals: Array<{
        shop: { id: number | string; name: string };
        price: { amount: number; amountInt: number; currency: string };
        regular: { amount: number; amountInt: number; currency: string };
        cut: number;
        url: string;
        voucher?: string;
        expiry?: string;
        drm?: Array<{ id: number; name: string }>;
        storeLow?: { amount: number; amountInt: number; currency: string };
      }>;
    }> = await res.json();

    for (const game of data) {
      const gameResults: PriceResult[] = (game.deals || []).map((deal) => ({
        gameId: game.id,
        shop: deal.shop.name,
        price: deal.price.amount,
        regular: deal.regular?.amount,
        storeLow: deal.storeLow?.amount,
        voucher: deal.voucher,
        expiry: deal.expiry,
        drm: deal.drm?.[0]?.name,
        cut: deal.cut,
        url: deal.url,
      }));
      results.push(...gameResults);
      try {
        // Cache ITAD prices for the full poll interval (12 h) so repeated
        // calls within the same window return the cached result instead of
        // hitting the ITAD API again.
        await cacheSet(`itad:prices:${game.id}`, gameResults, 12 * 3600);
      } catch {}
    }

    // Cache empty results for IDs that ITAD omitted (e.g. delisted games)
    // so we don't re-fetch them constantly within the same TTL.
    const returnedIds = new Set(data.map((g) => g.id));
    for (const id of uncached) {
      if (!returnedIds.has(id)) {
        try {
          await cacheSet(`itad:prices:${id}`, [], 12 * 3600);
        } catch {}
      }
    }
  } catch (err) {
    logger.error({ err }, "[ITAD] getPrices failed");
  }

  return results;
}
