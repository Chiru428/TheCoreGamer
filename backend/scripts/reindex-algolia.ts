// One-off full reindex of all Algolia indices from Postgres.
// Run with: npx tsx --env-file=.env scripts/reindex-algolia.ts
//
// Mirrors the record builders and full-reindex logic in src/workers/algolia.worker.ts,
// but runs standalone (no BullMQ/Redis worker) so it can be triggered manually.

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  ARTICLES_INDEX,
  GAMES_INDEX,
  TAGS_INDEX,
  USERS_INDEX,
  VIDEOS_INDEX,
  configureIndexes,
  upsertRecords,
  clearIndex,
  type AlgoliaArticleRecord,
  type AlgoliaGameRecord,
  type AlgoliaTagRecord,
  type AlgoliaUserRecord,
  type AlgoliaVideoRecord,
} from "@/lib/algolia";

const BATCH_SIZE = 100;
const STAFF_ROLES = ["AUTHOR", "EDITOR", "ADMIN"] as const;

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

// ── Record builders ──────────────────────────────────────────────────────

const articleInclude = {
  User_Article_authorIdToUser: {
    select: { displayName: true, username: true, avatarUrl: true },
  },
  ArticleTag: { select: { Tag: { select: { slug: true } } } },
  GameReview: {
    select: {
      reviewScore: true,
      Game: { select: { title: true, slug: true, platforms: true, genres: true } },
    },
  },
  Game: { select: { title: true, slug: true, platforms: true, genres: true }, take: 1 },
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
    tags: article.ArticleTag.map((at) => at.Tag.slug),
    isBreaking: article.isBreaking,
    isFeatured: article.featured,
    isSponsored: article.isSponsored,
  };
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
    collectionName: game.collectionName ?? null,
  };
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

  logger.info(`[ReindexAlgolia] Full reindex complete: ${total} articles`);
}

async function fullReindexGames() {
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

  logger.info(`[ReindexAlgolia] Full reindex complete: ${total} games`);
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

  logger.info(`[ReindexAlgolia] Full reindex complete: ${total} tags`);
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

  logger.info(`[ReindexAlgolia] Full reindex complete: ${total} users`);
}

async function fullReindexVideos() {
  await clearIndex(VIDEOS_INDEX);

  let cursor: string | undefined;
  let total = 0;
  while (true) {
    const videos = await prisma.videoAsset.findMany({
      where: { status: "ready" },
      include: videoInclude,
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (videos.length === 0) break;
    cursor = videos[videos.length - 1].id;

    await upsertRecords(VIDEOS_INDEX, videos.map(buildVideoRecord));
    total += videos.length;

    if (videos.length < BATCH_SIZE) break;
  }

  logger.info(`[ReindexAlgolia] Full reindex complete: ${total} videos`);
}

async function main() {
  await configureIndexes();
  await fullReindexArticles();
  await fullReindexGames();
  await fullReindexTags();
  await fullReindexUsers();
  await fullReindexVideos();
}

main()
  .catch((err) => {
    logger.error({ err }, "[ReindexAlgolia] Failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
