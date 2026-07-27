import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { rateLimit } from "@/middleware/rateLimit";

/** GET /api/admin/analytics/needs-refresh
 *  Articles: publishedAt > 90 days ago, viewCount > 500,
 *  lastMajorUpdateAt IS NULL or > 60 days ago — sorted by viewCount desc
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo  = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const articles = await withRetry(() =>
      prisma.article.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: { lt: ninetyDaysAgo },
          viewCount: { gt: 500 },
          OR: [
            { lastMajorUpdateAt: null },
            { lastMajorUpdateAt: { lt: sixtyDaysAgo } },
          ],
        },
        orderBy: { viewCount: "desc" },
        take: 100,
        select: {
          id: true,
          slug: true,
          title: true,
          publishedAt: true,
          viewCount: true,
          lastMajorUpdateAt: true,
          lastMajorUpdateNote: true,
          contentType: true,
          User_Article_authorIdToUser: {
            select: { id: true, displayName: true, username: true },
          },
        },
      })
    );

    const result = articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      publishedAt: a.publishedAt,
      viewCount: Number(a.viewCount),
      lastMajorUpdateAt: a.lastMajorUpdateAt,
      lastMajorUpdateNote: a.lastMajorUpdateNote,
      contentType: a.contentType,
      author: a.User_Article_authorIdToUser
        ? {
            id: a.User_Article_authorIdToUser.id,
            displayName: a.User_Article_authorIdToUser.displayName,
            username: a.User_Article_authorIdToUser.username,
          }
        : null,
      daysSinceUpdate: a.lastMajorUpdateAt
        ? Math.floor((Date.now() - new Date(a.lastMajorUpdateAt).getTime()) / 86400000)
        : null,
      daysSincePublished: a.publishedAt
        ? Math.floor((Date.now() - new Date(a.publishedAt).getTime()) / 86400000)
        : null,
    }));

    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
