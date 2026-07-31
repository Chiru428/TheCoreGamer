import { algoliasearch } from "algoliasearch";
import { logger } from "@/lib/logger";

export const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID || "mock_app_id",
  process.env.ALGOLIA_ADMIN_KEY || "mock_api_key"
);

export const algoliaInsightsClient = algoliaClient.initInsights({});
export const algoliaRecommendClient = algoliaClient.initRecommend();

// ── Index name constants ─────────────────────────────────────────────────
export const ARTICLES_INDEX = "articles";
export const GAMES_INDEX = "games";
export const TAGS_INDEX = "tags";
export const USERS_INDEX = "users";
export const VIDEOS_INDEX = "videos";

// ── Replica index constants ──────────────────────────────────────────────
export const ARTICLES_NEWEST = "articles_publishedAt_desc";
export const ARTICLES_POPULAR = "articles_viewCount_desc";
export const ARTICLES_TOP_RATED = "articles_reviewScore_desc";

export const GAMES_NEWEST = "games_releaseDate_desc";
export const GAMES_POPULAR = "games_totalRatingCount_desc";
export const GAMES_TOP_RATED = "games_totalRating_desc";
export const GAMES_ALPHABETICAL = "games_title_asc";

// ── Record shapes ─────────────────────────────────────────────────────────

export interface AlgoliaArticleRecord {
  objectID: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentType: string;
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
}

export interface AlgoliaGameRecord {
  /** prefix "game_" */
  objectID: string;
  title: string;
  slug: string;
  developer: string | null;
  publisher: string | null;
  coverImageUrl: string | null;
  releaseStatus: string | null;
  releaseDate: number | null;
  releaseYear: number | null;
  platforms: string[];
  genres: string[];
  gameModes: string[];
  playerPerspectives: string[];
  themes: string[];
  esrbRating: string | null;
  metacriticScore: number | null;
  editorialScore: number | null;
  totalRating: number | null;
  totalRatingCount: number | null;

  tags: string[];
  collectionName: string | null;
}

export interface AlgoliaTagRecord {
  /** prefix "tag_" */
  objectID: string;
  name: string;
  slug: string;
  description: string | null;
  articleCount: number;
  color: string | null;
}

export interface AlgoliaUserRecord {
  /** prefix "user_" */
  objectID: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  articleCount: number;
  isStaff: boolean;
}

export interface AlgoliaVideoRecord {
  /** prefix "video_" */
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
}

// ── Index configuration ──────────────────────────────────────────────────

/**
 * Configures all Algolia indexes and their replicas. Call this ONCE on first
 * deploy — re-running it is harmless but unnecessary since settings persist.
 */
export async function configureIndexes() {
  await algoliaClient.setSettings({
    indexName: ARTICLES_INDEX,
    indexSettings: {
      searchableAttributes: [
        "title",
        "gameName",
        "excerpt",
        "authorName",
        "tags",
        "genres",
        "platforms",
      ],
      attributesForFaceting: [
        "contentType",
        "platforms",
        "genres",
        "tags",
        "isBreaking",
        "isFeatured",
        "filterOnly(gameSlug)",
      ],
      customRanking: ["desc(viewCount)", "desc(publishedAt)"],
      typoTolerance: true,
      replicas: [ARTICLES_NEWEST, ARTICLES_POPULAR, ARTICLES_TOP_RATED],
    },
  });

  const replicaFaceting = {
    attributesForFaceting: ["contentType", "platforms", "genres", "tags", "isBreaking", "isFeatured"],
  };
  await algoliaClient.setSettings({
    indexName: ARTICLES_NEWEST,
    indexSettings: { customRanking: ["desc(publishedAt)"], ...replicaFaceting },
  });
  await algoliaClient.setSettings({
    indexName: ARTICLES_POPULAR,
    indexSettings: { customRanking: ["desc(viewCount)"], ...replicaFaceting },
  });
  await algoliaClient.setSettings({
    indexName: ARTICLES_TOP_RATED,
    indexSettings: { customRanking: ["desc(reviewScore)", "desc(viewCount)"], ...replicaFaceting },
  });

  await algoliaClient.setSettings({
    indexName: GAMES_INDEX,
    indexSettings: {
      searchableAttributes: ["title", "developer", "publisher", "collectionName", "genres", "platforms"],
      attributesForFaceting: ["releaseStatus", "platforms", "genres", "esrbRating", "gameModes", "playerPerspectives", "themes", "releaseYear", "tags", "developer", "collectionName"],
      customRanking: ["desc(editorialScore)", "desc(metacriticScore)"],
      replicas: [GAMES_NEWEST, GAMES_TOP_RATED, GAMES_POPULAR, GAMES_ALPHABETICAL],
    },
    forwardToReplicas: true,
  });

  await algoliaClient.setSettings({
    indexName: GAMES_NEWEST,
    indexSettings: { customRanking: ["desc(releaseDate)"] },
  });
  await algoliaClient.setSettings({
    indexName: GAMES_POPULAR,
    indexSettings: { customRanking: ["desc(totalRating)"] },
  });
  await algoliaClient.setSettings({
    indexName: GAMES_TOP_RATED,
    indexSettings: { customRanking: ["desc(totalRating)"] },
  });
  await algoliaClient.setSettings({
    indexName: GAMES_ALPHABETICAL,
    indexSettings: { customRanking: ["asc(title)"] },
  });

  await algoliaClient.setSettings({
    indexName: TAGS_INDEX,
    indexSettings: {
      searchableAttributes: ["name", "description"],
      attributesForFaceting: [],
      customRanking: ["desc(articleCount)"],
    },
  });

  await algoliaClient.setSettings({
    indexName: USERS_INDEX,
    indexSettings: {
      searchableAttributes: ["username", "displayName", "bio"],
      attributesForFaceting: ["isStaff"],
    },
  });

  await algoliaClient.setSettings({
    indexName: VIDEOS_INDEX,
    indexSettings: {
      searchableAttributes: ["title", "description", "gameName", "tags"],
      attributesForFaceting: ["type"],
    },
  });

  logger.info("[Algolia] Index configuration complete");
}

// ── Helper functions ──────────────────────────────────────────────────────

export async function upsertRecord<T extends { objectID: string }>(
  indexName: string,
  record: T
): Promise<void> {
  try {
    await algoliaClient.saveObject({ indexName, body: record });
  } catch (err) {
    logger.error({ err, indexName, objectID: record.objectID }, "[Algolia] upsertRecord failed");
  }
}

export async function upsertRecords<T extends { objectID: string }>(
  indexName: string,
  records: T[]
): Promise<void> {
  if (records.length === 0) return;
  try {
    await algoliaClient.saveObjects({ indexName, objects: records });
  } catch (err) {
    logger.error({ err, indexName, count: records.length }, "[Algolia] upsertRecords failed");
  }
}

export async function deleteRecord(indexName: string, objectID: string): Promise<void> {
  try {
    await algoliaClient.deleteObject({ indexName, objectID });
  } catch (err) {
    logger.error({ err, indexName, objectID }, "[Algolia] deleteRecord failed");
  }
}

export async function clearIndex(indexName: string): Promise<void> {
  try {
    await algoliaClient.clearObjects({ indexName });
  } catch (err) {
    logger.error({ err, indexName }, "[Algolia] clearIndex failed");
  }
}
