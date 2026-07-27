import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { fetchGA4Overview } from "@/lib/ga4";
import { withRetry } from "@/lib/withRetry";

function countWordsInContent(node: any): number {
  if (!node) return 0;
  if (typeof node === "string") {
    return node
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }
  if (Array.isArray(node)) {
    return node.reduce((acc, child) => acc + countWordsInContent(child), 0);
  }
  if (typeof node === "object") {
    let count = 0;
    if (node.text) {
      count += countWordsInContent(node.text);
    }
    if (node.content) {
      count += countWordsInContent(node.content);
    }
    for (const key in node) {
      if (key !== "text" && key !== "content" && typeof node[key] === "object") {
        count += countWordsInContent(node[key]);
      }
    }
    return count;
  }
  return 0;
}

export async function GET(request: Request) {
  try {
    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    // 1. Fetch live page views from Redis (since GA4 data is delayed by 24-48 hours)
    const { redis } = await import("@/lib/redis");
    const viewsByDate: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      viewsByDate[d.toISOString().slice(0, 10)] = 0;
    }
    try {
      const keys = Object.keys(viewsByDate).map((date) => `analytics:pageviews:${date}`);
      const values = await redis.mget(...keys);
      keys.forEach((key, idx) => {
        const date = key.replace("analytics:pageviews:", "");
        viewsByDate[date] = Number(values[idx] ?? 0);
      });
    } catch {
      // Redis unavailable — chart stays at 0 for all days
    }
    const redisPageViews = Object.entries(viewsByDate).map(([date, views]) => ({ date, views }));

    // 2. Try to fetch real-time GA4 data
    const ga4Data = await fetchGA4Overview();
    if (ga4Data) {
      // Merge GA4 page views with Redis page views (use max to cover GA4 delay for today/yesterday)
      const mergedPageViews = redisPageViews.map((redisPv) => {
        const ga4Pv = ga4Data.pageViews.find(p => p.date === redisPv.date);
        return {
          date: redisPv.date,
          views: Math.max(redisPv.views, ga4Pv?.views || 0)
        };
      });

      return NextResponse.json(
        successResponse({
          pageViews: mergedPageViews,
          totalViews: mergedPageViews.reduce((s, p) => s + p.views, 0),
          bounceRate: ga4Data.bounceRate,
          sessionDuration: Math.round(ga4Data.averageSessionDuration),
          uniqueVisitors: ga4Data.activeUsers,
          source: "GA4 + Live",
        })
      );
    }

    // 3. Database Fallback (if GA4 has no data yet or fails)
    let totalViewsResult: any;
    let totalPublished = 0;
    let noEngagementArticles = 0;
    let publishedArticles: any[] = [];

    await withRetry(async () => {
      totalViewsResult = await prisma.article.aggregate({
        where: { status: "PUBLISHED" },
        _sum: { viewCount: true },
      });
      totalPublished = await prisma.article.count({
        where: { status: "PUBLISHED" },
      });
      noEngagementArticles = await prisma.article.count({
        where: {
          status: "PUBLISHED",
          Comment: { none: {} },
          ArticleReaction: { none: {} },
        },
      });
      publishedArticles = await prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: { content: true },
      });
    });

    const totalViews = Number(totalViewsResult._sum.viewCount || 0n);
    const uniqueVisitors = totalViews; // Proxy viewcount total as unique visitors for fallback

    const bounceRate = totalPublished > 0 ? noEngagementArticles / totalPublished : 0;

    let totalWords = 0;
    for (const a of publishedArticles) {
      totalWords += countWordsInContent(a.content);
    }
    const averageWords = publishedArticles.length > 0 ? totalWords / publishedArticles.length : 0;
    const sessionDuration = Math.max(30, Math.floor(averageWords / 3.33)); // 200 wpm average (3.33 words per second)

    return NextResponse.json(
      successResponse({
        pageViews: redisPageViews,
        totalViews: redisPageViews.reduce((s, p) => s + p.views, 0) || totalViews,
        bounceRate,
        sessionDuration,
        uniqueVisitors,
        source: "Database (Fallback)",
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
