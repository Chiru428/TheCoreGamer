import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";
import { cacheGet, cacheSet } from "@/lib/redis";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { algoliaClient, ARTICLES_INDEX, GAMES_INDEX, TAGS_INDEX } from "@/lib/algolia";

const AUTOCOMPLETE_CACHE_TTL = 60; // seconds

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const q = request.nextUrl.searchParams.get("q");
    if (!q || q.length < 2)
      return NextResponse.json(errorResponse("Query must be at least 2 characters"), {
        status: 400,
      });

    const cacheKey = `algolia:autocomplete:${q.toLowerCase()}`;
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {
      /* intentionally empty */
    }

    const { results } = await algoliaClient.search({
      requests: [
        { indexName: ARTICLES_INDEX, query: q, hitsPerPage: 5, page: 0 },
        { indexName: GAMES_INDEX, query: q, hitsPerPage: 4, page: 0 },
        { indexName: TAGS_INDEX, query: q, hitsPerPage: 3, page: 0 },
      ],
    });

    const [articleResults, gameResults, tagResults] = results as Array<{ hits?: unknown[] }>;

    const payload = {
      articles: articleResults.hits ?? [],
      games: gameResults.hits ?? [],
      tags: tagResults.hits ?? [],
    };

    try {
      await cacheSet(cacheKey, payload, AUTOCOMPLETE_CACHE_TTL);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(payload));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
