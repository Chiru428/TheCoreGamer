import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { rateLimit } from "@/middleware/rateLimit";

interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
  contentType: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  authorDisplayName: string;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR", "AUTHOR"], request);
    if (roleCheck) return roleCheck;

    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get("month"); // YYYY-MM
    const includePublished = searchParams.get("includePublished") === "true";

    // Parse month range
    let startDate: Date;
    let endDate: Date;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Build where clause for scheduled articles in the month
    const scheduledWhere: any = {
      scheduledAt: { gte: startDate, lte: endDate },
    };

    if (!includePublished) {
      scheduledWhere.status = { not: "PUBLISHED" };
    }

    // Query articles that have a scheduledAt in the target month, plus unscheduled
    const [scheduledArticles, unscheduledArticles] = await withRetry(() =>
      Promise.all([
        prisma.article.findMany({
          where: scheduledWhere,
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            contentType: true,
            scheduledAt: true,
            publishedAt: true,
            User_Article_authorIdToUser: {
              select: { displayName: true },
            },
          },
          orderBy: { scheduledAt: "asc" },
        }),
        prisma.article.findMany({
          where: {
            scheduledAt: null,
            status: { notIn: ["PUBLISHED", "ARCHIVED"] },
          },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            contentType: true,
            scheduledAt: true,
            publishedAt: true,
            User_Article_authorIdToUser: {
              select: { displayName: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        }),
      ])
    );

    function mapArticle(a: any): ArticleSummary {
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        status: a.status,
        contentType: a.contentType,
        scheduledAt: a.scheduledAt ? a.scheduledAt.toISOString() : null,
        publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
        authorDisplayName: a.User_Article_authorIdToUser?.displayName ?? "Unknown",
      };
    }

    // Group by YYYY-MM-DD key
    const byDate: Record<string, ArticleSummary[]> = {};
    for (const article of scheduledArticles) {
      const mapped = mapArticle(article);
      const dateKey = mapped.scheduledAt!.split("T")[0];
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(mapped);
    }

    return NextResponse.json(
      successResponse({
        byDate,
        unscheduled: unscheduledArticles.map(mapArticle),
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
