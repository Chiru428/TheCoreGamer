// =============================================================================
// ENUMS
// =============================================================================

export enum Role {
  VISITOR = 'VISITOR',
  USER = 'USER',
  AUTHOR = 'AUTHOR',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ContentType {
  NEWS = 'NEWS',
  REVIEW = 'REVIEW',
  GUIDE = 'GUIDE',
  OPINION = 'OPINION',
  DEAL = 'DEAL',
  FEATURE = 'FEATURE',
  LISTICLE = 'LISTICLE',
}

export enum Difficulty {
  EASY = 'EASY',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum CommentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SPAM = 'SPAM',
  HIDDEN = 'HIDDEN',
}

export enum ReactionType {
  LIKE = 'LIKE',
  FIRE = 'FIRE',
  AGREE = 'AGREE',
  FUNNY = 'FUNNY',
  SURPRISED = 'SURPRISED',
}

// =============================================================================
// API RESPONSE
// =============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  pagination?: PaginationMeta;
}

// =============================================================================
// MODELS
// =============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: Role;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  oauthProvider: string | null;
  premiumUntil: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  /** Whether a credentials password is set (required to unlink an OAuth provider). */
  hasPassword?: boolean;
  usernameChangedAt?: string | null;
  /** Set while the 30-day username-change cooldown is active. */
  usernameCooldownUntil?: string | null;
  // -- Author credentialing fields (added in migration) --------------
  /** Expanded bio displayed on the public author page. */
  authorBio?: string | null;
  /** Array of expertise tags, e.g. ["RPGs", "Hardware"]. */
  expertise?: string[];
  /** Years of games journalism / writing experience. */
  yearsExperience?: number | null;
  /** Twitter/X handle, with or without leading @. */
  twitterHandle?: string | null;
  /** LinkedIn profile URL. */
  linkedinUrl?: string | null;
  /** Total number of published reviews by this author. */
  reviewCount?: number;
  /** Total view count across all of this author's articles. */
  totalAuthorViewCount?: number | bigint;
  // -- Public author profile extras (returned by /api/users/[username]) --
  /** Recent game ratings by this author (for the author profile page). */
  recentRatings?: Array<{
    id: string;
    score: number;
    createdAt: string;
    gameTitle: string;
    gameSlug: string;
    gameCoverImageUrl: string | null;
  }>;
  /** Articles authored — returned by /api/users/[username]. */
  articles?: import('./index').Article[];
  // -- Public profile fields (added in user_profiles migration) --
  /** PUBLIC | PRIVATE — private profiles return 404 from /api/users/[username]. */
  profileVisibility?: 'PUBLIC' | 'PRIVATE' | null;
  /** Whether the Bookmarks tab is visible on the public profile. */
  isPublicBookmarks?: boolean;
  /** Count of PUBLISHED articles by this user. */
  articleCount?: number;
  /** Count of approved comments by this user. */
  commentCount?: number;
  /** Count of game ratings by this user. */
  gameRatingCount?: number;
  /** Article pinned to the top of this user's profile, if set. */
  pinnedArticle?: import('./index').Article | null;
  /** Last 5 PUBLISHED articles — returned by /api/users/[username]. */
  recentArticles?: import('./index').Article[];
  /** Last 5 approved comments — returned by /api/users/[username]. */
  recentComments?: Array<{
    id: string;
    body: string;
    createdAt: string;
    articleTitle: string;
    articleSlug: string;
    articleContentType: string;
  }>;
  /** Bookmarked articles — only present when isPublicBookmarks is true. */
  bookmarks?: import('./index').Article[];
}

export interface UserStrike {
  id: string;
  reason: string;
  severity: number;
  issuedAt: string;
  expiresAt: string | null;
  IssuedBy?: { displayName: string; username: string } | null;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lockUntil: string | null;
  strikes: UserStrike[];
  _count: { articles: number; comments: number };
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
  role?: string;
  isStaff?: boolean;
}

/** Lightweight stats shown in the hover card when hovering a commenter's avatar/username. */
export interface UserProfileSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  isStaff: boolean;
  profileVisibility: 'PUBLIC' | 'PRIVATE';
  bio: string | null;
  expertise: string[];
  twitterHandle: string | null;
  linkedinUrl: string | null;
  likesCount: number;
  commentsCount: number;
  reviewsCount: number;
  articlesCount: number;
  availableContentTypes?: ContentType[];
}

/** One row in the profile modal's paginated "Posts" tab. */
export interface UserPostItem {
  id: string;
  body: string;
  gifUrl: string | null;
  createdAt: string;
  articleTitle: string;
  articleSlug: string;
  articleContentType: string;
  articleFeaturedImageUrl: string | null;
}

/** One row in the profile modal's paginated "Reviews" tab. */
export interface UserReviewItem {
  id: string;
  score: number;
  body: string | null;
  createdAt: string;
  gameTitle: string;
  gameSlug: string;
  gameCoverImageUrl: string | null;
}

/** One row in the profile modal's paginated "Articles" tab (staff authors only). */
export interface AuthorArticleItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  contentType: ContentType;
  guideType?: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: unknown; // TipTap JSON
  excerpt: string | null;
  featuredImageUrl: string | null;
  featuredImageCredit?: string | null;
  status: ArticleStatus;
  contentType: ContentType;
  guideType?: string | null;
  authorId: string;
  editorId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  originallyPublishedAt?: string | null;
  scheduledAt: string | null;
  embargoUntil?: string | null;
  viewCount: number;
  featured: boolean;
  isBreaking: boolean;
  isSponsored: boolean;
  sponsorName: string | null;
  isLiveBlog: boolean;
  liveBlogEndedAt: string | null;
  rejectionReason: string | null;
  deletionRequestedAt?: string | null;
  deletionRequestReason?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  author: UserSummary;
  editor?: UserSummary | null;
  deletionRequestedBy?: UserSummary | null;
  tags: ArticleTagRelation[];
  gameReview?: GameReview | null;
  modGuide?: ModGuideData | null;
  _count?: {
    comments: number;
    reactions: number;
  };
  scoreBadge?: { label: string; color: string };
  videoAssets?: Array<{
    id: string;
    title: string;
    muxPlaybackId: string;
    aspectRatio: string | null;
    duration: number | null;
    transcript: string | null;
    thumbnailUrl: string | null;
    createdAt: string;
  }>;
  polls?: Poll[];
  communityScore?: number | null;
  communityRatingCount?: number;
  games?: { id: string; title: string; slug?: string }[];
}

export interface ArticleTagRelation {
  articleId: string;
  tagId: string;
  tag: Tag;
}

export interface LiveBlogUpdate {
  id: string;
  articleId: string;
  authorId: string;
  content: unknown; // TipTap JSON
  publishedAt: string;
  isPinned: boolean;
  label: string | null;
  position: number;
  author?: UserSummary;
}

export interface ArticleVersion {
  id: string;
  articleId: string;
  versionNumber: number;
  title: string;
  content: unknown;
  editorId: string;
  createdAt: string;
  editor?: UserSummary;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
}

export interface VideoAsset {
  id: string;
  title: string;
  muxPlaybackId: string;
  aspectRatio: string | null;
  duration: number | null;
  createdAt: string;
  article?: {
    id: string;
    title: string;
    slug: string;
    contentType: ContentType;
    featuredImageUrl: string | null;
  } | null;
}

export interface GameReview {
  id: string;
  articleId: string;
  gameTitle: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  platforms: string[];
  genres: string[];
  reviewScore: number;
  verdict: string;
  showReviewDetails?: boolean;
  originalScore: number | null;
  scoreUpdatedAt: string | null;
  scoreUpdateReason: string | null;
  gameId: string;
  game?: Game | null;
  copyProvidedByPublisher?: boolean;
  platformsTested?: string[];
  ReviewScorePlatforms?: ReviewScorePlatform[];
  ScoreHistory?: ReviewScoreHistory[];
}

export interface ReviewScorePlatform {
  id: string;
  reviewId: string;
  platform: string;
  gameplay: number | null;
  visuals: number | null;
  story: number | null;
  performance: number | null;
  value: number | null;
  overall: number;
  notes: string | null;
}

export interface ReviewScoreHistory {
  id: string;
  reviewId: string;
  oldScore: number;
  newScore: number;
  reason: string;
  changedAt: string;
  changedById: string | null;
}

export interface ModGuideData {
  id: string;
  articleId: string;
  gameName: string;
  modName: string;
  gameVersionNotes: string;
  gameVersion: string;
  gameVersionDate?: string | null;
  lastVerifiedAt?: string | null;
  lastVerifiedVersion?: string | null;
  lastVerifiedBy?: { id: string; displayName: string; avatarUrl: string | null } | null;
  compatibilityNotes?: string | null;
  difficulty: Difficulty;
  estimatedInstallMinutes: number;
  prerequisiteList: ModPrerequisite[];
  sections?: { title: string; content: unknown }[] | null;
  bodyTitle?: string | null;
  installationTitle?: string | null;
  gameId: string | null;
  game?: Game | null;
  attachments?: MediaAttachment[];
  helpfulCount: number;
  notHelpfulCount: number;
}

export interface ModPrerequisite {
  name: string;
  url?: string;
  required: boolean;
}



export interface MediaAttachment {
  id: string;
  modGuideId: string;
  filename: string;
  fileUrl: string;
  fileSizeBytes: number | string;
  mimeType: string;
  createdAt: string;
}

/** Company entry from IGDB allCompaniesJson */
export interface GameCompanyEntry {
  name: string;
  logoUrl: string | null;
  role: 'Developer' | 'Publisher' | 'Porting' | 'Supporting';
}

/** Per-platform/region release date entry from IGDB releaseDatesByPlatformJson */
export interface GameReleaseDateEntry {
  platform?: string;
  date: string | null;
  region: string;
}

/** DLC/expansion entry from IGDB dlcsJson/expansionsJson */
export interface GameMediaEntry {
  name?: string;
  coverUrl: string | null;
  releaseDate: string | null;
  category?: string;
}

/** Similar-game entry from IGDB similarGamesJson */
export interface GameSimilarGameEntry {
  name: string;
  slug: string;
  coverUrl: string | null;
  rating?: number;
  platforms: string[];
}

/** Trailer/video entry from IGDB videosJson */
export interface GameVideoEntry {
  videoId: string;
  name?: string;
  youtubeEmbedUrl: string;
}

/** Official link map from IGDB websitesJson */
export interface GameWebsiteLinks {
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
}

/** Co-op/multiplayer support flags from IGDB multiplayerModesJson */
export interface GameMultiplayerModeEntry {
  onlineCoop?: boolean;
  lanCoop?: boolean;
  offlineCoop?: boolean;
  splitscreen?: boolean;
  onlineCoopMax?: number;
  offlineCoopMax?: number;
}

/** Localization entry from IGDB languageSupportsJson */
export interface GameLanguageSupportEntry {
  language?: string;
  type?: string;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  backgroundImageUrl?: string | null;
  steamAppId: string | null;
  description: string | null;
  developer: string | null;
  publisher: string | null;
  releaseDate: string | null;
  platforms: string[];
  genres: string[];
  tags: string[];
  metacritic: number | null;
  esrbRating: string | null;
  /** PEGI content rating (e.g. "PEGI 18") — added in recent migration */
  pegiRating: string | null;
  playtime: number | null;
  /** IGDB-sourced fields (nullable until a game is linked to IGDB) */
  storyline?: string | null;
  igdbId?: number | null;
  igdbSlug?: string | null;
  igdbUrl?: string | null;
  totalRating?: number | null;
  totalRatingCount?: number | null;
  releaseStatus?: string | null;
  /** IGDB media galleries */
  screenshotUrls?: string[];
  artworkUrls?: string[];
  /** IGDB taxonomy fields */
  themes?: string | null;
  keywords?: string | null;
  gameModes?: string[];
  playerPerspectives?: string[];
  gameEngine?: string | null;
  /** IGDB ratings */
  aggregatedRating?: number | null;
  aggregatedRatingCount?: number | null;
  /** Collection (series) name, e.g. "The Witcher" */
  collectionName?: string | null;
  /** Rich IGDB JSON columns */
  allCompaniesJson?: GameCompanyEntry[] | null;
  releaseDatesByPlatformJson?: GameReleaseDateEntry[] | null;
  dlcsJson?: GameMediaEntry[] | null;
  expansionsJson?: GameMediaEntry[] | null;
  similarGamesJson?: GameSimilarGameEntry[] | null;
  videosJson?: GameVideoEntry[] | null;
  websitesJson?: GameWebsiteLinks | null;
  multiplayerModesJson?: GameMultiplayerModeEntry | null;
  languageSupportsJson?: GameLanguageSupportEntry[] | null;
  /** DLC/Expansion fields */
  dlcOfId?: string | null;
  dlcOf?: Game | null;
  dlcs?: Game[];
  gameEdition?: string | null;
  createdAt: string;
  updatedAt: string;
  reviews?: GameReview[];
  guides?: ModGuideData[];
}

export type CommentReactionType = '🔥' | '😂' | '😲' | '👍' | '❤️';

export interface Comment {
  id: string;
  articleId: string;
  parentId: string | null;
  authorId: string | null;
  authorName: string;
  authorEmail: string;
  body: string;
  status: CommentStatus;
  upvotes: number;
  downvotes: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: UserSummary | null;
  replies?: Comment[];
  netScore?: number;
  article?: Article;
  gifUrl?: string | null;
  gifId?: string | null;
  rootId?: string | null;
  sortScore?: number;
  mentionedUserIds?: string[];
  reactions?: Partial<Record<CommentReactionType, number>>;
  userReactions?: CommentReactionType[];
  /** The current viewer's own vote on this comment, if any (0 if none or anonymous). */
  userVote?: 1 | -1 | 0;
}

export type CommentSort = 'best' | 'new' | 'top';

export interface TenorGif {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
}

export type UserScreenshotStatus = 'PENDING' | 'APPROVED';

export interface UserScreenshot {
  id: string;
  gameId: string;
  userId: string;
  imageUrl: string;
  caption: string | null;
  status: UserScreenshotStatus;
  createdAt: string;
  User?: UserSummary;
  Game?: { id: string; title: string; slug: string };
}

export type ArticleReactionCounts = Record<string, number>;

export interface Bookmark {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
  article?: Article;
}

export interface CommentVote {
  id: string;
  commentId: string;
  userId: string;
  value: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  confirmed: boolean;
  preferences: Record<string, boolean> | null;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

export interface NewsletterSponsoredContent {
  sponsor: string;
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl?: string;
}

export interface NewsletterSendStats {
  id: string;
  subject: string;
  sentAt: string;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  hasSponsored: boolean;
  sponsorName: string | null;
  openRate: number;
  clickRate: number;
}

export interface NewsletterSubscriberGrowthPoint {
  date: string;
  newSubscribers: number;
  total: number;
}

export interface NewsletterStats {
  history: NewsletterSendStats[];
  subscriberGrowth: NewsletterSubscriberGrowthPoint[];
}

export interface AdPlacement {
  id: string;
  zoneId: string;
  name: string;
  isActive: boolean;
  adUnitId: string;
  format: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  newArticlesInCategories: boolean;
  commentReplies: boolean;
  newsletter: boolean;
  pushEnabled: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

// =============================================================================
// ADMIN
// =============================================================================

export interface AdminStats {
  totalPublished: number;
  pendingReview: number;
  totalUsers: number;
  activeAdZones: number;
  articles?: {
    total: number;
    published: number;
    drafts: number;
    inReview: number;
    byType: {
      news: number;
      review: number;
      modGuide: number;
      walkthrough: number;
      deal: number;
      opinion: number;
      feature: number;
      listicle: number;
    };
  };
  topAuthors?: Array<{
    id: string;
    name: string;
    image: string | null;
    articleCount: number;
  }>;
  topDeals?: Array<{
    store: string;
    clickCount: number;
  }>;
  recentActivity?: {
    articles: Array<{
      id: string;
      title: string;
      publishedAt: string | null;
      authorName: string;
    }>;
    comments: Array<{
      id: string;
      body: string;
      createdAt: string;
      authorName: string;
      articleTitle: string;
    }>;
  };
}

export interface QueueJobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface WorkerHealth {
  queues: Record<string, QueueJobCounts>;
  timestamp: string;
  status: "healthy" | "degraded" | "critical";
}

export interface AnalyticsData {
  pageViews: { date: string; views: number }[];
  uniqueVisitors: number;
  bounceRate: number;
  sessionDuration: number;
}

export interface AdSenseReport {
  estimatedEarnings: number;
  rpm: number;
  impressions: number;
  ctr: number;
  perUnit: { unitId: string; earnings: number; impressions: number }[];
}

// =============================================================================
// SEARCH
// =============================================================================

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentType: ContentType;
  featuredImageUrl: string | null;
  publishedAt: string | null;
  author: { displayName: string; avatarUrl: string | null };
  content?: unknown;
}

export interface AutocompleteResult {
  id: string;
  title?: string;
  name?: string;
  slug: string;
  type: 'ARTICLE' | 'TAG' | 'GAME';
  contentType?: string;
  imageUrl?: string | null;
}

// =============================================================================
// ALGOLIA SEARCH
// =============================================================================

export interface AlgoliaHighlightResult {
  value: string;
  matchLevel: 'none' | 'partial' | 'full';
  matchedWords: string[];
}

export interface AlgoliaArticleHit {
  objectID: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentType: ContentType;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  featuredImageUrl: string | null;
  publishedAt: number;
  publishedAtISO: string;
  viewCount: number;
  commentCount: number;
  readingTimeMinutes: number;
  reviewScore: number | null;
  gameName: string | null;
  gameSlug: string | null;
  platforms: string[];
  genres: string[];
  tags: string[];
  isBreaking: boolean;
  isFeatured: boolean;
  isSponsored: boolean;
  _highlightResult?: Record<string, AlgoliaHighlightResult>;
  _snippetResult?: Record<string, AlgoliaHighlightResult>;
}

export interface AlgoliaGameHit {
  objectID: string;
  title: string;
  slug: string;
  developer: string | null;
  publisher: string | null;
  coverImageUrl: string | null;
  releaseDate: number | null;
  platforms: string[];
  genres: string[];
  esrbRating: string | null;
  metacriticScore: number | null;
  avgUserScore: number | null;
  editorialScore: number | null;
  tags: string[];
  franchiseName: string | null;
  collectionName: string | null;
  _highlightResult?: Record<string, AlgoliaHighlightResult>;
}

export interface AlgoliaTagHit {
  objectID: string;
  name: string;
  slug: string;
  description: string | null;
  articleCount: number;
  color: string | null;
  _highlightResult?: Record<string, AlgoliaHighlightResult>;
}

export interface AlgoliaUserHit {
  objectID: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  articleCount: number;
  isStaff: boolean;
  _highlightResult?: Record<string, AlgoliaHighlightResult>;
}

export interface AlgoliaVideoHit {
  objectID: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  type: string;
  duration: number | null;
  gameName: string | null;
  gameSlug: string | null;
  tags: string[];
  publishedAt: number;
  viewCount: number;
  _highlightResult?: Record<string, AlgoliaHighlightResult>;
}

export interface AlgoliaSearchResult<T> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  facets?: Record<string, Record<string, number>>;
  typoSuggestion?: string;
}

export interface AutocompleteApiResponse {
  articles: AlgoliaArticleHit[];
  games: AlgoliaGameHit[];
  tags: AlgoliaTagHit[];
}

export interface SearchApiResponse {
  articles: AlgoliaSearchResult<AlgoliaArticleHit> | SearchResult[];
  games: AlgoliaSearchResult<AlgoliaGameHit> | [];
  tags: AlgoliaSearchResult<AlgoliaTagHit> | [];
  users: AlgoliaSearchResult<AlgoliaUserHit> | [];
  videos: AlgoliaSearchResult<AlgoliaVideoHit> | [];
  isFallback?: boolean;
}

// =============================================================================
// DEALS / WISHLIST
// =============================================================================

export interface PriceSnapshot {
  id: string;
  gameId: string;
  shop: string;
  priceINR: number;
  cutPercent: number;
  url: string;
  recordedAt: string;
  Game?: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
  };
}


// =============================================================================
// COMMUNITY RATINGS
// =============================================================================

export interface UserRating {
  id: string;
  userId: string;
  gameId: string;
  score: number;
  body: string | null;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
  myVote?: number | null;
}

export interface UserRatingAggregate {
  averageScore: number;
  totalRatings: number;
  distribution: Record<string, number>;
  userRating: UserRating | null;
}

// =============================================================================
// GAME HUB (games/[slug] tabbed page)
// =============================================================================

/** Latest price for one store, derived from PriceSnapshot */
export interface GamePriceEntry {
  shop: string;
  priceINR: number;
  regularINR?: number;
  cutPercent: number;
  voucher?: string;
  expiry?: string;
  drm?: string;
  url: string;
  recordedAt: string;
}

export interface GameHubReview extends GameReview {
  Article?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featuredImageUrl: string | null;
    contentType: string;
    publishedAt: string | null;
    status: string;
  };
}

/** Extended payload returned by GET /api/games/[slug] */
export interface GameHubData extends Game {
  GameReview?: GameHubReview[];
  articlesCount: number;
  articleContentTypes?: string[];
  userRatings: { average: number; count: number };
  priceData: GamePriceEntry[];
  dbSimilarGames?: GameCardItem[];
}

/** Official imagery stored on the Game row (screenshots tab) */
export interface OfficialScreenshot {
  id: string;
  imageUrl: string;
  caption: string | null;
}

/** Lightweight game payload for similar-games cards on the game hub page */
export interface GameCardItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  developer: string;
  publisher: string;
  releaseDate: string | null;
  platforms: string[];
  genres: string[];
}

// =============================================================================
// POLLS
// =============================================================================

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  voteCount: number;
  allowCustomInput?: boolean;
}

export interface Poll {
  id: string;
  question: string;
  articleId: string | null;
  Article?: { title: string; slug: string; contentType: string } | null;
  createdById: string;
  expiresAt: string | null;
  isActive: boolean;
  allowMultiple: boolean;
  homepageSlot: number | null;
  createdAt: string;
  Options: PollOption[];
  totalVotes: number;
  userVotes: string[];
  inlineArticles?: { id: string; title: string; slug: string; contentType: string }[];
  customTextVotes?: {
    optionId: string;
    customText: string | null;
    createdAt: string;
    User: { username: string } | null;
  }[];
  publicCustomAnswers?: {
    optionId: string;
    customText: string;
    createdAt: string;
  }[];
}

// =============================================================================
// USER PREFERENCES
// =============================================================================

export interface UserContentPreference {
  id?: string;
  userId: string;
  followedGenres: string[];
  followedPlatforms: string[];
  updatedAt?: string;
}

// =============================================================================
// HOMEPAGE AGGREGATED DATA
// =============================================================================

export interface HomepageData {
  featured: Article[];
  breaking: Article[];
  latest: Article[];
  recentlyUpdated: Article[];
  news: Article[];
  guides: Article[];
  reviews: Article[];
  popular: Article[];
  deals: Article[];
  listicles: Article[];
  features: Article[];
  opinions: Article[];
  homepagePollId: string | null;
  homepagePoll2Id: string | null;
}

// =============================================================================
// USER ACTIVITY
// =============================================================================

/** BUG-06: Previously typed as any[] */
export interface RecentlyViewedItem {
  id: string;
  userId: string;
  articleId: string;
  viewedAt: string;
  article: {
    id: string;
    title: string;
    slug: string;
    contentType: ContentType;
    featuredImageUrl: string | null;
    publishedAt: string | null;
    author: UserSummary;
  };
}

// =============================================================================
// AUTHOR ANALYTICS
// =============================================================================

/** MINOR-01: Previously typed as any[] */
export interface AuthorAnalytics {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  avgViewsPerArticle: number;
}

// =============================================================================
// EXTENDED ANALYTICS TYPES (BUG-11)
// =============================================================================

export interface AnalyticsTrafficData {
  range: string;
  from: string | null;
  to: string | null;
  message?: string;
  data: Array<{ date: string; pageViews: number; uniqueVisitors: number }>;
}

export interface RealtimeAnalytics {
  activeUsers: number;
  topPages: { path: string; activeUsers: number }[];
  trafficSources: { source: string; users: number }[];
  updatedAt: string;
}

export interface LiveActivityData {
  pages: { slug: string; title: string; activeCount: number }[];
}

export interface PerformanceScoreArticle {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  score: number;
  publishedAt: string;
  daysSincePublished: number;
  lastMajorUpdateAt: string | null;
  daysSinceUpdate: number | null;
}

export interface PerformanceScores {
  trending: PerformanceScoreArticle[];
  needs_refresh: PerformanceScoreArticle[];
  underperforming: PerformanceScoreArticle[];
}

export interface AuthorPerformance {
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    role: string;
    createdAt: string;
  };
  totalViews: number;
  viewsThisMonth: number;
  articleCount: number;
  avgViewsPerArticle: number;
  totalComments: number;
  commentEngagementRate: number;
  topArticles: { id: string; title: string; slug: string; contentType: string; viewCount: number; publishedAt: string | null }[];
  reviewCount: number;
  avgReviewScore: number | null;
  siteAverageViews: number;
  percentileRank: number;
  monthlyTrend: { month: string; views: number }[];
}

export interface TopEarningArticle {
  id: string;
  title: string;
  slug: string;
  viewCount: string | number;
  publishedAt: string | null;
  author: { displayName: string };
}

export interface AffiliateStats {
  periodDays: number;
  totalClicks: number;
  clicksByStore: Array<{ store: string; clicks: number }>;
  topArticles: Array<{
    articleId: string | null;
    clicks: number;
    article?: { id: string; title: string; slug: string } | null;
  }>;
}

export interface SearchMiss {
  query: string;
  count: number;
  lastSearchedAt: string;
}

export interface SearchAnalytics {
  topQueries: { query: string; count: number; avgResults: number }[];
  zeroResultQueries: { query: string; count: number; lastSeen: string }[];
  searchVolumeTrend: { date: string; count: number }[];
  period: string;
  totalSearches: number;
  uniqueQueries: number;
  zeroResultCount: number;
}


// =============================================================================
// GAMING BLOCK ATTRS
// =============================================================================

export interface AwardBadgeAttrs {
  award: 'Game of the Year' | "Editor's Choice" | 'Best Story' | 'Best Visuals' | 'Best Audio' | 'Best Multiplayer' | 'Best Indie' | 'Must Play';
  year: string;
  category: string;
  publisher?: string;
}

export interface StatCompareAttrs {
  title?: string;
  headers: string[];
  rows: Array<{ label: string; values: string[]; winnerIndex?: number }>;
  highlightWinner: boolean;
}

export interface LootTableAttrs {
  gameName?: string;
  areaName?: string;
  items: Array<{
    name: string;
    source: string;
    dropRate: string;
    rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Unique';
    notes?: string;
  }>;
}

export interface InlinePollAttrs {
  pollId: string;
  headline?: string;
  displayStyle: 'bar' | 'minimal';
}

export interface ModCardAttrs {
  modName: string;
  author: string;
  version: string;
  gameVersion: string;
  downloadUrl: string;
  downloadCount?: string;
  lastUpdated?: string;
  fileSizeMB?: string;
  compatibility: 'Verified' | 'Untested' | 'Broken' | 'Outdated';
  description?: string;
  tags?: string[];
}

export interface VideoTimestampAttrs {
  embedType: 'youtube' | 'mux';
  embedId: string;
  timestamp: number;
  label: string;
  thumbnailUrl?: string;
}

export interface SocialEmbedAttrs {
  platform: 'twitter' | 'reddit';
  url: string;
  authorName?: string;
  authorHandle?: string;
  content?: string;
  postDate?: string;
  avatarUrl?: string;
  mediaUrl?: string;
}

export interface NewsletterCtaAttrs {
  headline?: string;
  description?: string;
  ctaLabel?: string;
  variant?: 'card' | 'minimal';
}

export interface RelatedArticlesAttrs {
  headline?: string;
  articles: Array<{
    slug: string;
    title: string;
    imageUrl?: string;
    contentType: string;
  }>;
}

export interface HardwareSpecAttrs {
  productName: string;
  category: 'GPU' | 'CPU' | 'Monitor' | 'Headset' | 'Mouse' | 'Keyboard' | 'Controller' | 'SSD' | 'RAM' | 'Motherboard';
  imageUrl?: string;
  msrp?: string;
  verdict?: 'Buy' | 'Consider' | 'Skip';
  verdictReason?: string;
  specs: Array<{ label: string; value: string }>;
  pros?: string[];
  cons?: string[];
  score?: number;
}

export interface PriceHistoryAttrs {
  gameSlug: string;
  gameName: string;
  currentPrice?: string;
  allTimeLow?: string;
  storeName?: string;
}

export interface ModLoadOrderAttrs {
  title?: string;
  gameVersion?: string;
  totalMods?: number;
  entries: Array<{
    position: number;
    modName: string;
    author?: string;
    notes?: string;
    conflictWarning?: string;
    required: boolean;
  }>;
}

export interface ControversyBlockAttrs {
  title: string;
  summary?: string;
  events: Array<{
    date: string;
    actor: string;
    actorType: 'developer' | 'publisher' | 'community' | 'press' | 'regulator';
    description: string;
    sentiment: 'neutral' | 'negative' | 'positive' | 'resolution';
  }>;
  outcome?: string;
  outcomeSentiment?: 'positive' | 'negative' | 'mixed' | 'ongoing';
}

// =============================================================================
// PLATFORMS & GENRES HUB
// =============================================================================

export interface PlatformListItem {
  platform: string;
  gameCount: number;
}

export interface GenreListItem {
  genre: string;
  gameCount: number;
}

export interface PlatformHubData {
  platform: string;
  gameCount: number;
  topGames: Game[];
  latestArticles: Article[];
  upcomingGames: Game[];
}

export interface GenreHubData {
  genre: string;
  gameCount: number;
  topGames: Game[];
  latestArticles: Article[];
  relatedGenres: string[];
}

// =============================================================================
// AWARDS
// =============================================================================

export interface Award {
  id: string;
  year: number;
  category: string;
  winnerGameId: string | null;
  nomineesJson: any; // e.g. [{ gameId, title, coverImageUrl, score }]
  editorPickId: string | null;
  isVotingOpen: boolean;
  createdAt: string;
  updatedAt: string;
  winnerGame?: Game | null;
  editorPick?: UserSummary | null;
}

export interface AwardVote {
  id: string;
  awardId: string;
  userId: string | null;
  sessionId: string | null;
  gameId: string;
  createdAt: string;
}

export interface AwardCategoryPayload {
  award: Award;
  nominees: Array<{ gameId: string; title: string; coverImageUrl: string; score: number }>;
  voteCounts: Record<string, number>;
  totalVotes: number;
}

// =============================================================================
// READING LISTS / COLLECTIONS
// =============================================================================

/** Game payload shape returned for ReadingListItem.game (GAME_SELECT in backend) */
export interface ReadingListGameItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  releaseDate: string | null;
  platforms: string[];
  genres: string[];
  rating: number | null;
}

export interface ReadingListItem {
  id: string;
  listId: string;
  articleId: string | null;
  gameId: string | null;
  position: number;
  addedAt: string;
  article: Article | null;
  game: ReadingListGameItem | null;
}

export interface ReadingList {
  id: string;
  userId?: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  slug: string;
  createdAt: string;
  updatedAt: string;
  /** Present on list summaries (GET /api/user/lists, GET /api/users/[username]/lists) */
  itemCount?: number;
  /** Present on single-list detail responses */
  items?: ReadingListItem[];
  /** Present on public single-list responses */
  author?: UserSummary;
}

