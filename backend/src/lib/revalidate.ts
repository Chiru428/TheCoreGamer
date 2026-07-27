import { contentTypePath, contentTypeListingPath } from "@/lib/seoPaths";

/**
 * Triggers Next.js ISR revalidation on the frontend for a given path.
 *
 * Previously this lived only inside workers/article.worker.ts and was called
 * exclusively by the once-a-minute scheduled-publish cron job — meaning a
 * manual "Publish now" (or an edit/unpublish of an already-published
 * article) cleared the backend Redis cache and the CDN, but never told the
 * frontend Next.js server to drop its own ISR/fetch-cache. Extracted here so
 * every publish/edit/unpublish route can call it too.
 */
export async function triggerFrontendRevalidation(path: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.warn("[revalidate] REVALIDATE_SECRET not set — skipping ISR revalidation");
    return;
  }
  try {
    const res = await fetch(`${frontendUrl}/api/revalidate?secret=${encodeURIComponent(secret)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) {
      console.warn(`[revalidate] ISR revalidation failed for ${path}: ${res.status}`);
    }
  } catch (err) {
    // Non-fatal — the write already succeeded; cache will expire naturally
    console.warn(`[revalidate] ISR revalidation fetch error for ${path}:`, err);
  }
}

/**
 * Revalidates every frontend path affected by a change to one article: its
 * own detail page, its actual listing page (content-type-aware — see
 * contentTypeListingPath), and the homepage.
 *
 * This is the frontend-ISR counterpart to purgeArticle() in lib/cloudflare.ts
 * — call both together after any publish, unpublish, or edit-of-published
 * content so all three cache layers (Redis / CDN / frontend ISR) agree.
 */
export async function revalidateArticlePaths(slug: string, contentType: string): Promise<void> {
  const detailSegment = contentTypePath(contentType);
  const listingSegment = contentTypeListingPath(contentType);
  await Promise.all([
    triggerFrontendRevalidation(`/${detailSegment}/${slug}`),
    triggerFrontendRevalidation(`/${listingSegment}`),
    triggerFrontendRevalidation("/"),
  ]);
}
