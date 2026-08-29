/**
 * reindex-articles.ts
 *
 * Manually re-syncs all PUBLISHED articles to Algolia — bypasses BullMQ/Redis
 * entirely so it works even when the Render worker is suspended.
 *
 * Connects only to: Postgres (Supabase) + Algolia API — both accessible locally.
 *
 * Modes:
 *   Full reindex (default) — syncs every published article:
 *     npx tsx reindex-articles.ts
 *
 *   Missing only — only syncs articles not yet in Algolia (faster, non-destructive):
 *     npx tsx reindex-articles.ts --missing-only
 *
 *   Specific slugs:
 *     npx tsx reindex-articles.ts --slugs=slug-one,slug-two,slug-three
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, ".env.worker") });
config({ path: resolve(__dirname, ".env") });

import { PrismaClient } from "./src/generated/prisma";
import { algoliasearch } from "algoliasearch";

const prisma = new PrismaClient();

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY!;
const ARTICLES_INDEX = "articles";
const BATCH_SIZE = 100;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error("❌ ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY not set");
  process.exit(1);
}

const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

// ── Helpers (mirrors algolia.worker.ts) ──────────────────────────────────────

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  if (Array.isArray(node)) {
    return (node as unknown[])
      .map((s: any) => [s?.title ?? "", s?.content ? extractText(s.content) : ""].filter(Boolean).join(" "))
      .join(" ");
  }
  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) return (n.content as unknown[]).map(extractText).join(" ");
  return "";
}

function readingTime(content: unknown): number {
  const words = extractText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function buildRecord(article: any) {
  const reviewGame = article.GameReview?.Game;
  const linkedGame = article.Game?.[0];
  const game = reviewGame ?? linkedGame ?? null;

  return {
    objectID: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ? article.excerpt.substring(0, 500) : null,
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
    tags: article.ArticleTag.map((at: any) => at.Tag.slug),
    guideType: article.guideType,
    isBreaking: article.isBreaking,
    isFeatured: article.featured,
    isSponsored: article.isSponsored,
  };
}

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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const missingOnly = args.includes("--missing-only");
  const slugsArg = args.find((a) => a.startsWith("--slugs="));
  const specificSlugs = slugsArg ? slugsArg.replace("--slugs=", "").split(",").map((s) => s.trim()) : null;

  console.log("=== Algolia Article Reindex ===");
  console.log(`Mode: ${specificSlugs ? `specific slugs (${specificSlugs.length})` : missingOnly ? "missing only" : "full reindex"}\n`);

  // ── Specific slugs mode ──────────────────────────────────────────────────
  if (specificSlugs) {
    const articles = await prisma.article.findMany({
      where: { slug: { in: specificSlugs }, status: "PUBLISHED", publishedAt: { not: null } },
      include: articleInclude,
    });

    console.log(`Found ${articles.length}/${specificSlugs.length} articles in DB`);

    const missing = specificSlugs.filter((s) => !articles.find((a) => a.slug === s));
    if (missing.length) console.log(`⚠️  Not found / not published: ${missing.join(", ")}`);

    if (articles.length > 0) {
      const records = articles.map(buildRecord);
      await algolia.saveObjects({ indexName: ARTICLES_INDEX, objects: records });
      console.log(`✅ Synced ${records.length} article(s) to Algolia`);
      for (const a of articles) console.log(`   • ${a.slug}`);
    }
    return;
  }

  // ── Missing only mode ────────────────────────────────────────────────────
  if (missingOnly) {
    // Get all objectIDs currently in Algolia
    console.log("Fetching existing Algolia objectIDs...");
    const existingIds = new Set<string>();
    await algolia.browseObjects({
      indexName: ARTICLES_INDEX,
      aggregator: (response: any) => {
        for (const hit of response.hits) existingIds.add(hit.objectID);
      },
    });
    console.log(`Algolia currently has ${existingIds.size} article(s)\n`);

    // Fetch all published articles from DB not in Algolia
    const allPublished = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      select: { id: true },
    });
    const missingIds = allPublished.map((a) => a.id).filter((id) => !existingIds.has(id));

    if (missingIds.length === 0) {
      console.log("✅ All published articles are already indexed in Algolia.");
      return;
    }

    console.log(`Found ${missingIds.length} unindexed article(s) — syncing...\n`);

    // Fetch and sync in batches
    let synced = 0;
    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
      const batchIds = missingIds.slice(i, i + BATCH_SIZE);
      const articles = await prisma.article.findMany({
        where: { id: { in: batchIds } },
        include: articleInclude,
      });
      const records = articles.map(buildRecord);
      await algolia.saveObjects({ indexName: ARTICLES_INDEX, objects: records });
      synced += records.length;
      console.log(`  Synced batch ${Math.floor(i / BATCH_SIZE) + 1}: ${records.length} article(s) (total: ${synced})`);
      for (const a of articles) console.log(`    • ${a.slug}`);
    }

    console.log(`\n✅ Done — indexed ${synced} missing article(s) to Algolia`);
    return;
  }

  // ── Full reindex mode ────────────────────────────────────────────────────
  console.log("Starting full reindex of all published articles...\n");

  let cursor: string | undefined;
  let total = 0;
  let batch = 0;

  while (true) {
    batch++;
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      include: articleInclude,
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });

    if (articles.length === 0) break;
    cursor = articles[articles.length - 1].id;

    const records = articles.map(buildRecord);
    await algolia.saveObjects({ indexName: ARTICLES_INDEX, objects: records });
    total += records.length;

    console.log(`  Batch ${batch}: synced ${records.length} article(s) (total: ${total})`);

    if (articles.length < BATCH_SIZE) break;
  }

  console.log(`\n✅ Full reindex complete — ${total} article(s) synced to Algolia`);
}

main()
  .catch((e) => {
    console.error("❌ Reindex failed:", e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
