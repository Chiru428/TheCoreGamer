import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";
import { cacheGet, cacheSet } from "@/lib/redis";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { algoliaRecommendClient, algoliaClient } from "@/lib/algolia";
import type { RecommendationsRequest } from "algoliasearch";

const RECOMMEND_CACHE_TTL = 300; // seconds

const ATTRIBUTES_TO_RETRIEVE = [
  "title",
  "slug",
  "contentType",
  "featuredImageUrl",
  "coverImageUrl",
  "reviewScore",
  "editorialScore",
  "authorName",
  "publishedAtISO",
  "platforms",
];

interface SourceArticleAttrs {
  contentType?: string;
  gameSlug?: string | null;
  platforms?: string[];
}

// Hard-filters to only articles that share the same game, a platform, or the
// content type with the source article — unrelated articles are excluded
// entirely, not just ranked lower. Among the matches, optionalFilters weight
// the ordering (same game > shared platform > same content type), tiebroken
// by the index's custom ranking (viewCount, then publishedAt). Replaces the
// old Algolia Recommend model, which needs click-volume the site doesn't
// generate to train well. Returns [] if the source has nothing to match on.
async function getRelatedArticles(objectID: string, max: number): Promise<any[]> {
  const source = (await algoliaClient.getObject({
    indexName: "articles",
    objectID,
    attributesToRetrieve: ["contentType", "gameSlug", "platforms"],
  })) as SourceArticleAttrs;

  const matchClauses: string[] = [];
  const optionalFilters: string[] = [];
  if (source.gameSlug) {
    matchClauses.push(`gameSlug:"${source.gameSlug}"`);
    optionalFilters.push(`gameSlug:"${source.gameSlug}"<score=3>`);
  }
  for (const platform of source.platforms ?? []) {
    matchClauses.push(`platforms:"${platform}"`);
    optionalFilters.push(`platforms:"${platform}"<score=2>`);
  }
  if (source.contentType) {
    matchClauses.push(`contentType:"${source.contentType}"`);
    optionalFilters.push(`contentType:"${source.contentType}"<score=1>`);
  }

  if (matchClauses.length === 0) return [];

  const searchResult = await algoliaClient.searchSingleIndex({
    indexName: "articles",
    searchParams: {
      query: "",
      hitsPerPage: max,
      filters: `NOT objectID:"${objectID}" AND (${matchClauses.join(" OR ")})`,
      optionalFilters,
      attributesToRetrieve: ATTRIBUTES_TO_RETRIEVE,
    },
  });
  return searchResult.hits as any[];
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const objectID = searchParams.get("objectID");
    if (!objectID) return NextResponse.json(errorResponse("objectID is required"), { status: 400 });

    const index = searchParams.get("index") || "articles";
    const model = searchParams.get("model") || "related-products";
    const max = Math.max(1, parseInt(searchParams.get("max") || "6"));

    const cacheKey = `algolia:recommend:${index}:${objectID}`;
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {
      /* intentionally empty */
    }

    let hits: any[] = [];

    if (index === "articles") {
      try {
        hits = await getRelatedArticles(objectID, max);
      } catch (err) {
        captureError(err, { context: "related articles attribute search" });
      }
    } else {
      // Other indexes (e.g. games) still use Algolia Recommend's trained model.
      try {
        const result = await algoliaRecommendClient.getRecommendations({
          requests: [
            {
              indexName: index,
              objectID,
              model,
              maxRecommendations: max,
              threshold: 0,
              queryParameters: { attributesToRetrieve: ATTRIBUTES_TO_RETRIEVE },
            } as RecommendationsRequest,
          ],
        });
        hits = result.results[0]?.hits ?? [];
      } catch (recErr) {
        captureError(recErr, { context: "algolia getRecommendations" });
      }
    }

    try {
      await cacheSet(cacheKey, hits, RECOMMEND_CACHE_TTL);
    } catch {
      /* intentionally empty */
    }
    return NextResponse.json(successResponse(hits));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
