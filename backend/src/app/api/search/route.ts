import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import {
  buildPaginationMeta,
  successResponse,
  errorResponse,
  serializeArticle,
} from "@/types";
import type { Prisma, ContentType } from "@/generated/prisma";
import {
  algoliaClient,
  ARTICLES_INDEX,
  ARTICLES_NEWEST,
  ARTICLES_POPULAR,
  ARTICLES_TOP_RATED,
  GAMES_INDEX,
  TAGS_INDEX,
  USERS_INDEX,
  VIDEOS_INDEX,
} from "@/lib/algolia";

async function logSearchEvent(queryStr: string, resultCount: number, userId: string | null, sessionId: string | null) {
  try {
    if (!queryStr || queryStr.length < 1) return;
    const cleanQuery = queryStr.substring(0, 200);

    // Backward compat tracking for 0 results
    if (resultCount === 0 && cleanQuery.length >= 3) {
      prisma.searchMiss.create({ data: { query: cleanQuery, userId } }).catch(() => {});
    }

    // Debounce partial keystrokes
    if (sessionId || userId) {
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const recentQuery = await prisma.searchQuery.findFirst({
        where: {
          OR: [
            ...(userId ? [{ userId }] : []),
            ...(sessionId ? [{ sessionId }] : []),
          ],
          createdAt: { gte: fiveSecondsAgo },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentQuery) {
        const qLower = cleanQuery.toLowerCase();
        const rqLower = recentQuery.query.toLowerCase();
        // If typing forward or backspacing, just update the previous query
        if (qLower.startsWith(rqLower) || rqLower.startsWith(qLower)) {
          await prisma.searchQuery.update({
            where: { id: recentQuery.id },
            data: { query: cleanQuery, resultCount, createdAt: new Date() },
          });
          return;
        }
      }
    }

    // Otherwise insert new row
    await prisma.searchQuery.create({
      data: { query: cleanQuery, resultCount, userId, sessionId },
    });
  } catch (err) {
    // Fire and forget
  }
}

// The tsvector full-text search path below requires the GIN index defined in
// prisma/migrations/20260606200000_add_search_gin_index/migration.sql to be applied.
// CONCURRENTLY cannot run inside a transaction — apply this migration manually via
// psql or the Supabase SQL editor BEFORE running prisma migrate deploy in production.
// Without the index, tsvector queries fall back to a sequential scan (extremely slow).
// This Postgres path is now used ONLY as a fallback if the Algolia request fails.

const SORT_INDEX_MAP: Record<string, string> = {
  relevance: ARTICLES_INDEX,
  newest: ARTICLES_NEWEST,
  popular: ARTICLES_POPULAR,
  top_rated: ARTICLES_TOP_RATED,
};

export async function GET(request: NextRequest) {
  try {
    // 120 searches per hour per IP — allows reasonable usage while preventing scraping
    const rateLimitResponse = await rateLimit(request, "SEARCH");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");
    if (!q || q.length < 1)
      return NextResponse.json(errorResponse("Search query is required"), { status: 400 });

    const contentType = searchParams.get("contentType");
    const platform = searchParams.get("platform");
    const genre = searchParams.get("genre");
    const sort = searchParams.get("sort") || "relevance";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(0, parseInt(searchParams.get("page") || "0"));
    const hitsPerPage = Math.min(100, Math.max(1, parseInt(searchParams.get("hitsPerPage") || "20")));
    const userToken = searchParams.get("userToken") || undefined;

    try {
      // --- Primary: Algolia ---
      const facetFilters: (string | string[])[] = [];
      if (contentType) facetFilters.push(contentType.split(",").map((v) => `contentType:${v}`));
      if (platform) facetFilters.push(platform.split(",").map((v) => `platforms:${v}`));
      if (genre) facetFilters.push(genre.split(",").map((v) => `genres:${v}`));

      const numericFilters: string[] = [];
      if (dateFrom) numericFilters.push(`publishedAt >= ${Math.floor(new Date(dateFrom).getTime() / 1000)}`);
      if (dateTo) numericFilters.push(`publishedAt <= ${Math.floor(new Date(dateTo).getTime() / 1000)}`);

      const sortedIndex = SORT_INDEX_MAP[sort] || ARTICLES_INDEX;

      const { results } = await algoliaClient.search({
        requests: [
          {
            indexName: sortedIndex,
            query: q,
            hitsPerPage,
            page,
            facetFilters,
            numericFilters,
            facets: ["contentType", "platforms", "genres", "tags"],
            attributesToHighlight: ["title", "excerpt"],
            highlightPreTag: "<mark>",
            highlightPostTag: "</mark>",
            attributesToSnippet: ["excerpt:20"],
            enablePersonalization: !!userToken,
            userToken,
            enableReRanking: true,
          },
          {
            indexName: GAMES_INDEX,
            query: q,
            hitsPerPage: 5,
            page: 0,
            attributesToHighlight: ["title"],
          },
          {
            indexName: TAGS_INDEX,
            query: q,
            hitsPerPage: 5,
            page: 0,
          },
          {
            indexName: USERS_INDEX,
            query: q,
            hitsPerPage: 3,
            page: 0,
            filters: "isStaff:true",
          },
          {
            indexName: VIDEOS_INDEX,
            query: q,
            hitsPerPage: 3,
            page: 0,
          },
        ],
      });

      const [articleResults, gameResults, tagResults, userResults, videoResults] = results as Array<
        { nbHits?: number } & Record<string, unknown>
      >;

      let authUserId: string | null = null;
      try {
        const { auth } = await import("@/lib/auth");
        const session = await auth();
        authUserId = session?.user?.id ?? null;
      } catch {}

      const totalHits =
        (articleResults.nbHits ?? 0) +
        (gameResults.nbHits ?? 0) +
        (tagResults.nbHits ?? 0) +
        (userResults.nbHits ?? 0) +
        (videoResults.nbHits ?? 0);

      logSearchEvent(q, totalHits, authUserId, userToken ?? null).catch(() => {});

      return NextResponse.json(
        successResponse({
          articles: articleResults,
          games: gameResults,
          tags: tagResults,
          users: userResults,
          videos: videoResults,
        })
      );
    } catch (algoliaErr) {
      captureError(algoliaErr, { context: "algolia search, falling back to Postgres" });

      // --- Fallback: Postgres tsvector / ILIKE / trigram search (articles only) ---
      // page/hitsPerPage were already parsed as 0-indexed (Algolia convention) above;
      // convert to the 1-indexed PaginationMeta shape expected by buildPaginationMeta.
      const pgPage = page + 1;
      const limit = hitsPerPage;
      const skip = page * hitsPerPage;

      try {
        type SearchRow = {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          contentType: string;
          featuredImageUrl: string | null;
          publishedAt: Date | null;
          authorDisplayName: string;
          authorAvatarUrl: string | null;
          total: bigint;
          content: unknown;
        };

        const filters: string[] = [`a.status = 'PUBLISHED'`];
        const params: unknown[] = [q];
        let paramIdx = 2;

        if (contentType) {
          filters.push(`a."contentType" = $${paramIdx++}`);
          params.push(contentType);
        }
        if (dateFrom) {
          filters.push(`a."publishedAt" >= $${paramIdx++}`);
          params.push(new Date(dateFrom));
        }
        if (dateTo) {
          filters.push(`a."publishedAt" <= $${paramIdx++}`);
          params.push(new Date(dateTo));
        }

        const whereClause = filters.join(" AND ");

        // --- Primary: full-text search via tsvector ---
        let rows = await withRetry(() =>
          prisma.$queryRawUnsafe<SearchRow[]>(
            `
          SELECT
            a.id, a.title, a.slug, a.excerpt, a."contentType",
            a."featuredImageUrl", a."publishedAt", a.content,
            u."displayName" AS "authorDisplayName", u."avatarUrl" AS "authorAvatarUrl",
            COUNT(*) OVER() AS total
          FROM "Article" a
          LEFT JOIN "User" u ON u.id = a."authorId"
          WHERE ${whereClause}
            AND a."searchVector" @@ plainto_tsquery('english', $1)
          ORDER BY ts_rank(a."searchVector", plainto_tsquery('english', $1)) DESC, a."publishedAt" DESC NULLS LAST
          LIMIT ${limit} OFFSET ${skip}
        `,
            ...params
          )
        );

        // --- Fallback: ILIKE when tsvector returns nothing (e.g. abbreviations like "ets2" → "ETS 2") ---
        if (rows.length === 0) {
          const ilikeParam = `%${q}%`;
          // Space-tolerant: "ets2" → "%ets%2%" so it matches "ETS 2"
          const spaceTolerantParam = `%${q.replace(/([a-zA-Z])(\d)/g, "$1%$2").replace(/(\d)([a-zA-Z])/g, "$1%$2")}%`;
          const ilikeParams: unknown[] = [...params, ilikeParam, spaceTolerantParam];
          const pIlike = paramIdx; // $N  → exact-substring ILIKE
          const pTolerant = paramIdx + 1; // $N+1 → space-tolerant ILIKE

          rows = await withRetry(() =>
            prisma.$queryRawUnsafe<SearchRow[]>(
              `
            SELECT DISTINCT ON (a.id)
              a.id, a.title, a.slug, a.excerpt, a."contentType",
              a."featuredImageUrl", a."publishedAt", a.content,
              u."displayName" AS "authorDisplayName", u."avatarUrl" AS "authorAvatarUrl",
              COUNT(*) OVER() AS total
            FROM "Article" a
            LEFT JOIN "User" u ON u.id = a."authorId"
            LEFT JOIN "ModGuide" mg ON mg."articleId" = a.id
            WHERE ${filters.join(" AND ")}
              AND (
                a.title        ILIKE $${pIlike}
                OR a.excerpt   ILIKE $${pIlike}
                OR a.title     ILIKE $${pTolerant}
                OR a.excerpt   ILIKE $${pTolerant}
                OR mg."gameName" ILIKE $${pIlike}
                OR mg."gameName" ILIKE $${pTolerant}
                OR mg."modName"  ILIKE $${pIlike}
                OR EXISTS (
                  SELECT 1 FROM "ArticleTag" at_rel
                  JOIN "Tag" tg ON tg.id = at_rel."tagId"
                  WHERE at_rel."articleId" = a.id
                    AND tg.name ILIKE $${pIlike}
                )
              )
            ORDER BY a.id, a."publishedAt" DESC NULLS LAST
            LIMIT ${limit} OFFSET ${skip}
          `,
              ...ilikeParams
            )
          );
        }

        // --- Tier 3: pg_trgm similarity when ILIKE also returns nothing ---
        if (rows.length === 0 && q.length >= 3) {
          try {
            type TrigramRow = SearchRow & { sim: number };
            const trigramRows = await prisma.$queryRawUnsafe<TrigramRow[]>(
              `
            SELECT a.id, a.title, a.slug, a.excerpt, a."contentType",
                   a."featuredImageUrl", a."publishedAt", a.content,
                   u."displayName" AS "authorDisplayName", u."avatarUrl" AS "authorAvatarUrl",
                   similarity(a.title, $1) AS sim,
                   COUNT(*) OVER() AS total
            FROM "Article" a
            LEFT JOIN "User" u ON u.id = a."authorId"
            WHERE ${whereClause}
              AND similarity(a.title, $1) > 0.15
            ORDER BY sim DESC
            LIMIT ${limit} OFFSET ${skip}
          `,
              ...params
            );
            rows = trigramRows;
          } catch {
            // pg_trgm not installed — silently skip
          }
        }

        let authUserId: string | null = null;
        try {
          const { auth } = await import("@/lib/auth");
          const session = await auth();
          authUserId = session?.user?.id ?? null;
        } catch {}
        
        logSearchEvent(q, rows.length, authUserId, null).catch(() => {});

        const total = rows.length > 0 ? Number(rows[0].total) : 0;
        const articles = rows.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          excerpt: r.excerpt,
          contentType: r.contentType,
          featuredImageUrl: r.featuredImageUrl,
          publishedAt: r.publishedAt,
          content: r.content,
          author: { displayName: r.authorDisplayName, avatarUrl: r.authorAvatarUrl },
        }));

        return NextResponse.json(
          successResponse(
            { articles, games: [], tags: [], users: [], videos: [], isFallback: true },
            undefined,
            buildPaginationMeta(pgPage, limit, total)
          )
        );
      } catch {
        // Fallback: tsvector not yet indexed — use ILIKE
        const where: Prisma.ArticleWhereInput = {
          status: "PUBLISHED",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { excerpt: { contains: q, mode: "insensitive" } },
            { ArticleTag: { some: { Tag: { name: { contains: q, mode: "insensitive" } } } } },
            { User_Article_authorIdToUser: { displayName: { contains: q, mode: "insensitive" } } },
          ],
        };

        if (contentType) where.contentType = contentType as ContentType;
        if (dateFrom || dateTo) {
          where.publishedAt = {};
          if (dateFrom) where.publishedAt.gte = new Date(dateFrom);
          if (dateTo) where.publishedAt.lte = new Date(dateTo);
        }

        const [articles, total] = await withRetry(() =>
          Promise.all([
            prisma.article.findMany({
              where,
              skip,
              take: limit,
              orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
              select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                contentType: true,
                guideType: true,
                featuredImageUrl: true,
                publishedAt: true,
                content: true,
                User_Article_authorIdToUser: { select: { username: true, displayName: true, avatarUrl: true } },
              },
            }),
            prisma.article.count({ where }),
          ])
        );

        return NextResponse.json(
          successResponse(
            {
              articles: articles.map(serializeArticle),
              games: [],
              tags: [],
              users: [],
              videos: [],
              isFallback: true,
            },
            undefined,
            buildPaginationMeta(pgPage, limit, total)
          )
        );
      }
    }
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
