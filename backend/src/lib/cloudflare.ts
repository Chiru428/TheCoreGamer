import { logger } from "@/lib/logger";
import { captureError } from "@/lib/sentry";
import { contentTypePath, contentTypeListingPath } from "@/lib/seoPaths";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

/**
 * Purge a set of fully-qualified URLs from the Cloudflare cache.
 * Never throws — failures are logged and reported to Sentry so a Cloudflare
 * outage can't take down article publishing or revalidation.
 */
export async function purgeCloudflareCache(urls: string[]): Promise<void> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!zoneId || !apiToken) {
    logger.warn({ urls }, "[Cloudflare] Skipping cache purge — CLOUDFLARE_ZONE_ID/CLOUDFLARE_API_TOKEN not configured");
    return;
  }
  if (urls.length === 0) return;

  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: urls }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      logger.error({ urls, status: res.status, errors: data.errors }, "[Cloudflare] Cache purge failed");
      return;
    }

    logger.info({ urls }, "[Cloudflare] Cache purge succeeded");
  } catch (err) {
    captureError(err, { context: "purgeCloudflareCache", urls });
  }
}

/**
 * Purge all cached page variants for an article: its own detail page, its
 * actual listing page, the homepage, and the sitemap.
 *
 * `contentType` determines both paths via the same mapping used elsewhere
 * (contentTypePath / contentTypeListingPath) — e.g. a REVIEW purges
 * /reviews/{slug} + /reviews, not /articles/{slug} + /news. Previously this
 * always purged /articles + /news regardless of content type, which meant
 * Review and Mod-Guide edits purged a URL that was never cached while the
 * real page stayed stale, and Walkthrough/Opinion/Feature/Deal/Listicle
 * publishes never invalidated their real listing page at all.
 *
 * `contentType` is optional only for backwards compatibility with any
 * caller that doesn't have it handy; omitting it falls back to the old
 * articles/news behavior, so passing it explicitly is strongly preferred.
 */
export async function purgeArticle(slug: string, contentType?: string): Promise<void> {
  const detailSegment = contentType ? contentTypePath(contentType) : "articles";
  const listingSegment = contentType ? contentTypeListingPath(contentType) : "news";
  await purgeCloudflareCache([
    `${SITE_URL}/${detailSegment}/${slug}`,
    `${SITE_URL}/${listingSegment}`,
    `${SITE_URL}/`,
    `${SITE_URL}/sitemap.xml`,
  ]);
}

/** Purge the cached hub page for a game. */
export async function purgeGame(slug: string): Promise<void> {
  await purgeCloudflareCache([`${SITE_URL}/games/${slug}`]);
}
