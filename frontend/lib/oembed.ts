import { SocialEmbedAttrs, SocialPlatform } from './gaming-block-renderers';

export interface TwitterOEmbed {
  platform: 'twitter';
  html: string;
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
}

export interface RedditOEmbed {
  platform: 'reddit';
  title?: string;
  html: string;
}

export interface BlueskyOEmbed {
  platform: 'bluesky';
  title?: string;
  description?: string;
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
}

export type OEmbedResult = TwitterOEmbed | RedditOEmbed | BlueskyOEmbed;

export interface DetectedSocialUrl {
  url: string;
  platform: SocialPlatform;
  icon: string;
  label: string;
}

const URL_PATTERNS: Array<{ regex: RegExp; platform: SocialPlatform; icon: string; label: string }> = [
  { regex: /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/\s]+\/status\/\d+(?:[/?#]\S*)?$/i, platform: 'twitter', icon: '🐦', label: 'Twitter' },
  { regex: /^https?:\/\/(?:www\.)?bsky\.app\/profile\/[^/\s]+\/post\/[^/?#\s]+(?:[/?#]\S*)?$/i, platform: 'bluesky', icon: '🦋', label: 'Bluesky' },
  { regex: /^https?:\/\/(?:www\.)?reddit\.com\/r\/[^/\s]+\/comments\/[^/?#\s]+(?:[/?#]\S*)?$/i, platform: 'reddit', icon: '👽', label: 'Reddit' },
];

/** Detects whether a pasted plain-text string is exactly a supported social post URL. */
export function detectSocialUrl(text: string): DetectedSocialUrl | null {
  if (!text || text !== text.trim() || text.includes('\n')) return null;
  for (const p of URL_PATTERNS) {
    if (p.regex.test(text)) return { url: text, platform: p.platform, icon: p.icon, label: p.label };
  }
  return null;
}

/** Fetches oEmbed/preview data for a supported social URL via the backend proxy. */
export async function fetchOEmbed(url: string): Promise<OEmbedResult | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/oembed?url=${encodeURIComponent(url)}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as OEmbedResult) ?? null;
  } catch {
    return null;
  }
}

/** Maps an oEmbed/preview result (or none) into SocialEmbed node attributes. */
export function oembedResultToAttrs(result: OEmbedResult | null, fallback: { url: string; platform: SocialPlatform }): SocialEmbedAttrs {
  if (!result) {
    return { platform: fallback.platform, url: fallback.url };
  }

  if (result.platform === 'twitter') {
    return {
      platform: 'twitter',
      url: fallback.url,
      authorName: result.authorName || '',
      authorUrl: result.authorUrl || '',
      avatarUrl: result.thumbnailUrl || '',
      mediaUrl: result.thumbnailUrl || '',
      embedHtml: result.html || '',
    };
  }

  if (result.platform === 'reddit') {
    return {
      platform: 'reddit',
      url: fallback.url,
      content: result.title || '',
      embedHtml: result.html || '',
    };
  }

  return {
    platform: 'bluesky',
    url: fallback.url,
    authorName: result.authorName || '',
    authorUrl: result.authorUrl || '',
    content: result.description || result.title || '',
    avatarUrl: result.thumbnailUrl || '',
    mediaUrl: result.thumbnailUrl || '',
  };
}
