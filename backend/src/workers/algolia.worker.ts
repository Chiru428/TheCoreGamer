import { Worker, type Job, connection, isConnectionError, algoliaQueue } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { captureError } from "@/lib/sentry";
import {
  ARTICLES_INDEX,
  GAMES_INDEX,
  TAGS_INDEX,
  USERS_INDEX,
  VIDEOS_INDEX,
  upsertRecord,
  upsertRecords,
  deleteRecord,
  clearIndex,
  type AlgoliaArticleRecord,
  type AlgoliaGameRecord,
  type AlgoliaTagRecord,
  type AlgoliaUserRecord,
  type AlgoliaVideoRecord,
} from "@/lib/algolia";

const BATCH_SIZE = 100;
const STAFF_ROLES = ["AUTHOR", "EDITOR", "ADMIN"] as const;

interface AlgoliaJobData {
  articleId?: string;
  gameId?: string;
  tagId?: string;
  userId?: string;
  videoId?: string;
}

// ── Reading time helpers (TipTap JSON → word count) ─────────────────────────

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";

  if (Array.isArray(node)) {
    return (node as unknown[])
      .map((section) => {
        if (!section || typeof section !== "object") return "";
        const s = section as Record<string, unknown>;
        const titleText = typeof s.title === "string" ? s.title : "";
        const bodyText = s.content ? extractText(s.content) : "";
        return [titleText, bodyText].filter(Boolean).join(" ");
      })
      .join(" ");
  }

  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) {
    return (n.content as unknown[]).map(extractText).join(" ");
  }
  return "";
}

function readingTime(content: unknown): number {
  const words = extractText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ── Dispatcher functions ─────────────────────────────────────────────────

const defaultJobOpts = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: 100,
};

async function enqueueWithRetry(name: string, data: any, opts = defaultJobOpts, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await algoliaQueue.add(name, data, opts);
    } catch (err: any) {
      if (i === retries - 1) throw err;
      logger.warn({ err: err.message, attempt: i + 1 }, `[AlgoliaWorker] Enqueue failed, retrying...`);
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}

export async function syncArticleToAlgolia(articleId: string) {
  if (process.env.NODE_ENV !== "production") {
    try { await syncArticle(articleId); } catch (e) {}
  }
  return enqueueWithRetry("sync-article", { articleId });
}

export async function deleteArticleFromAlgolia(articleId: string) {
  if (process.env.NODE_ENV !== "production") {
    try { await deleteRecord(ARTICLES_INDEX, articleId); } catch (e) {}
  }
  return enqueueWithRetry("delete-article", { articleId });
}

export async function syncGameToAlgolia(gameId: string) {
  if (process.env.NODE_ENV !== "production") {
    try { await syncGame(gameId); } catch (e) {}
  }
  return enqueueWithRetry("sync-game", { gameId });
}

export async function deleteGameFromAlgolia(gameId: string) {
  if (process.env.NODE_ENV !== "production") {
    try { await deleteRecord(GAMES_INDEX, `game_${gameId}`); } catch (e) {}
  }
  return enqueueWithRetry("delete-game", { gameId });
}

export async function syncTagToAlgolia(tagId: string) {
  if (process.env.NODE_ENV !== "production") {
    try { await syncTag(tagId); } catch (e) {}
  }
  return enqueueWithRetry("sync-tag", { tagId });
}

export async function syncUserToAlgolia(userId: string) {
  if (process.env.NODE_ENV !== "production") {
    try { await syncUser(userId); } catch (e) {}
  }
  return enqueueWithRetry("sync-user", { userId });
}

export async function syncVideoToAlgolia(videoId: string) {
  if (process.env.NODE_ENV !== "production") {
    try { await syncVideo(videoId); } catch (e) {}
  }
  return enqueueWithRetry("sync-video", { videoId });
}

// ── Record builders ──────────────────────────────────────────────────────

const articleInclude = {
  User_Article_authorIdToUser: {
    select: { displayName: true, username: true, avatarUrl: true },
  },
  ArticleTag: { select: { Tag: { select: { slug: true } } } },
  GameReview: {
    select: {
      reviewScore: true,
      Game: { select: { title: true, slug: true, platforms: true, genres: true, releaseDate: true } },
    },
  },
  Game: { select: { title: true, slug: true, platforms: true, genres: true, releaseDate: true }, take: 1 },
  _count: { select: { Comment: { where: { status: "APPROVED" as const } } } },
} as const;

type ArticleForAlgolia = NonNullable<
  Awaited<ReturnType<typeof prisma.article.findFirst<{ include: typeof articleInclude }>>>
>;

function buildArticleRecord(article: ArticleForAlgolia): AlgoliaArticleRecord {
  const reviewGame = article.GameReview?.Game;
  const linkedGame = article.Game?.[0];
  const game = reviewGame ?? linkedGame ?? null;

  return {
    objectID: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    contentType: article.contentType,
    authorName: article.User_Article_authorIdToUser.displayName,
    authorUsername: article.User_Article_authorIdToUser.username,
    authorAvatarUrl: article.User_Article_authorIdToUser.avatarUrl,
    featuredImageUrl: article.featuredImageUrl,
    publishedAt: Math.floor((article.publishedAt as Date).getTime() / 1000),
    publishedAtISO: (article.publishedAt as Date).toISOString(),
    viewCount: Number(article.viewCount),
    commentCount: article._count.Comment,
    readingTimeMinutes: readingTime(article.content),
    reviewScore: article.GameReview ? Number(article.GameReview.reviewScore) : null,
    gameName: game?.title ?? null,
    gameSlug: game?.slug ?? null,
    platforms: game?.platforms ?? [],
    genres: game?.genres ?? [],
    releaseYear: game?.releaseDate ? new Date(game.releaseDate).getFullYear() : null,
    tags: article.ArticleTag.map((at) => at.Tag.slug),
    guideType: article.guideType,
    isBreaking: article.isBreaking,
    isFeatured: article.featured,
    isSponsored: article.isSponsored,
  };
}

export async function syncArticle(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: articleInclude,
  });

  if (!article || article.status !== "PUBLISHED" || !article.publishedAt) {
    await deleteRecord(ARTICLES_INDEX, articleId);
    return;
  }

  await upsertRecord(ARTICLES_INDEX, buildArticleRecord(article));
  logger.info(`[AlgoliaWorker] Synced article ${article.slug}`);
}

const gameInclude = {
  GameReview: {
    take: 1,
    orderBy: { Article: { publishedAt: "desc" as const } },
    select: { reviewScore: true },
  },
} as const;

type GameForAlgolia = NonNullable<
  Awaited<ReturnType<typeof prisma.game.findFirst<{ include: typeof gameInclude }>>>
>;

function buildGameRecord(game: GameForAlgolia): AlgoliaGameRecord {
  const computedReleaseStatus = (() => {
    if (!game.releaseDate) return 'Coming Soon';
    if (game.releaseDate.getTime() > Date.now()) return 'Coming Soon';
    if (game.releaseDate.getTime() <= Date.now() && game.releaseStatus === 'Coming Soon') return 'Released';
    return game.releaseStatus;
  })();

  return {
    objectID: `game_${game.id}`,
    title: game.title,
    slug: game.slug,
    developer: game.developer,
    publisher: game.publisher,
    coverImageUrl: game.coverImageUrl,
    releaseStatus: computedReleaseStatus,
    releaseDate: game.releaseDate ? Math.floor(game.releaseDate.getTime() / 1000) : null,
    releaseYear: game.releaseDate ? game.releaseDate.getFullYear() : null,
    platforms: game.platforms,
    genres: game.genres,
    gameModes: game.gameModes,
    playerPerspectives: game.playerPerspectives,
    themes: game.themes ? game.themes.split(/,\s*(?![^()]*\))/).map(s => s.trim()).filter(Boolean) : [],
    esrbRating: game.esrbRating,
    metacriticScore: game.metacritic,
    editorialScore: game.GameReview[0] ? Number(game.GameReview[0].reviewScore) : null,
    tags: game.tags,
    totalRating: game.totalRating,
    totalRatingCount: game.totalRatingCount,

    collectionName: game.collectionName ?? null,
  };
}

export async function syncGame(gameId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: gameInclude });
  if (!game) return;
  await upsertRecord(GAMES_INDEX, buildGameRecord(game));
  logger.info(`[AlgoliaWorker] Synced game ${game.slug}`);
}

/**
 * Builds an AlgoliaGameRecord for a single game ID by fetching from the DB.
 * Exported so the IGDB worker can call it without importing Prisma directly.
 */
export async function buildGameRecordById(gameId: string): Promise<AlgoliaGameRecord | null> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: gameInclude });
  if (!game) return null;
  return buildGameRecord(game);
}

/**
 * Syncs multiple games to Algolia in a single batched saveObjects call.
 * Use this instead of calling syncGameToAlgolia() in a loop — reduces
 * N individual HTTP calls to ceil(N/100) calls (Algolia batch limit).
 */
export async function bulkSyncGamesToAlgolia(gameIds: string[]): Promise<void> {
  if (gameIds.length === 0) return;
  const games = await prisma.game.findMany({
    where: { id: { in: gameIds } },
    include: gameInclude,
  });
  if (games.length === 0) return;
  const records = games.map(buildGameRecord);
  await upsertRecords(GAMES_INDEX, records);
  logger.info(`[AlgoliaWorker] Bulk synced ${records.length} game(s) to Algolia`);
}

const tagInclude = { _count: { select: { ArticleTag: true } } } as const;
type TagForAlgolia = NonNullable<
  Awaited<ReturnType<typeof prisma.tag.findFirst<{ include: typeof tagInclude }>>>
>;

function buildTagRecord(tag: TagForAlgolia): AlgoliaTagRecord {
  return {
    objectID: `tag_${tag.slug}`,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    articleCount: tag._count.ArticleTag,
    color: tag.color,
  };
}

async function syncTag(tagId: string) {
  const tag = await prisma.tag.findUnique({ where: { id: tagId }, include: tagInclude });
  if (!tag) return;
  await upsertRecord(TAGS_INDEX, buildTagRecord(tag));
}

const userInclude = {
  _count: {
    select: { Article_Article_authorIdToUser: { where: { status: "PUBLISHED" as const } } },
  },
} as const;
type UserForAlgolia = NonNullable<
  Awaited<ReturnType<typeof prisma.user.findFirst<{ include: typeof userInclude }>>>
>;

function buildUserRecord(user: UserForAlgolia): AlgoliaUserRecord {
  return {
    objectID: `user_${user.username}`,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
    articleCount: user._count.Article_Article_authorIdToUser,
    isStaff: true,
  };
}

async function syncUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user || !STAFF_ROLES.includes(user.role as (typeof STAFF_ROLES)[number])) return;
  await upsertRecord(USERS_INDEX, buildUserRecord(user));
}

const videoInclude = {
  Article: {
    select: {
      contentType: true,
      publishedAt: true,
      status: true,
      viewCount: true,
      ArticleTag: { select: { Tag: { select: { slug: true } } } },
      GameReview: { select: { Game: { select: { title: true, slug: true } } } },
      Game: { select: { title: true, slug: true }, take: 1 },
    },
  },
} as const;
type VideoForAlgolia = NonNullable<
  Awaited<ReturnType<typeof prisma.videoAsset.findFirst<{ include: typeof videoInclude }>>>
>;

// VideoAsset has no `isPublic`/`type`/`tags`/`gameName` columns — derive them from
// the Mux processing status and the linked Article (if any).
function buildVideoRecord(video: VideoForAlgolia): AlgoliaVideoRecord {
  const article = video.Article;
  const game = article?.GameReview?.Game ?? article?.Game?.[0] ?? null;
  const publishedAt = article?.publishedAt ?? video.createdAt;

  return {
    objectID: `video_${video.id}`,
    title: video.title,
    description: null,
    thumbnailUrl: `https://image.mux.com/${video.muxPlaybackId}/thumbnail.png`,
    type: article?.contentType ?? "STANDALONE",
    duration: video.duration,
    gameName: game?.title ?? null,
    gameSlug: game?.slug ?? null,
    tags: article?.ArticleTag.map((at) => at.Tag.slug) ?? [],
    publishedAt: Math.floor(publishedAt.getTime() / 1000),
    viewCount: article ? Number(article.viewCount) : 0,
  };
}

async function syncVideo(videoId: string) {
  const video = await prisma.videoAsset.findUnique({ where: { id: videoId }, include: videoInclude });
  if (!video || video.status !== "ready") {
    await deleteRecord(VIDEOS_INDEX, `video_${videoId}`);
    return;
  }
  await upsertRecord(VIDEOS_INDEX, buildVideoRecord(video));
}

// ── Full reindex jobs ─────────────────────────────────────────────────────

async function fullReindexArticles() {
  await clearIndex(ARTICLES_INDEX);

  let cursor: string | undefined;
  let total = 0;
  while (true) {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      include: articleInclude,
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (articles.length === 0) break;
    cursor = articles[articles.length - 1].id;

    await upsertRecords(ARTICLES_INDEX, articles.map(buildArticleRecord));
    total += articles.length;

    if (articles.length < BATCH_SIZE) break;
  }

  logger.info(`[AlgoliaWorker] Full reindex complete: ${total} articles`);
}

export async function fullReindexGames() {
  await clearIndex(GAMES_INDEX);

  let cursor: string | undefined;
  let total = 0;
  while (true) {
    const games = await prisma.game.findMany({
      include: gameInclude,
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (games.length === 0) break;
    cursor = games[games.length - 1].id;

    await upsertRecords(GAMES_INDEX, games.map(buildGameRecord));
    total += games.length;

    if (games.length < BATCH_SIZE) break;
  }

  logger.info(`[AlgoliaWorker] Full reindex complete: ${total} games`);
}

async function fullReindexTags() {
  await clearIndex(TAGS_INDEX);

  let cursor: string | undefined;
  let total = 0;
  while (true) {
    const tags = await prisma.tag.findMany({
      include: tagInclude,
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (tags.length === 0) break;
    cursor = tags[tags.length - 1].id;

    await upsertRecords(TAGS_INDEX, tags.map(buildTagRecord));
    total += tags.length;

    if (tags.length < BATCH_SIZE) break;
  }

  logger.info(`[AlgoliaWorker] Full reindex complete: ${total} tags`);
}

async function fullReindexUsers() {
  await clearIndex(USERS_INDEX);

  let cursor: string | undefined;
  let total = 0;
  while (true) {
    const users = await prisma.user.findMany({
      where: { role: { in: [...STAFF_ROLES] } },
      include: userInclude,
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (users.length === 0) break;
    cursor = users[users.length - 1].id;

    await upsertRecords(USERS_INDEX, users.map(buildUserRecord));
    total += users.length;

    if (users.length < BATCH_SIZE) break;
  }

  logger.info(`[AlgoliaWorker] Full reindex complete: ${total} users`);
}

// ── Worker ────────────────────────────────────────────────────────────────

export const algoliaWorker = new Worker<AlgoliaJobData>(
  "algolia",
  async (job: Job<AlgoliaJobData>) => {
    switch (job.name) {
      case "sync-article":
        return syncArticle(job.data.articleId!);
      case "delete-article":
        return deleteRecord(ARTICLES_INDEX, job.data.articleId!);
      case "sync-game":
        return syncGame(job.data.gameId!);
      case "delete-game":
        return deleteRecord(GAMES_INDEX, `game_${job.data.gameId!}`);
      case "sync-tag":
        return syncTag(job.data.tagId!);
      case "sync-user":
        return syncUser(job.data.userId!);
      case "sync-video":
        return syncVideo(job.data.videoId!);
      case "full-reindex-articles":
        return fullReindexArticles();
      case "full-reindex-games":
        return fullReindexGames();
      case "full-reindex-tags":
        return fullReindexTags();
      case "full-reindex-users":
        return fullReindexUsers();
      default:
        logger.warn(`[AlgoliaWorker] Unknown job type: ${job.name}`);
    }
  },
  { connection, concurrency: 3 }
);

algoliaWorker.on("completed", (job) => {
  logger.info(`[AlgoliaWorker] Job ${job.name} completed successfully`);
});

algoliaWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err }, "[AlgoliaWorker] Job failed");
  captureError(err instanceof Error ? err : new Error(String(err)));
});

algoliaWorker.on("error", (err) => {
  if (isConnectionError(err)) return;
  logger.error({ err }, "[AlgoliaWorker] Worker connection error");
  captureError(err);
});

export function startAlgoliaWorker() {
  return algoliaWorker;
}
