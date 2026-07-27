import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from './constants';

interface MetaParams {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  noIndex?: boolean;
}

interface OgImageParams {
  title: string;
  type: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  score?: number | null;
  featuredImageUrl?: string | null;
  gameCoverUrl?: string | null;
}

/**
 * Builds the URL for the auto-generated Open Graph image at /api/og.
 */
export function buildOgImageUrl({ title, type, authorName, authorAvatarUrl, score, featuredImageUrl, gameCoverUrl }: OgImageParams): string {
  const params = new URLSearchParams();
  params.set('title', title);
  params.set('type', type);
  if (authorName) params.set('authorName', authorName);
  if (authorAvatarUrl) params.set('authorAvatarUrl', authorAvatarUrl);
  if (score != null) params.set('score', String(score));
  if (featuredImageUrl) params.set('featuredImageUrl', featuredImageUrl);
  if (gameCoverUrl) params.set('gameCoverUrl', gameCoverUrl);
  return `${SITE_URL}/api/og?${params.toString()}`;
}

export function buildMeta({ title, description, image, url, type = 'website', noIndex }: MetaParams): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonical = url ? `${SITE_URL}${url}` : undefined;
  const ogImage = image || `${SITE_URL}/og-default.png`;

  return {
    title: fullTitle,
    description,
    ...(canonical && { alternates: { canonical } }),
    ...(noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: type as 'website' | 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}

/**
 * Maps an article contentType to its frontend URL path segment.
 *
 * KEEP IN SYNC WITH:
 *   backend/src/app/api/sitemap.xml/route.ts  → contentTypePath()
 *   backend/src/app/api/news-sitemap.xml/route.ts → contentTypePath()
 */
export function contentTypePath(contentType: string | undefined | null): string {
  if (contentType === 'REVIEW') return 'reviews';
  if (contentType === 'MOD_GUIDE') return 'mod-guides';
  if (contentType === 'NEWS') return 'news';
  if (contentType === 'DEAL') return 'deals';
  if (contentType === 'FEATURE') return 'features';
  if (contentType === 'OPINION') return 'opinions';
  if (contentType === 'WALKTHROUGH') return 'walkthroughs';
  if (contentType === 'LISTICLE') return 'lists';
  return 'articles'; // fallback
}

export function buildArticleMeta(article: {
  title: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  slug: string;
  publishedAt?: string | null;
  updatedAt?: string;
  author?: { displayName: string; avatarUrl?: string | null } | null;
  contentType?: string;
  gameReview?: { reviewScore?: number | string | null; game?: { coverImageUrl?: string | null } | null } | null;
}): Metadata {
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt || '';
  // Delegate to contentTypePath() — the single source of truth for this mapping.
  const urlPrefix = `/${contentTypePath(article.contentType)}`;
  const review = article.gameReview;
  const ogImage = buildOgImageUrl({
    title,
    type: article.contentType || 'NEWS',
    authorName: article.author?.displayName,
    authorAvatarUrl: article.author?.avatarUrl,
    featuredImageUrl: article.featuredImageUrl,
    score: review?.reviewScore != null ? Number(review.reviewScore) : undefined,
    gameCoverUrl: review?.game?.coverImageUrl,
  });
  return {
    ...buildMeta({
      title,
      description,
      image: ogImage,
      url: `${urlPrefix}/${article.slug}`,
      type: 'article',
    }),
    other: {
      'article:published_time': article.publishedAt || '',
      'article:modified_time': article.updatedAt || '',
      'article:author': article.author?.displayName || '',
    },
  };
}
