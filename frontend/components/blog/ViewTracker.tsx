'use client';

import { useEffect } from 'react';

/**
 * Sends a dedicated view-tracking ping to the backend.
 * This is separate from the page data fetch so we can use a lightweight
 * endpoint in the future (e.g. POST /api/posts/[slug]/view) without
 * fetching the full article payload just to increment the counter.
 *
 * NOTE: the server-side fetchPost() call in ArticleDetailPage no longer
 * increments the view count — incrementing is handled here only.
 */
export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/posts/${slug}/view`, { 
      method: 'POST',
      credentials: 'include'
    }).catch(() => { });
  }, [slug]);
  return null;
}
