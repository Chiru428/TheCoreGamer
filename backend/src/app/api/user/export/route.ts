import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { rateLimit } from "@/middleware/rateLimit";
import { csrfProtection } from "@/middleware/csrfProtection";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const csrfError = csrfProtection(request);
    if (csrfError) return csrfError;
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = session!.user.id;

    // Split across two batches to avoid exhausting the connection pool (limit of 10).
    const [user, articles, comments, bookmarks, reactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      prisma.article.findMany({
        where: { authorId: userId },
        select: { id: true, title: true, slug: true, status: true, createdAt: true },
      }),
      prisma.comment.findMany({
        where: { authorId: userId },
        select: { id: true, body: true, createdAt: true, Article: { select: { title: true, slug: true, contentType: true } } },
      }),
      prisma.bookmark.findMany({
        where: { userId },
        select: { id: true, createdAt: true, Article: { select: { title: true, slug: true, contentType: true } } },
      }),
      prisma.articleReaction.findMany({
        where: { userId },
        select: { id: true, type: true, createdAt: true, Article: { select: { title: true, slug: true, contentType: true } } },
      }),
    ]);

    const [ratings, readingLists, notifications] = await Promise.all([
      prisma.userRating.findMany({
        where: { userId },
        select: { id: true, score: true, body: true, createdAt: true, updatedAt: true, Game: { select: { title: true, slug: true } } },
      }),
      prisma.readingList.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          description: true,
          isPublic: true,
          createdAt: true,
          Items: { 
            select: { 
              position: true, 
              addedAt: true,
              Article: { select: { title: true, slug: true, contentType: true } },
              Game: { select: { title: true, slug: true } }
            } 
          },
        },
      }),
      prisma.inAppNotification.findMany({
        where: { userId },
        select: { id: true, type: true, title: true, body: true, url: true, isRead: true, createdAt: true },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: user,
      articlesAuthored: articles,
      comments,
      ratings,
      bookmarks,
      readingLists,
      notifications,
      reactions,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="thecoregamer-data-export.json"`,
      },
    });
  } catch (err) {
    captureError(err, { route: "GET /api/user/export" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
