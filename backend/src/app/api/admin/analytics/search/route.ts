import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, "READ");
  if (rl) return rl;
  const ae = await requireRole(["ADMIN", "EDITOR"], request);
  if (ae) return ae;

  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "30d";
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));

    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[period] ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ── Top Queries (by search volume, with avg result count) ──────────────
    const topQueriesRaw = await prisma.searchQuery.groupBy({
      by: ["query"],
      where: { createdAt: { gte: since } },
      _count: { query: true },
      _avg: { resultCount: true },
      orderBy: { _count: { query: "desc" } },
      take: limit,
    });

    const topQueries = topQueriesRaw.map((r: any) => ({
      query: r.query,
      count: r._count.query,
      avgResults: Math.round((r._avg.resultCount ?? 0) * 10) / 10,
    }));

    // ── Zero Result Queries (content gaps) ─────────────────────────────────
    const zeroResultRaw = await prisma.searchQuery.groupBy({
      by: ["query"],
      where: { createdAt: { gte: since }, resultCount: 0 },
      _count: { query: true },
      _max: { createdAt: true },
      orderBy: { _count: { query: "desc" } },
      take: limit,
    });

    const zeroResultQueries = zeroResultRaw.map((r: any) => ({
      query: r.query,
      count: r._count.query,
      lastSeen: r._max.createdAt,
    }));

    // ── Search Volume Trend (per-day counts) ───────────────────────────────
    // Build a date-bucketed series using raw SQL for efficiency
    type TrendRow = { date: string; count: bigint };
    const trendRaw = await prisma.$queryRawUnsafe<TrendRow[]>(
      `SELECT DATE("createdAt")::text AS date, COUNT(*)::bigint AS count
       FROM "SearchQuery"
       WHERE "createdAt" >= $1
       GROUP BY DATE("createdAt")
       ORDER BY DATE("createdAt") ASC`,
      since
    );

    // Fill in missing days with 0 so the chart line is continuous
    const trendMap = new Map<string, number>();
    for (const row of trendRaw) {
      trendMap.set(row.date, Number(row.count));
    }

    const searchVolumeTrend: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      searchVolumeTrend.push({ date: key, count: trendMap.get(key) ?? 0 });
    }

    return NextResponse.json(
      successResponse({
        topQueries,
        zeroResultQueries,
        searchVolumeTrend,
        period,
        totalSearches: topQueriesRaw.reduce((s: number, r: any) => s + r._count.query, 0),
        uniqueQueries: topQueriesRaw.length,
        zeroResultCount: zeroResultRaw.reduce((s: number, r: any) => s + r._count.query, 0),
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
