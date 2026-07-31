import type {
  ApiResponse, Article, Tag, Game, Comment,
  CommentSort, CommentReactionType, TenorGif,
  ArticleReactionCounts, Bookmark, SearchResult, AutocompleteResult,
  SearchApiResponse, AutocompleteApiResponse, AlgoliaArticleHit, AlgoliaSearchResult,
  AdminStats, WorkerHealth, AdPlacement, User, NotificationPreference,
  NewsletterSubscriber, NewsletterStats, ArticleVersion, AnalyticsData, AdSenseReport,
  UserRating, UserRatingAggregate,
  Poll,
  UserContentPreference,
  HomepageData,
  VideoAsset,
  UserScreenshot,
  RecentlyViewedItem,
  AuthorAnalytics,
  AnalyticsTrafficData,
  RealtimeAnalytics,
  LiveActivityData,
  PerformanceScores,
  AuthorPerformance,
  TopEarningArticle,
  AffiliateStats,
  SearchMiss,
  SearchAnalytics,
  GameHubData,
  OfficialScreenshot,
  PlatformHubData,
  GenreHubData,
  PlatformListItem,
  GenreListItem,
  LiveBlogUpdate,
  ReadingList,
  UserStrike,
  AdminUserDetail,
  UserProfileSummary,
  UserPostItem,
  UserReviewItem,
  AuthorArticleItem,
} from '@/types';

const API_BASE = typeof window === 'undefined'
  // Server-side (SSR/RSC): call the backend directly using the internal URL.
  ? (process.env.BACKEND_URL || 'http://localhost:3001')
  // Browser-side: use relative paths (/api/...) so the Next.js rewrite proxy
  // forwards them to the backend — same-origin request, no CORS required.
  : '';

async function apiFetch<T>(url: string, options?: RequestInit & { revalidate?: number }): Promise<ApiResponse<T>> {
  const isServer = typeof window === 'undefined';
  const maxAttempts = isServer ? 3 : 1; // Only retry on the server (SSR/ISR); client handles its own UX

  let lastResult: ApiResponse<T> = { success: false, data: undefined as unknown as T, error: 'Fetch failed' } as ApiResponse<T>;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { revalidate, ...fetchOptions } = options || {};
      const res = await fetch(`${API_BASE}${url}`, {
        ...fetchOptions,
        // Always include credentials so session cookies are sent on both
        // client-side requests and server-side RSC/SSR calls.
        credentials: 'include',
        signal: fetchOptions.signal ?? AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', ...fetchOptions?.headers },
        ...(revalidate !== undefined ? { next: { revalidate } } : {}),
      });
      const text = await res.text();

      if (!text) {
        lastResult = { success: res.ok, data: undefined as unknown as T, error: res.ok ? undefined : `HTTP ${res.status}` } as ApiResponse<T>;
        if (res.ok) return lastResult;
        // 5xx on server — retry
        if (isServer && res.status >= 500 && attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 300 * Math.pow(3, attempt)));
          continue;
        }
        return lastResult;
      }

      let parsed: ApiResponse<T>;
      try {
        parsed = JSON.parse(text);
      } catch {
        console.error(`[apiFetch] Non-JSON response from ${API_BASE}${url} (HTTP ${res.status}):`, text.slice(0, 200));
        lastResult = { success: false, data: undefined as unknown as T, error: `HTTP ${res.status}` } as ApiResponse<T>;
        if (isServer && res.status >= 500 && attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 300 * Math.pow(3, attempt)));
          continue;
        }
        return lastResult;
      }

      // If the server returned a success response, return immediately
      if (parsed.success) return parsed;

      // Server returned an error response — retry on 5xx
      lastResult = parsed;
      if (isServer && attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 300 * Math.pow(3, attempt)));
        continue;
      }
      return parsed;
    } catch (err) {
      console.error(`[apiFetch ERROR] URL: ${API_BASE}${url}`, err);
      lastResult = { success: false, data: undefined as unknown as T, error: 'Fetch failed' } as ApiResponse<T>;
      if (isServer && attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 300 * Math.pow(3, attempt)));
        continue;
      }
    }
  }
  return lastResult;
}

async function apiMutate<T>(url: string, method: string, body?: unknown): Promise<ApiResponse<T>> {
  // MINOR-04: Mutations get up to 2 retries on transient 5xx responses (with exponential backoff).
  // Callers can show feedback via the returned { success, error } without needing to know retry logic.
  const maxAttempts = 2;
  let lastResult: ApiResponse<T> = { success: false, data: undefined as unknown as T, error: 'Mutation failed' } as ApiResponse<T>;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        method, headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      if (!text) {
        lastResult = { success: res.ok, data: undefined as unknown as T, error: res.ok ? undefined : `HTTP ${res.status}` } as ApiResponse<T>;
        if (!res.ok && res.status >= 500 && attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)));
          continue;
        }
        return lastResult;
      }

      let parsed: ApiResponse<T>;
      try {
        parsed = JSON.parse(text);
      } catch {
        console.error(`[apiMutate] Non-JSON response from ${API_BASE}${url} (HTTP ${res.status}):`, text.slice(0, 200));
        lastResult = { success: false, data: undefined as unknown as T, error: `HTTP ${res.status}` } as ApiResponse<T>;
        if (res.status >= 500 && attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)));
          continue;
        }
        return lastResult;
      }

      if (!parsed.success) {
        console.error("API Error Response Object:", parsed);
        console.error("API Error Response Text:", text);
        lastResult = parsed;
        if (attempt < maxAttempts - 1 && text.includes('500')) {
          await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)));
          continue;
        }
      }
      return parsed;
    } catch (err) {
      lastResult = { success: false, data: undefined as unknown as T, error: err instanceof Error ? err.message : 'Mutation failed' } as ApiResponse<T>;
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)));
      }
    }
  }
  return lastResult;
}

// POSTS
export async function fetchPosts(params?: Record<string, unknown>) {
  const sp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && k !== 'revalidate') sp.set(k, String(v)); });
  return apiFetch<Article[]>(`/api/posts${sp.toString() ? `?${sp}` : ''}`, { revalidate: (params?.revalidate as number) ?? 60 });
}
export const fetchPost = (slug: string, revalidate = 60) => apiFetch<Article>(`/api/posts/${slug}`, { revalidate });
/**
 * Creates a post via /api/posts. Only use for NEWS, WALKTHROUGH, OPINION, FEATURE, LISTICLE,
 * and DEAL content types. For REVIEW use createReview(), for MOD_GUIDE use createModGuide().
 */
export const createPost = (data: Record<string, unknown>) => {
  const type = data.contentType as string | undefined;
  if (type === 'REVIEW' || type === 'MOD_GUIDE') {
    throw new Error(
      `createPost() must not be called with contentType "${type}". ` +
      `Use createReview() or createModGuide() instead.`
    );
  }
  return apiMutate<Article>('/api/posts', 'POST', data);
};
export const updatePost = (slug: string, data: Record<string, unknown>) => apiMutate<Article>(`/api/posts/${slug}`, 'PUT', data);
export const deletePost = (slug: string) => apiMutate<null>(`/api/posts/${slug}`, 'DELETE');
/** Request deletion of an APPROVED/PUBLISHED/ARCHIVED article — DRAFT/IN_REVIEW can be deleted directly via deletePost().
 *  Content-type agnostic: works for reviews and mod-guides too, since it only touches generic Article fields. */
export const requestPostDeletion = (slug: string, reason: string) =>
  apiMutate<null>(`/api/posts/${slug}/request-deletion`, 'POST', { reason });
export const cancelPostDeletionRequest = (slug: string) =>
  apiMutate<null>(`/api/posts/${slug}/request-deletion`, 'DELETE');
export { apiMutate }; // Exported for custom mutations

// REVIEWS
export const fetchReviewFacets = (revalidate = 60) => apiFetch<{ platforms: any[], genres: any[], years: any[], tags: any[] }>('/api/reviews/facets?v=2', { revalidate });
export const fetchGuideFacets = (revalidate = 300) => apiFetch<{ guideTypes: any[], platforms: any[], genres: any[], games: any[], tags: any[] }>('/api/guides/facets', { revalidate });

export async function fetchReviews(params?: Record<string, unknown>) {
  const sp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && k !== 'revalidate') sp.set(k, String(v)); });
  return apiFetch<Article[]>(`/api/reviews${sp.toString() ? `?${sp}` : ''}`, { revalidate: (params?.revalidate as number) ?? 60 });
}
export const fetchReview = (slug: string, revalidate = 60) => apiFetch<Article>(`/api/reviews/${slug}`, { revalidate });
export const createReview = (data: Record<string, unknown>) => apiMutate<unknown>('/api/reviews', 'POST', data);
export const updateReview = (slug: string, data: Record<string, unknown>) => apiMutate<unknown>(`/api/reviews/${slug}`, 'PUT', data);
/**
 * BUG-02: Dedicated score update — routes through PUT /api/reviews/[slug]/score which enforces
 * EDITOR/ADMIN role and preserves originalScore correctly.
 */
export const updateReviewScore = (slug: string, data: { reviewScore: number; scoreUpdateReason: string }) =>
  apiMutate<unknown>(`/api/reviews/${slug}/score`, 'PUT', data);
export const deleteReview = (slug: string) => apiMutate<null>(`/api/reviews/${slug}`, 'DELETE');

// MOD GUIDES
export async function fetchModGuides(params?: Record<string, unknown>) {
  const sp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && k !== 'revalidate') sp.set(k, String(v)); });
  return apiFetch<Article[]>(`/api/mod-guides${sp.toString() ? `?${sp}` : ''}`, { revalidate: (params?.revalidate as number) ?? 60 });
}
export const fetchModGuide = (slug: string, revalidate = 60) => apiFetch<Article>(`/api/mod-guides/${slug}`, { revalidate });
export const createModGuide = (data: Record<string, unknown>) => apiMutate<unknown>('/api/mod-guides', 'POST', data);
export const updateModGuide = (slug: string, data: Record<string, unknown>) => apiMutate<unknown>(`/api/mod-guides/${slug}`, 'PUT', data);
export const deleteModGuide = (slug: string) => apiMutate<null>(`/api/mod-guides/${slug}`, 'DELETE');
export const verifyModGuide = (slug: string, data: { version: string; notes?: string }) =>
  apiMutate<unknown>(`/api/mod-guides/${slug}/verify`, 'PATCH', data);

// WALKTHROUGHS
export const fetchWalkthroughsHub = (limitLatest = 6, limitPerGame = 10, revalidate = 60) => 
  apiFetch<{ latest: Article[], games: (Game & { articles: Article[] })[] }>(
    `/api/walkthroughs/hub?limitLatest=${limitLatest}&limitPerGame=${limitPerGame}`, 
    { revalidate }
  );

// GAMES
export async function fetchGames(params?: Record<string, unknown> & { search?: string }) {
  const sp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && k !== 'revalidate') sp.set(k, String(v)); });
  return apiFetch<Game[]>(`/api/games${sp.toString() ? `?${sp}` : ''}`, { revalidate: (params?.revalidate as number) ?? 120 });
}
export const fetchGame = (slug: string, revalidate = 120) => apiFetch<Game>(`/api/games/${slug}`, { revalidate });
/** Game hub payload — same endpoint, typed with the hub stats (userRatings, priceData) */
export const fetchGameHub = (slug: string, revalidate = 600) => apiFetch<GameHubData>(`/api/games/${slug}`, { revalidate });
/** Per-shop price history (last 7 days of tracked PriceSnapshot rows) plus the all-time low seen */
export const fetchPriceHistory = (gameId: string) =>
  apiFetch<{ history: Record<string, { price: number; date: string }[]>; allTimeLow: number | null }>(
    `/api/deals/prices?history=true&gameId=${gameId}`,
    { cache: 'no-store' }
  );
/** Paginated articles linked to a game via the ArticleGames relation */
export const fetchGameArticles = (slug: string, params?: { page?: number; limit?: number; contentType?: string }) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.contentType) sp.set('contentType', params.contentType);
  return apiFetch<Article[]>(`/api/games/${slug}/articles${sp.toString() ? `?${sp}` : ''}`, { revalidate: 120 });
};
export const createGame = (data: Record<string, unknown>) => apiMutate<Game>('/api/games', 'POST', data);
export const updateGame = (id: string, data: Record<string, unknown>) => apiMutate<Game>(`/api/games/${id}`, 'PUT', data);
export const deleteGame = (id: string) => apiMutate<null>(`/api/games/${id}`, 'DELETE');

// SCREENSHOTS
export const fetchGameScreenshots = (slug: string, params?: { page?: number }) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  return apiFetch<UserScreenshot[]>(`/api/games/${slug}/screenshots${sp.toString() ? `?${sp}` : ''}`, { cache: 'no-store' });
};
/** Extended shape: community screenshots + official imagery from the Game row */
export const fetchGameScreenshotsFull = (slug: string, params?: { page?: number }) => {
  const sp = new URLSearchParams({ includeOfficial: '1' });
  if (params?.page) sp.set('page', String(params.page));
  return apiFetch<{ screenshots: UserScreenshot[]; official: OfficialScreenshot[] }>(
    `/api/games/${slug}/screenshots?${sp}`,
    { cache: 'no-store' }
  );
};
export async function submitGameScreenshot(slug: string, file: File, caption?: string): Promise<ApiResponse<UserScreenshot>> {
  const fd = new FormData();
  fd.append('image', file);
  if (caption) fd.append('caption', caption);
  const r = await fetch(`${API_BASE}/api/games/${slug}/screenshots`, { method: 'POST', credentials: 'include', body: fd });
  return r.json();
}

// TAGS
export const fetchTags = (revalidate = 300) => apiFetch<Tag[]>('/api/tags', { revalidate });
export const createTag = (data: { name: string; description?: string; color?: string }) => apiMutate<Tag>('/api/tags', 'POST', data);
/** MINOR-02: updateTag was missing — maps to PUT /api/tags/[id] */
export const updateTag = (id: string, data: { name?: string; description?: string; color?: string }) => apiMutate<Tag>(`/api/tags/${id}`, 'PUT', data);
export const deleteTag = (id: string) => apiMutate<null>(`/api/tags/${id}`, 'DELETE');

// COMMENTS
export async function fetchComments(articleId: string, params?: { page?: number; sort?: CommentSort }) {
  const sp = new URLSearchParams({ articleId });
  if (params?.page) sp.set('page', String(params.page));
  if (params?.sort) sp.set('sort', params.sort);
  return apiFetch<Comment[]>(`/api/comments?${sp}`, { cache: 'no-store' });
}
export const createComment = (data: Record<string, unknown>) => apiMutate<Comment>('/api/comments', 'POST', data);
export const voteComment = (id: string, value: 1 | -1) => apiMutate<{ upvotes: number; downvotes: number }>(`/api/comments/${id}/vote`, 'POST', { value });
export const reportComment = (id: string) => apiMutate<null>(`/api/comments/${id}/report`, 'POST');
export const unreportComment = (id: string) => apiMutate<null>(`/api/comments/${id}/report`, 'DELETE');
export const deleteComment = (id: string) => apiMutate<null>(`/api/comments/${id}`, 'DELETE');
/** BUG-01: Admin comment delete routes through admin endpoint so it logs to ModerationLog */
export const deleteAdminComment = (id: string) => apiMutate<null>(`/api/admin/comments/${id}`, 'DELETE');
/** Pin/unpin a comment (toggle) — EDITOR/ADMIN or article author only */
export const pinComment = (id: string) => apiMutate<null>(`/api/comments/${id}/pin`, 'POST');
/** Toggle an emoji reaction on a comment — returns updated counts + the caller's own reactions */
export const reactToComment = (id: string, type: CommentReactionType) =>
  apiMutate<{ reactions: Record<CommentReactionType, number>; userReactions: CommentReactionType[] }>(`/api/comments/${id}/reaction`, 'POST', { type });

// TENOR (GIF search — proxied so the API key never reaches the browser)
export const searchTenorGifs = (query: string, limit = 20) =>
  apiFetch<{ results: TenorGif[] }>(`/api/tenor/search?q=${encodeURIComponent(query)}&limit=${limit}`, { cache: 'no-store' });

// REACTIONS
export const fetchReactions = (articleId: string) => apiFetch<ArticleReactionCounts>(`/api/reactions?articleId=${articleId}`, { cache: 'no-store' });
export const toggleReaction = (articleId: string, type: string) => apiMutate<null>('/api/reactions', 'POST', { articleId, type });

// SEARCH
/** Powers SearchOverlay — returns the full Algolia multi-index response (articles/games/tags/users/videos). */
export async function searchArticles(params: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) sp.set(k, String(v)); });
  return apiFetch<SearchApiResponse>(`/api/search?${sp}`);
}

export async function searchAutocomplete(q: string, contentType?: string): Promise<ApiResponse<AutocompleteResult[]>> {
  const res = await apiFetch<AutocompleteApiResponse>(`/api/search/autocomplete?q=${encodeURIComponent(q)}${contentType ? `&contentType=${contentType}` : ''}`);
  if (!res.success || !res.data) return { ...res, data: [] };
  const { articles, games, tags } = res.data;
  const data: AutocompleteResult[] = [
    ...articles.map((a) => ({ id: a.objectID, title: a.title, slug: a.slug, type: 'ARTICLE' as const, contentType: a.contentType, imageUrl: a.featuredImageUrl })),
    ...games.map((g) => ({ id: g.objectID, title: g.title, slug: g.slug, type: 'GAME' as const })),
    ...tags.map((t) => ({ id: t.objectID, name: t.name, slug: t.slug, type: 'TAG' as const })),
  ];
  return { ...res, data };
}

function mapArticleHitToSearchResult(hit: AlgoliaArticleHit): SearchResult {
  return {
    id: hit.objectID,
    title: hit.title,
    slug: hit.slug,
    excerpt: hit.excerpt,
    contentType: hit.contentType,
    featuredImageUrl: hit.featuredImageUrl,
    publishedAt: hit.publishedAtISO,
    author: { displayName: hit.authorName, avatarUrl: hit.authorAvatarUrl },
  };
}

/** Powers the /search results page — normalizes either the Algolia or Postgres-fallback article shape into SearchResult[]. */
export async function fetchSearchResults(
  q: string,
  params?: { contentType?: string; sort?: string; page?: number }
): Promise<ApiResponse<SearchResult[]>> {
  const sp = new URLSearchParams({ q });
  if (params?.contentType) sp.set('contentType', params.contentType);
  if (params?.sort) sp.set('sort', params.sort);
  if (params?.page) sp.set('page', String(Math.max(0, params.page - 1))); // UI pages are 1-indexed, API pages are 0-indexed
  const res = await apiFetch<SearchApiResponse>(`/api/search?${sp}`, { cache: 'no-store' });

  if (!res.success || !res.data) return { ...res, data: [] };

  const { articles, isFallback } = res.data;
  if (isFallback || Array.isArray(articles)) {
    return { ...res, data: (articles as SearchResult[]) ?? [] };
  }

  const algoliaArticles = articles as AlgoliaSearchResult<AlgoliaArticleHit>;
  return {
    ...res,
    data: algoliaArticles.hits.map(mapArticleHitToSearchResult),
    pagination: {
      page: algoliaArticles.page + 1,
      limit: algoliaArticles.hitsPerPage,
      total: algoliaArticles.nbHits,
      totalPages: algoliaArticles.nbPages,
    },
  };
}

// AUTH
export const registerUser = (data: Record<string, unknown>) => apiMutate<{ id: string }>('/api/auth/register', 'POST', data);
export const forgotPassword = (email: string) => apiMutate<null>('/api/auth/forgot-password', 'POST', { email });
export const resetPassword = (token: string, password: string) => apiMutate<null>('/api/auth/reset-password', 'POST', { token, password });
export const verifyEmail = (token: string) => apiMutate<null>('/api/auth/verify-email', 'POST', { token });

// VIDEOS
export async function fetchVideos(params?: { page?: number; gameId?: string }) {
  const sp = new URLSearchParams();
  if (params?.page && params.page > 1) sp.set('page', String(params.page));
  if (params?.gameId) sp.set('gameId', params.gameId);
  return apiFetch<VideoAsset[]>(`/api/videos${sp.toString() ? `?${sp}` : ''}`, { revalidate: 120 });
}

export const fetchVideoTranscript = (id: string) =>
  apiFetch<{ transcript: string | null }>(`/api/videos/${id}/transcript`, { cache: 'no-store' });

// BOOKMARKS
export const fetchBookmarks = () => apiFetch<Bookmark[]>('/api/bookmarks', { cache: 'no-store' });
export const toggleBookmark = (articleId: string) => apiMutate<{ bookmarked: boolean; id?: string }>('/api/bookmarks', 'POST', { articleId });

// USER
export const fetchUserProfile = () => apiFetch<User>('/api/user/profile', { cache: 'no-store' });
export const updateUserProfile = (data: Partial<User>) => apiMutate<User>('/api/user/profile', 'PUT', data);
export const fetchNotificationPreferences = () => apiFetch<NotificationPreference>('/api/user/notifications', { cache: 'no-store' });
export const updateNotificationPreferences = (data: Partial<NotificationPreference>) => apiMutate<NotificationPreference>('/api/user/notifications', 'PUT', data);
export async function exportUserData() { const r = await fetch(`${API_BASE}/api/user/export`, { credentials: 'include' }); return r.blob(); }
export const deleteAccount = (password: string) => apiMutate<null>('/api/user/account', 'DELETE', { password });
export const unlinkProvider = () => apiMutate<null>('/api/user/unlink-provider', 'POST');
export const fetchUserComments = () => apiFetch<Comment[]>('/api/user/comments', { cache: 'no-store' });
export const fetchRecentlyViewed = (revalidate = 0) => apiFetch<RecentlyViewedItem[]>('/api/user/recently-viewed', { revalidate });

// SESSIONS / DEVICES
export interface UserSession {
  id: string;
  browser: string;
  browserVersion?: string;
  os: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  ipAddress: string;
  location?: string;
  lastSeenAt: string;
  createdAt: string;
  revoked: boolean;
  isCurrent: boolean;
}
export const fetchUserSessions = () => apiFetch<UserSession[]>('/api/user/sessions', { cache: 'no-store' });
export const revokeAllSessions = () => apiMutate<null>('/api/user/sessions/revoke-all', 'POST');
export const revokeSession = (id: string) => apiMutate<null>(`/api/user/sessions/${id}`, 'DELETE');

// STRIKES
export const fetchUserStrikes = () => apiFetch<UserStrike[]>('/api/user/strikes', { cache: 'no-store' });

// NEWSLETTER
export const subscribeNewsletter = (email: string, prefs?: Record<string, boolean>) => apiMutate<null>('/api/newsletter/subscribe', 'POST', { email, preferences: prefs });
export const sendCampaign = (data: Record<string, unknown>) => apiMutate<null>('/api/newsletter/send', 'POST', data);
export const sendWeeklyRoundup = () => apiMutate<null>('/api/newsletter/weekly-roundup', 'POST');

// PUSH
export const subscribePush = (sub: { endpoint: string; keys: { auth: string; p256dh: string } }) => apiMutate<null>('/api/push/subscribe', 'POST', sub);

// UPLOAD
export async function uploadImage(file: File, folder?: string): Promise<ApiResponse<{ url: string }>> {
  const fd = new FormData(); fd.append('image', file);
  if (folder) fd.append('folder', folder);
  const r = await fetch(`${API_BASE}/api/upload/image`, { method: 'POST', credentials: 'include', body: fd });
  return r.json();
}

// ADMIN
export const fetchAdminStats = () => apiFetch<AdminStats>('/api/admin/stats', { cache: 'no-store' });
export const fetchWorkerHealth = () => apiFetch<WorkerHealth>('/api/admin/workers/health', { cache: 'no-store' });
export const fetchAdminUsers = (params?: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, String(v)); });
  return apiFetch<User[]>(`/api/admin/users?${sp}`, { cache: 'no-store' });
};
export const updateUserRole = (userId: string, role: string) => apiMutate<User>(`/api/admin/users/${userId}`, 'PUT', { role });
/** BUG-09: Deactivate user + issue strike-3 via admin DELETE /api/admin/users/[id] */
export const deactivateUser = (userId: string, reason?: string) => apiMutate<null>(`/api/admin/users/${userId}`, 'DELETE', { reason });
export const fetchAdminUserDetail = (userId: string) => apiFetch<AdminUserDetail>(`/api/admin/users/${userId}`, { cache: 'no-store' });
export const issueUserStrike = (userId: string, data: { reason: string; severity: number; expiresAt?: string | null }) =>
  apiMutate<UserStrike>(`/api/admin/users/${userId}/strikes`, 'POST', data);
export const removeUserStrike = (userId: string, strikeId: string) =>
  apiMutate<null>(`/api/admin/users/${userId}/strikes/${strikeId}`, 'DELETE');
export const fetchAdminComments = (params?: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, String(v)); });
  return apiFetch<Comment[]>(`/api/admin/comments?${sp}`, { cache: 'no-store' });
};
export const updateCommentStatus = (id: string, status: string) => apiMutate<Comment>(`/api/admin/comments/${id}`, 'PUT', { status });
export const fetchAdminScreenshots = (params?: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, String(v)); });
  return apiFetch<UserScreenshot[]>(`/api/admin/screenshots?${sp}`, { cache: 'no-store' });
};
export const updateScreenshotStatus = (id: string, status: string) => apiMutate<UserScreenshot>(`/api/admin/screenshots/${id}`, 'PUT', { status });
export const deleteScreenshot = (id: string) => apiMutate<null>(`/api/admin/screenshots/${id}`, 'DELETE');
export const approveScreenshot = (id: string) => apiMutate<UserScreenshot>(`/api/admin/screenshots/${id}/approve`, 'POST');
export const rejectScreenshot = (id: string) => apiMutate<null>(`/api/admin/screenshots/${id}/reject`, 'POST');
export const fetchAdPlacements = () => apiFetch<AdPlacement[]>('/api/admin/ads', { cache: 'no-store' });
export const updateAdPlacement = (zoneId: string, data: Partial<AdPlacement>) => apiMutate<AdPlacement>(`/api/admin/ads/${zoneId}`, 'PUT', data);
export const fetchNewsletterSubscribers = () => apiFetch<{ count: number; subscribers: NewsletterSubscriber[] }>('/api/newsletter/subscribers', { cache: 'no-store' });
export const fetchNewsletterStats = () => apiFetch<NewsletterStats>('/api/admin/newsletter/stats', { cache: 'no-store' });
export const fetchArticleVersions = (slug: string) => apiFetch<ArticleVersion[]>(`/api/posts/${slug}/versions`, { cache: 'no-store' });
export const restoreArticleVersion = (slug: string, vId: string) => apiMutate<Article>(`/api/posts/${slug}/versions/${vId}/restore`, 'POST');
export const fetchAnalytics = () => apiFetch<AnalyticsData>('/api/analytics/overview', { cache: 'no-store' });
export const fetchAdSenseReport = () => apiFetch<AdSenseReport>('/api/analytics/adsense', { cache: 'no-store' });
/** BUG-11: Previously unwired analytics endpoints now exported */
export const fetchAnalyticsTraffic = (params?: { range?: string; from?: string; to?: string; tag?: string; guideType?: string }) => {
  const sp = new URLSearchParams();
  if (params?.range) sp.set('range', params.range);
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  if (params?.tag) sp.set('tag', params.tag);
  if (params?.guideType) sp.set('guideType', params.guideType);
  return apiFetch<AnalyticsTrafficData>(`/api/analytics/traffic${sp.toString() ? `?${sp}` : ''}`, { cache: 'no-store' });
};
export const fetchRealtimeAnalytics = () => apiFetch<RealtimeAnalytics>('/api/admin/analytics/realtime', { cache: 'no-store' });
export const fetchLiveActivity = () => apiFetch<LiveActivityData>('/api/admin/analytics/live-activity', { cache: 'no-store' });
export const fetchPerformanceScores = () => apiFetch<PerformanceScores>('/api/admin/analytics/performance-scores', { cache: 'no-store' });
export const fetchAuthorPerformance = (id: string) => apiFetch<AuthorPerformance>(`/api/admin/analytics/authors/${id}`, { cache: 'no-store' });
export const fetchTopEarningArticles = () => apiFetch<TopEarningArticle[]>('/api/analytics/top-earning', { cache: 'no-store' });
export const fetchAffiliateStats = () => apiFetch<AffiliateStats>('/api/analytics/affiliate-stats', { cache: 'no-store' });
export const exportAnalyticsCSV = () => fetch(`${typeof window === 'undefined' ? (process.env.BACKEND_URL || 'http://localhost:3001') : (process.env.NEXT_PUBLIC_API_URL || '')}/api/analytics/export`, { credentials: 'include' }).then(r => r.blob());
export const fetchGA4Status = () => apiFetch<any>('/api/analytics/ga4-status', { cache: 'no-store' });
export const fetchSearchMisses = () => apiFetch<SearchMiss[]>('/api/admin/analytics/search-misses', { cache: 'no-store' });
export const fetchSearchAnalytics = (period: '7d' | '30d' | '90d' = '30d', limit = 50) =>
  apiFetch<SearchAnalytics>(`/api/admin/analytics/search?period=${period}&limit=${limit}`, { cache: 'no-store' });
export const fetchAuthorAnalytics = () => apiFetch<AuthorAnalytics[]>('/api/analytics/authors', { cache: 'no-store' });
export const updatePostStatus = (slug: string, action: string, type: string = 'NEWS', data?: Record<string, unknown>) => {
  const base = type === 'REVIEW' ? '/api/reviews' : type === 'MOD_GUIDE' ? '/api/mod-guides' : '/api/posts';
  return apiMutate<Article>(`${base}/${slug}/${action}`, 'POST', data);
};
export const fetchAdminPosts = (params?: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, String(v)); });
  return apiFetch<Article[]>(`/api/posts?${sp}`, { cache: 'no-store' });
};

// PUSH — Admin broadcast
/** Send a push notification broadcast to all subscribers (ADMIN only) */
export const sendPushNotification = (data: { title: string; body: string; url?: string; icon?: string }) =>
  apiMutate<null>('/api/push/send', 'POST', data);

// AUTOSAVE
export const fetchAutosave = (slugOrId: string, isPending = false) => {
  const url = isPending ? `/api/posts/autosave/pending/${slugOrId}` : `/api/posts/${slugOrId}/autosave`;
  return apiFetch<{ autosaveContent: any; autosavedAt: string; updatedAt?: string }>(url, { cache: 'no-store' });
};
export const updateAutosave = (slugOrId: string, data: { content: any; savedAt: string }, isPending = false) => {
  const url = isPending ? `/api/posts/autosave/pending/${slugOrId}` : `/api/posts/${slugOrId}/autosave`;
  return apiMutate<null>(url, 'PATCH', data);
};
export const deleteAutosave = (slugOrId: string, isPending = false) => {
  const url = isPending ? `/api/posts/autosave/pending/${slugOrId}` : `/api/posts/${slugOrId}/autosave`;
  return apiMutate<null>(url, 'DELETE');
};


// COMMUNITY RATINGS
export const fetchGameRatings = (slug: string, page = 1, sort: 'helpful' | 'recent' | 'highest' | 'lowest' = 'helpful') =>
  apiFetch<{ ratings: UserRating[]; aggregate: UserRatingAggregate }>(`/api/games/${slug}/ratings?page=${page}&sort=${sort}`, { cache: 'no-store' });
export const createGameRating = (slug: string, data: { score: number; body?: string }) =>
  apiMutate<UserRating>(`/api/games/${slug}/ratings`, 'POST', data);
export const deleteGameRating = (slug: string) =>
  apiMutate<null>(`/api/games/${slug}/ratings`, 'DELETE');
export const voteGameRating = (slug: string, ratingId: string, value: 1 | -1) =>
  apiMutate<{ helpfulCount: number; myVote: number | null }>(`/api/games/${slug}/ratings/${ratingId}/vote`, 'POST', { value });

// POLLS
export const fetchPolls = (params?: { articleId?: string; active?: boolean }) => {
  const sp = new URLSearchParams();
  if (params?.articleId) sp.set('articleId', params.articleId);
  if (params?.active !== undefined) sp.set('active', String(params.active));
  return apiFetch<Poll[]>(`/api/polls${sp.toString() ? `?${sp}` : ''}`, { revalidate: 60 });
};
export const fetchPoll = (id: string) => apiFetch<Poll>(`/api/polls/${id}`, { revalidate: 60 });
export const createPoll = (data: Record<string, unknown>) => apiMutate<Poll>('/api/polls', 'POST', data);
export const updatePoll = (id: string, data: Record<string, unknown>) => apiMutate<Poll>(`/api/polls/${id}`, 'PUT', data);
export const deletePoll = (id: string) => apiMutate<null>(`/api/polls/${id}?hard=true`, 'DELETE');
/** Convenience alias: equivalent to updatePoll(id, { isActive: false }). Kept for call-site readability. */
export const closePoll = (id: string) => apiMutate<Poll>(`/api/polls/${id}`, 'PUT', { isActive: false });
export const castPollVote = (id: string, optionIds: string[], sessionId?: string, customText?: string) =>
  apiMutate<Poll>(`/api/polls/${id}/vote`, 'POST', { optionIds, sessionId, customText });
export const fetchPollAdmin = (id: string) => apiFetch<Poll>(`/api/polls/${id}/admin`, { cache: 'no-store' });

// USER PREFERENCES
export const fetchUserPreferences = () =>
  apiFetch<UserContentPreference>('/api/user/preferences', { cache: 'no-store' });
export const updateUserPreferences = (data: { followedGenres?: string[]; followedPlatforms?: string[] }) =>
  apiMutate<UserContentPreference>('/api/user/preferences', 'PUT', data);

// PERSONALIZED FEED
export const fetchPersonalizedFeed = (page = 1) =>
  apiFetch<Article[]>(`/api/feed?page=${page}`, { cache: 'no-store' });

// WALKTHROUGHS FACETS
export const fetchWalkthroughFacets = (revalidate = 300) =>
  apiFetch<any>('/api/walkthroughs/facets', { revalidate });

// HOMEPAGE AGGREGATED DATA
export const fetchHomepage = (revalidate = 300) =>
  apiFetch<HomepageData>('/api/homepage', { revalidate });

// USER HOVER CARD — lightweight stats, used by comment author hover cards
export const fetchUserSummary = (username: string) =>
  apiFetch<UserProfileSummary>(`/api/users/${username}/summary`, { revalidate: 60 });

// USER PROFILE MODAL — paginated "Posts" tab
export const fetchUserPosts = (username: string, page = 1, limit = 10) =>
  apiFetch<UserPostItem[]>(`/api/users/${username}/posts?page=${page}&limit=${limit}`, { cache: 'no-store' });

// USER PROFILE MODAL — paginated "Reviews" tab
export const fetchUserReviews = (username: string, page = 1, limit = 10) =>
  apiFetch<UserReviewItem[]>(`/api/users/${username}/reviews?page=${page}&limit=${limit}`, { cache: 'no-store' });

// USER PROFILE MODAL — paginated "Articles" tab (staff authors)
export const fetchAuthorArticles = (username: string, page = 1, limit = 10, contentType?: string | null) => {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (contentType) qs.set('contentType', contentType);
  return apiFetch<AuthorArticleItem[]>(`/api/users/${username}/articles?${qs.toString()}`, { cache: 'no-store' });
};

// GAME METADATA (genres + platforms for filters)
export const fetchGameMetadata = () =>
  apiFetch<{ genres: string[]; platforms: string[] }>('/api/games/metadata', { revalidate: 3600 });

// IGDB
export async function fetchIgdbGameDetails(igdbId: number) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/games/igdb-search?id=${igdbId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Server-side IGDB helper — use BACKEND_URL (set during SSR/ISR), not NEXT_PUBLIC_API_URL
const _IGDB_SERVER_BASE = process.env.BACKEND_URL || 'http://localhost:3001';

export async function fetchIgdbData(igdbId: number) {
  try {
    const res = await fetch(
      `${_IGDB_SERVER_BASE}/api/games/igdb-search?id=${igdbId}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ANALYTICS
export const fetchArticleAnalytics = (params?: Record<string, string>) => {
  const sp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
  return apiFetch<unknown>(`/api/analytics/articles${sp.toString() ? `?${sp}` : ''}`, { cache: 'no-store' });
};

// MOD GUIDES - ATTACHMENTS
export const uploadModGuideAttachment = async (slug: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/mod-guides/${slug}/attachments`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload attachment');
  }
  return res.json();
};

// VIDEO UPLOADS
export const createVideoUpload = (title?: string) =>
  apiMutate<{ uploadUrl: string; assetId: string }>('/api/upload/video', 'POST', { title });

export const fetchVideoStatus = (assetId: string) =>
  apiFetch<{ id: string; status: string; duration?: number; title?: string }>(`/api/upload/video/${assetId}`, { cache: 'no-store' });

export const updateVideoAsset = (assetId: string, data: Record<string, unknown>) =>
  apiMutate<unknown>(`/api/upload/video/${assetId}`, 'PUT', data);

export const deleteVideoAsset = (assetId: string) =>
  apiMutate<null>(`/api/upload/video/${assetId}`, 'DELETE');

// =============================================================================
// PLATFORMS & GENRES HUB
// =============================================================================

export const fetchPlatforms = (revalidate = 1800) =>
  apiFetch<PlatformListItem[]>('/api/platforms', { revalidate });

export const fetchPlatformHub = (platform: string, revalidate = 1800) =>
  apiFetch<PlatformHubData>(`/api/platforms/${platform}`, { revalidate });

export const fetchGenres = (revalidate = 1800) =>
  apiFetch<GenreListItem[]>('/api/genres', { revalidate });

export const fetchThemes = (revalidate = 1800) =>
  apiFetch<GenreListItem[]>('/api/themes', { revalidate });

export const fetchGameModes = (revalidate = 1800) =>
  apiFetch<GenreListItem[]>('/api/modes', { revalidate });

export const fetchPlayerPerspectives = (revalidate = 1800) =>
  apiFetch<GenreListItem[]>('/api/perspectives', { revalidate });

export const fetchGenreHub = (genre: string, revalidate = 1800) =>
  apiFetch<GenreHubData>(`/api/genres/${genre}?v2`, { revalidate });

export const fetchThemeHub = (theme: string, revalidate = 1800) =>
  apiFetch<GenreHubData>(`/api/themes/${theme}?v2`, { revalidate });

export const fetchGameModeHub = (mode: string, revalidate = 1800) =>
  apiFetch<GenreHubData>(`/api/modes/${mode}?v2`, { revalidate });

export const fetchPlayerPerspectiveHub = (perspective: string, revalidate = 1800) =>
  apiFetch<GenreHubData>(`/api/perspectives/${perspective}?v2`, { revalidate });

// =============================================================================
// AWARDS
// =============================================================================

export const fetchAwards = (year: number, revalidate = 300) =>
  apiFetch<any[]>(`/api/awards/year/${year}`, { revalidate });

export const fetchAwardYears = (revalidate = 3600) =>
  apiFetch<number[]>('/api/awards/years', { revalidate });

export const submitAwardVote = (awardId: string, gameId: string, sessionId?: string) =>
  apiMutate<{ success: boolean; voteCounts: Record<string, number> }>(`/api/awards/${awardId}/vote`, 'POST', { gameId, sessionId });

export const fetchAdminAwards = (year?: number) =>
  apiFetch<any[]>(`/api/admin/awards${year ? `?year=${year}` : ''}`, { cache: 'no-store' });

export const createAward = (data: Partial<any>) =>
  apiMutate<any>('/api/admin/awards', 'POST', data);

export const updateAward = (id: string, data: Partial<any>) =>
  apiMutate<any>(`/api/admin/awards/${id}`, 'PUT', data);

export const deleteAward = (id: string) =>
  apiMutate<null>(`/api/admin/awards/${id}`, 'DELETE');

// EDITORIAL CALENDAR
export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
  contentType: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  authorDisplayName: string;
}

export interface CalendarData {
  byDate: Record<string, ArticleSummary[]>;
  unscheduled: ArticleSummary[];
}

export const fetchAdminCalendar = (month: string, includePublished = false) =>
  apiFetch<CalendarData>(
    `/api/admin/calendar?month=${month}&includePublished=${includePublished}`,
    { cache: 'no-store' }
  );

export const scheduleArticle = (id: string, scheduledAt: string | null) =>
  apiMutate<ArticleSummary>(`/api/admin/calendar/${id}/schedule`, 'PATCH', { scheduledAt });

// --- ARTICLE SERIES -----------------------------------------------------------

export interface SeriesArticleEntry {
  id: string;
  position: number;
  displayTitle: string | null;
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featuredImageUrl: string | null;
    publishedAt: string | null;
    contentType: string;
    status?: string;
    guideType?: string;
  } | null;
}

export interface SeriesSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  articleCount: number;
}

export interface SeriesDetail extends Omit<SeriesSummary, 'articleCount'> {
  entries: SeriesArticleEntry[];
}

export interface PublicSeries {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  isComplete: boolean;
  author: { displayName: string; username: string } | null;
  entries: SeriesArticleEntry[];
}

// Admin
export const fetchAdminSeries = () =>
  apiFetch<SeriesSummary[]>('/api/admin/series', { cache: 'no-store' });

export const fetchAdminSeriesById = (id: string) =>
  apiFetch<SeriesDetail>(`/api/admin/series/${id}`, { cache: 'no-store' });

export const createSeries = (data: {
  name: string; slug?: string; description?: string;
  coverImageUrl?: string; isComplete?: boolean;
}) => apiMutate<SeriesDetail>('/api/admin/series', 'POST', data);

export const updateSeries = (id: string, data: {
  name?: string; description?: string; coverImageUrl?: string; isComplete?: boolean;
  entries?: { id: string; position: number; displayTitle?: string }[];
  addArticleId?: string; removeEntryId?: string;
}) => apiMutate<SeriesDetail>(`/api/admin/series/${id}`, 'PUT', data);

export const deleteSeries = (id: string) =>
  apiMutate<null>(`/api/admin/series/${id}`, 'DELETE');

// Public
export const fetchPublicSeries = (slug: string, revalidate = 600) =>
  apiFetch<PublicSeries>(`/api/series/${slug}`, { next: { revalidate } } as any);

export const fetchAllPublicSeries = (revalidate = 600) =>
  apiFetch<SeriesSummary[]>('/api/series', { revalidate });

// --- LIVE BLOG ----------------------------------------------------------------

export const fetchLiveUpdates = (slug: string) =>
  apiFetch<LiveBlogUpdate[]>(`/api/articles/${slug}/live-updates`, { cache: 'no-store' });

export const postLiveUpdate = (slug: string, data: { content: unknown; label?: string }) =>
  apiMutate<LiveBlogUpdate>(`/api/articles/${slug}/live-updates`, 'POST', data);

export const toggleLiveUpdatePin = (slug: string, updateId: string) =>
  apiMutate<LiveBlogUpdate>(`/api/articles/${slug}/live-updates/${updateId}`, 'PATCH');

export const deleteLiveUpdate = (slug: string, updateId: string) =>
  apiMutate<null>(`/api/articles/${slug}/live-updates/${updateId}`, 'DELETE');

export const endLiveBlog = (slug: string) =>
  apiMutate<{ id: string; slug: string; isLiveBlog: boolean; liveBlogEndedAt: string }>(`/api/articles/${slug}/live-blog/end`, 'POST');

// --- READING LISTS / COLLECTIONS ----------------------------------------------

export const fetchUserLists = () =>
  apiFetch<ReadingList[]>('/api/user/lists', { cache: 'no-store' });

export const createReadingList = (data: { name: string; description?: string; isPublic?: boolean }) =>
  apiMutate<ReadingList>('/api/user/lists', 'POST', data);

export const fetchUserList = (id: string) =>
  apiFetch<ReadingList>(`/api/user/lists/${id}`, { cache: 'no-store' });

export const updateReadingList = (id: string, data: { name?: string; description?: string | null; isPublic?: boolean }) =>
  apiMutate<ReadingList>(`/api/user/lists/${id}`, 'PUT', data);

export const deleteReadingList = (id: string) =>
  apiMutate<null>(`/api/user/lists/${id}`, 'DELETE');

export const addItemToList = (id: string, data: { articleId?: string; gameId?: string }) =>
  apiMutate<{ id: string }>(`/api/user/lists/${id}/items`, 'POST', data);

export const removeItemFromList = (id: string, itemId: string) =>
  apiMutate<null>(`/api/user/lists/${id}/items/${itemId}`, 'DELETE');

export const reorderListItems = (id: string, order: string[]) =>
  apiMutate<{ reordered: boolean }>(`/api/user/lists/${id}/items`, 'PATCH', { order });

export const fetchPublicUserList = (username: string, slug: string, revalidate = 300) =>
  apiFetch<ReadingList>(`/api/users/${username}/lists/${slug}`, { revalidate });

// AI WRITING ASSISTANT (admin editor sidebar)
export const generateAiHeadlines = (content: string) =>
  apiMutate<{ headlines: string[] }>('/api/ai/headlines', 'POST', { content });

export const generateAiExcerpt = (content: string) =>
  apiMutate<{ excerpt: string }>('/api/ai/excerpt', 'POST', { content });

export const suggestAiTags = (content: string, existingTagIds: string[]) =>
  apiMutate<{ suggestedTagIds: string[]; suggestedNewTags: string[] }>('/api/ai/tags', 'POST', { content, existingTagIds });

/** Streams the 3 AI rewrite options (separated by "---OPTION---") via onChunk callback. */
export async function streamAiRewrite(
  text: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
      signal,
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '');
      let message = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(errText);
        message = parsed.message || parsed.error || message;
      } catch {}
      return { success: false, error: message };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return { success: false, error: 'Aborted' };
    return { success: false, error: 'Stream failed' };
  }
}
