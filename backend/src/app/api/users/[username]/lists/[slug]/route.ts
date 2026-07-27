import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse, serializeArticle } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";

export const runtime = "nodejs";

const GAME_SELECT = {
  id: true,
  title: true,
  slug: true,
  coverImageUrl: true,
  releaseDate: true,
  platforms: true,
  genres: true,
  rating: true,
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string }> }
) {
  const { username, slug } = await params;

  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const cacheKey = `list:${username}:${slug}`;
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {
      /* intentionally empty */
    }

    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { username },
        select: { id: true, username: true, displayName: true, avatarUrl: true, profileVisibility: true },
      })
    );

    if (!user || user.profileVisibility === "PRIVATE") {
      return NextResponse.json(errorResponse("List not found"), { status: 404 });
    }

    const list = await withRetry(() =>
      prisma.readingList.findUnique({
        where: { userId_slug: { userId: user.id, slug } },
        include: {
          Items: {
            orderBy: { position: "asc" },
            include: {
              Article: {
                include: {
                  User_Article_authorIdToUser: {
                    select: { id: true, username: true, displayName: true, avatarUrl: true },
                  },
                  ArticleTag: { include: { Tag: true } },
                },
              },
              Game: { select: GAME_SELECT },
            },
          },
        },
      })
    );

    if (!list || !list.isPublic) {
      return NextResponse.json(errorResponse("List not found"), { status: 404 });
    }

    const { Items, userId, ...listRest } = list;
    const items = Items.map((item) => {
      const { Article, Game, ...rest } = item;
      return {
        ...rest,
        article: Article ? serializeArticle(Article) : null,
        game: Game,
      };
    });

    const response = {
      ...listRest,
      author: {
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      items,
    };

    try {
      await cacheSet(cacheKey, response, CACHE_TTL.MEDIUM);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(response));
  } catch (err) {
    captureError(err, { route: `GET /api/users/${username}/lists/${slug}` });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
