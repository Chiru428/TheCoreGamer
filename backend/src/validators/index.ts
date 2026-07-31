import { z } from "zod";

// ============================================================================
// AUTH
// ============================================================================

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores"
    ),
  displayName: z.string().min(1).max(100),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
  recoveryCode: z.string().min(1).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});

export const totpVerifySchema = z.object({
  code: z.string().length(6),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

// Shared TipTap document content schema with 2 MB size guard
const tiptapContentSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.any()).optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    let nodeCount = 0;
    const walk = (node: any, depth: number) => {
      nodeCount++;
      if (depth > 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Document exceeds maximum nesting depth of 10 levels",
        });
        return;
      }
      if (nodeCount > 5000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Document exceeds maximum of 5000 nodes",
        });
        return;
      }
      if (Array.isArray(node?.content)) {
        for (const child of node.content) walk(child, depth + 1);
      }
    };
    walk(val, 0);
  })
  .refine(
    (val) => JSON.stringify(val).length < 2_000_000,
    "Content too large (must be under 2 MB)"
  );

// ============================================================================
// ARTICLES
// ============================================================================

export const createArticleSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().max(75).optional(),
  content: tiptapContentSchema,
  excerpt: z.string().max(300).optional(),
  featuredImageUrl: z.string().url().optional(),
  featuredImageCredit: z.string().max(200).optional(),
  contentType: z.enum(["NEWS", "REVIEW", "GUIDE", "OPINION", "DEAL", "LISTICLE"]),
  guideType: z.string().optional(),
  tagIds: z.array(z.string().min(1)).optional(),
  seoTitle: z.string().max(90).optional(),
  seoDescription: z.string().max(250).optional(),
  focusKeyword: z.string().max(100).optional(),
  featured: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  isSponsored: z.boolean().optional(),
  sponsorName: z.string().max(120).optional(),
  isLiveBlog: z.boolean().optional(),
  embargoUntil: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z
    .enum(["DRAFT", "IN_PROGRESS", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
    .optional(),
  gameIds: z.array(z.string().min(1)).optional(),
  pendingDraftId: z.string().optional(),
  // Deal-specific
  store: z.string().optional(),
  product: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  price: z.string().optional(),
  originalPrice: z.string().optional(),
  dealPlatform: z.string().optional(),
  dealScore: z.number().min(0).max(10).optional(),
  expiryDate: z.string().datetime().optional().nullable(),
});

export const updateArticleSchema = createArticleSchema.partial();

export const rejectArticleSchema = z.object({
  reason: z.string().min(10, "Rejection reason must be at least 10 characters"),
});

export const requestArticleDeletionSchema = z.object({
  reason: z.string().min(10, "Deletion reason must be at least 10 characters"),
});

// ============================================================================
// LIVE BLOG
// ============================================================================

export const createLiveBlogUpdateSchema = z.object({
  content: tiptapContentSchema,
  label: z.string().max(40).optional(),
});

// ============================================================================
// REVIEWS
// ============================================================================

export const createReviewSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().max(75).optional(),
  content: tiptapContentSchema,
  excerpt: z.string().max(300).optional(),
  featuredImageUrl: z.string().url().optional(),
  featuredImageCredit: z.string().max(200).optional(),
  tagIds: z.array(z.string().min(1)).optional(),
  seoTitle: z.string().max(90).optional(),
  seoDescription: z.string().max(250).optional(),
  focusKeyword: z.string().max(100).optional(),
  featured: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  isSponsored: z.boolean().optional(),
  sponsorName: z.string().max(120).optional(),
  embargoUntil: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z
    .enum(["DRAFT", "IN_PROGRESS", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
    .optional(),
  // Review-specific
  gameTitle: z.string().min(1),
  developer: z.string().min(1),
  publisher: z.string().min(1),
  releaseDate: z.string().datetime(),
  platforms: z.array(z.string()).min(1),
  genres: z.array(z.string()).min(1),
  reviewScore: z.number().min(0).max(10).multipleOf(0.1),
  verdict: z.string().min(1),
  showReviewDetails: z.boolean().optional(),
  gameId: z.string().min(1),
  gameIds: z.array(z.string().min(1)).optional(),
  pendingDraftId: z.string().optional(),
});

export const updateReviewScoreSchema = z.object({
  reviewScore: z.number().min(0).max(10).multipleOf(0.1),
  reason: z.string().min(10),
});

// ============================================================================
// MOD GUIDES
// ============================================================================

export const createModGuideSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().max(75).optional(),
  content: tiptapContentSchema,
  excerpt: z.string().max(300).optional(),
  featuredImageUrl: z.string().url().optional(),
  featuredImageCredit: z.string().max(200).optional(),
  tagIds: z.array(z.string().min(1)).optional(),
  seoTitle: z.string().max(90).optional(),
  seoDescription: z.string().max(250).optional(),
  focusKeyword: z.string().max(100).optional(),
  featured: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  isSponsored: z.boolean().optional(),
  sponsorName: z.string().max(120).optional(),
  embargoUntil: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  // Guide-specific
  gameName: z.string().min(1),
  modName: z.string().min(1),
  gameVersionNotes: z.string().min(1),
  gameVersion: z.string().min(1).max(20),
  gameVersionDate: z.string().datetime().nullable().optional(),
  lastVerifiedAt: z.string().datetime().nullable().optional(),
  lastVerifiedVersion: z.string().optional(),
  compatibilityNotes: z.string().max(500).optional(),
  difficulty: z.enum(["EASY", "INTERMEDIATE", "ADVANCED"]),
  estimatedInstallMinutes: z.number().int().min(1),
  prerequisiteList: z.any(),
  // Each section sent by the editor has the shape { label, content } — the
  // client-only `id` field is stripped in PostForm before the request is sent.
  // `content` may be null for a newly-added tab that the author hasn't written
  // into yet; all other values must be a valid TipTap document.
  sections: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        content: tiptapContentSchema.nullable(),
      })
    )
    .optional(),
  bodyTitle: z.string().max(100).optional(),
  installationTitle: z.string().max(100).optional(),
  gameId: z.string().min(1).optional(),
  gameIds: z.array(z.string().min(1)).optional(),
  status: z
    .enum(["DRAFT", "IN_PROGRESS", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
    .optional(),
  pendingDraftId: z.string().optional(),
});

export const updateModGuideSchema = createModGuideSchema.partial();

export const verifyModGuideSchema = z.object({
  version: z.string().min(1).max(20),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// GAMES
// ============================================================================

export const createGameSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  backgroundImageUrl: z.string().url().optional().or(z.literal("")).nullable(),
  steamAppId: z.string().optional().or(z.literal("")),

  developer: z.string().optional(),
  publisher: z.string().optional(),
  releaseDate: z.string().datetime().optional(),
  platforms: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),

  metacritic: z.number().int().min(0).max(100).optional(),
  esrbRating: z.string().optional(),
  pegiRating: z.string().optional(),

  playtime: z.number().int().min(0).optional(),

  dlcOfId: z.string().optional().transform(v => v === "" ? null : v),
  gameEdition: z.enum(["STANDARD", "DELUXE", "GOTY_EDITION", "EXPANSION", "DLC"]).optional(),
  igdbId: z.number().int().positive().optional().nullable(),
  igdbSlug: z.string().optional().nullable(),
  storyline: z.string().optional().nullable(),
  releaseStatus: z.string().optional().nullable(),
  gameEngine: z.string().optional().nullable(),
  themes: z.string().optional().nullable(),
  keywords: z.string().optional().nullable(),
  collectionName: z.string().optional().nullable(),

  gameModes: z.array(z.string()).optional(),
  playerPerspectives: z.array(z.string()).optional(),
  screenshotUrls: z.array(z.string()).optional(),
  artworkUrls: z.array(z.string()).optional(),
  videosJson: z.unknown().optional().nullable(),
  websitesJson: z.unknown().optional().nullable(),
  dlcsJson: z.unknown().optional().nullable(),
  expansionsJson: z.unknown().optional().nullable(),
  similarGamesJson: z.unknown().optional().nullable(),
  multiplayerModesJson: z.unknown().optional().nullable(),
  languageSupportsJson: z.unknown().optional().nullable(),
  allCompaniesJson: z.unknown().optional().nullable(),
  releaseDatesByPlatformJson: z.unknown().optional().nullable(),
});

export const updateGameSchema = createGameSchema.partial();

// ============================================================================
// CATEGORIES
// ============================================================================

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ============================================================================
// TAGS
// ============================================================================

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(300).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
});

export const updateTagSchema = createTagSchema.partial();

// ============================================================================
// COMMENTS
// ============================================================================

export const createCommentSchema = z.object({
  articleId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  body: z.string().min(1).max(2000),
  authorName: z.string().min(1).max(100).optional(),
  authorEmail: z.string().email().optional(),
  gifUrl: z.string().url().max(1000).optional(),
  gifId: z.string().max(100).optional(),
  mentionedUserIds: z.array(z.string().min(1)).max(20).optional(),
  // Honeypot field — must be empty
  website: z.string().max(0, "Bot detected").optional(),
});

export const commentVoteSchema = z.object({
  value: z.number().refine((v) => v === 1 || v === -1, "Value must be 1 or -1"),
});

// ============================================================================
// REACTIONS
// ============================================================================

export const createReactionSchema = z.object({
  articleId: z.string().min(1),
  type: z.enum(["LIKE", "FIRE", "AGREE", "FUNNY", "SURPRISED"]),
});

export const COMMENT_REACTION_TYPES = ["🔥", "😂", "😲", "👍", "❤️"] as const;

export const commentReactionSchema = z.object({
  type: z.enum(COMMENT_REACTION_TYPES),
});

// ============================================================================
// NEWSLETTER
// ============================================================================

export const newsletterSubscribeSchema = z.object({
  email: z.string().email(),
  preferences: z.record(z.string(), z.boolean()).optional(),
});

export const sponsoredContentSchema = z.object({
  sponsor: z.string().min(1).max(100),
  headline: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  ctaText: z.string().min(1).max(50),
  ctaUrl: z.string().url(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const newsletterSendSchema = z.object({
  subject: z.string().min(1).max(200),
  htmlContent: z.string().min(1),
  segmentByPreference: z.string().optional(),
  genres: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  sponsoredContent: sponsoredContentSchema.optional(),
});

// ============================================================================
// PUSH
// ============================================================================

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
});

export const pushSendSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
  icon: z.string().url().optional(),
});

// ============================================================================
// ADMIN
// ============================================================================

export const updateUserRoleSchema = z.object({
  role: z.enum(["VISITOR", "USER", "AUTHOR", "EDITOR", "ADMIN"]),
});

export const issueStrikeSchema = z.object({
  reason: z.string().min(1).max(500),
  severity: z.number().int().min(1).max(3),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateAdPlacementSchema = z.object({
  isActive: z.boolean().optional(),
  adUnitId: z.string().optional(),
  name: z.string().optional(),
  format: z.string().optional(),
});

export const updateCommentStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SPAM", "HIDDEN"]),
  reason: z.string().optional(),
});

export const updateScreenshotStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED"]),
});

// ============================================================================
// SEARCH
// ============================================================================

export const searchSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
  contentType: z
    .enum(["NEWS", "REVIEW", "GUIDE", "OPINION", "DEAL", "LISTICLE"])
    .optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// ============================================================================
// USER RATINGS
// ============================================================================

export const createUserRatingSchema = z.object({
  score: z.number().int().min(1).max(10),
  body: z.string().max(1000).optional(),
});

// ============================================================================
// POLLS
// ============================================================================

export const createPollSchema = z.object({
  question: z.string().min(5).max(200),
  options: z.array(z.object({
    text: z.string().min(1).max(100),
    allowCustomInput: z.boolean().optional(),
  })).min(2).max(6),
  articleId: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  allowMultiple: z.boolean().optional(),
  homepageSlot: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
});

export const updatePollSchema = z.object({
  question: z.string().min(5).max(200).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  homepageSlot: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
});

export const castPollVoteSchema = z.object({
  optionIds: z.array(z.string().min(1)).min(1).max(6),
  sessionId: z.string().max(128).optional(),
  customText: z.string().max(500).optional(),
});

// ============================================================================
// USER PREFERENCES
// ============================================================================

export const updatePreferencesSchema = z.object({
  followedGenres: z.array(z.string().min(1).max(60)).max(20).optional(),
  followedPlatforms: z.array(z.string().min(1).max(60)).max(10).optional(),
});

// ============================================================================
// IGDB IMPORT
// ============================================================================

export const importIgdbSchema = z.object({
  igdbId: z.number().int().positive("igdbId must be a positive integer"),
  gameId: z.string().min(1, "gameId is required"),
});

// ============================================================================
// AWARDS
// ============================================================================

export const createAwardSchema = z.object({
  year: z.number().int().min(1980).max(2100),
  category: z.string().min(1).max(100),
  winnerGameId: z.string().optional().nullable(),
  nomineesJson: z.any().optional(),
  editorPickId: z.string().optional().nullable(),
  isVotingOpen: z.boolean().optional(),
});

export const updateAwardSchema = createAwardSchema.partial();

export const castAwardVoteSchema = z.object({
  gameId: z.string().min(1),
  sessionId: z.string().max(128).optional(),
});

// ============================================================================
// SEARCH (ALGOLIA REINDEX)
// ============================================================================

export const reindexSearchSchema = z.object({
  index: z.enum(["articles", "games", "tags", "users", "all"]),
});

export const sendAlgoliaEventSchema = z.object({
  eventType: z.enum(["click", "conversion", "view"]),
  eventName: z.string().min(1),
  index: z.string().min(1),
  objectIDs: z.array(z.string()),
  queryID: z.string().optional(),
  positions: z.array(z.number()).optional(),
  userToken: z.string().min(1),
});

// ============================================================================
// AI WRITING ASSISTANT
// ============================================================================

export const aiHeadlinesSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const aiExcerptSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const aiTagsSchema = z.object({
  content: z.string().min(1).max(2000),
  existingTagIds: z.array(z.string()).max(50).optional().default([]),
});

export const aiRewriteSchema = z.object({
  text: z.string().min(1).max(500),
});
