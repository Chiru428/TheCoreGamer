/**
 * Maps a contentType to its frontend URL path segment.
 *
 * This mapping MUST stay in sync with:
 *   frontend/lib/seo.ts → contentTypePath()
 *   frontend/app/(public)/articles/[slug]/page.tsx → redirect guard
 *
 * Only REVIEW and MOD_GUIDE have dedicated detail routes.
 * Everything else renders at /articles/[slug].
 */
export function contentTypePath(contentType: string): string {
  if (contentType === "REVIEW") return "reviews";
  if (contentType === "GUIDE") return "guides";
  return "articles";
}

/**
 * Maps a contentType to its frontend LISTING page path segment.
 *
 * Unlike contentTypePath() (the detail-page route, which is shared as
 * /articles/[slug] for most types), every content type has its own distinct
 * listing page — confirmed against frontend/app/(public)/<segment>/page.tsx
 * for each type's fetchPosts({ contentType }) filter.
 *
 * Used by cache-invalidation code (Cloudflare purge + frontend ISR
 * revalidation) so publishing/editing/unpublishing an article invalidates
 * the listing page it actually appears on, not just a hardcoded "/news".
 */
export function contentTypeListingPath(contentType: string): string {
  switch (contentType) {
    case "REVIEW": return "reviews";
    case "GUIDE": return "guides";
    case "OPINION": return "opinions";

    case "DEAL": return "deals";
    case "LISTICLE": return "lists";
    case "NEWS":
    default:
      return "news";
  }
}
