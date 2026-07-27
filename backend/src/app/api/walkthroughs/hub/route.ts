import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, serializeArticle } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitLatest = Number(searchParams.get("limitLatest")) || 6;
    const limitPerGame = Number(searchParams.get("limitPerGame")) || 10;
    
    const cacheKey = `walkthroughs:hub:l${limitLatest}:p${limitPerGame}`;
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return NextResponse.json(successResponse(cached));
      }
    } catch (err) {}

    const articleSelect = {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImageUrl: true,
      status: true,
      contentType: true,
      publishedAt: true,
      updatedAt: true,
      viewCount: true,
      authorId: true,
      User_Article_authorIdToUser: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      ArticleTag: { select: { Tag: { select: { id: true, name: true, slug: true } } } },
      Game: { select: { id: true, title: true, slug: true } }
    };

    // 1. Fetch latest walkthroughs across all games
    const latestRaw = await prisma.article.findMany({
      where: { contentType: "WALKTHROUGH", status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: limitLatest,
      select: articleSelect,
    });

    // We have to ignore TypeScript errors because serializeArticle expects the full generated Prisma Article type, but we are doing a partial select.
    // At runtime this works fine.
    const latest = (latestRaw as any).map(serializeArticle);

    // 2. Fetch games that have walkthroughs, including their walkthroughs
    const gamesRaw = await prisma.game.findMany({
      where: {
        Article: { some: { contentType: "WALKTHROUGH", status: "PUBLISHED" } }
      },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImageUrl: true,
        Article: {
          where: { contentType: "WALKTHROUGH", status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: limitPerGame,
          select: articleSelect,
        }
      }
    });

    // Format games response
    const games = gamesRaw.map(game => ({
      id: game.id,
      title: game.title,
      slug: game.slug,
      coverImageUrl: game.coverImageUrl,
      articles: (game.Article as any).map(serializeArticle)
    }));

    const data = { latest, games };

    try {
      await cacheSet(cacheKey, data, CACHE_TTL.LONG);
    } catch (err) {}

    return NextResponse.json(successResponse(data));
  } catch (error) {
    console.error("[Walkthroughs Hub API Error]:", error);
    return NextResponse.json(errorResponse("Internal Server Error"), { status: 500 });
  }
}
