import { liteClient as algoliasearch } from 'algoliasearch/lite';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;

// null when the search keys aren't configured, so pages that only need the
// constants/helpers below (event tracking, recommendations) don't crash.
export const algoliaSearchClient =
  ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY
    ? algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY)
    : null;

// Index name constants — must match backend/src/lib/algolia.ts
export const ARTICLES_INDEX = 'articles';
export const GAMES_INDEX = 'games';
export const TAGS_INDEX = 'tags';
export const USERS_INDEX = 'users';
export const VIDEOS_INDEX = 'videos';

// Replica index constants — must match backend/src/lib/algolia.ts
export const ARTICLES_NEWEST = 'articles_publishedAt_desc';
export const ARTICLES_POPULAR = 'articles_viewCount_desc';
export const ARTICLES_TOP_RATED = 'articles_reviewScore_desc';

const USER_TOKEN_STORAGE_KEY = 'algolia_user_token';

/**
 * Resolves the Algolia user token used for personalization and event tracking.
 * - Logged-in users get a stable `user_<id>` token.
 * - SSR has no localStorage, so it falls back to a shared anonymous token.
 * - Anonymous browser sessions get a persisted `anon_<uuid>` token.
 */
export function getAlgoliaUserToken(userId?: string): string {
  if (userId) return `user_${userId}`;
  if (typeof window === 'undefined') return 'ssr_anonymous';

  const existing = localStorage.getItem(USER_TOKEN_STORAGE_KEY);
  if (existing) return existing;

  const generated = `anon_${crypto.randomUUID()}`;
  localStorage.setItem(USER_TOKEN_STORAGE_KEY, generated);
  return generated;
}

export interface AlgoliaEventPayload {
  eventType: 'click' | 'conversion' | 'view';
  eventName: string;
  index: string;
  objectIDs: string[];
  queryID?: string;
  positions?: number[];
  userToken: string;
}

/** Fire-and-forget Algolia Insights event. Never await — must not block UI interactions. */
export function sendAlgoliaEvent(payload: AlgoliaEventPayload): void {
  if (typeof window === 'undefined') return;

  fetch('/api/search/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  }).catch(() => {});
}
