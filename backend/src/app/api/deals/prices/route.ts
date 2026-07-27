import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const showHistory = searchParams.get("history") === "true";
    const gameIdParam = searchParams.get("gameId") || undefined;

    if (showHistory && gameIdParam) {
      const now = new Date();
      const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
      const snapshots = await prisma.priceSnapshot.findMany({
        where: { gameId: gameIdParam, recordedAt: { gte: since } },
        orderBy: { recordedAt: "asc" },
        take: 500,
        select: { shop: true, priceINR: true, recordedAt: true },
      });
      // Group by shop
      const byShop: Record<string, { price: number; date: string }[]> = {};
      for (const s of snapshots) {
        if (!byShop[s.shop]) byShop[s.shop] = [];
        byShop[s.shop].push({ price: Number(s.priceINR), date: s.recordedAt.toISOString() });
      }
      // Compute all-time low
      const allPrices = snapshots.map((s) => Number(s.priceINR));
      const allTimeLow = allPrices.length ? Math.min(...allPrices) : null;
      return NextResponse.json(successResponse({ history: byShop, allTimeLow }));
    }

    const { page, limit, skip } = parsePagination(searchParams);
    const gameSlug = searchParams.get("gameSlug") || undefined;

    const cacheKey = `deals:prices:p${page}:l${limit}:g${gameSlug || ""}:i${gameIdParam || ""}`;

    try {
      const cached = await cacheGet<{ data: unknown[]; total: number }>(cacheKey);
      if (cached) {
        return NextResponse.json(
          successResponse(
            cached.data as any,
            undefined,
            buildPaginationMeta(page, limit, cached.total)
          )
        );
      }
    } catch {
      /* intentionally empty */
    }

    const where = gameSlug ? { Game: { slug: gameSlug } } : gameIdParam ? { gameId: gameIdParam } : {};

    const [snapshots, groups] = await withRetry(() =>
      Promise.all([
        prisma.priceSnapshot.findMany({
          where,
          distinct: ["gameId", "shop"],
          orderBy: [{ gameId: "asc" }, { shop: "asc" }, { recordedAt: "desc" }],
          skip,
          take: limit,
          include: {
            Game: {
              select: { id: true, title: true, slug: true, coverImageUrl: true },
            },
          },
        }),
        prisma.priceSnapshot.groupBy({
          by: ["gameId", "shop"],
          where,
        }),
      ])
    );

    const total = groups.length;

    // Serialize Decimal fields to numbers for JSON transport
    const serialized = snapshots.map((s) => {
      const storeLow = (s as any).storeLowINR != null ? Number((s as any).storeLowINR) : Number(s.priceINR);
      return {
        ...s,
        priceINR: Number(s.priceINR),
        regularINR: s.regularINR != null ? Number(s.regularINR) : undefined,
        historicalLow: storeLow,
        dealScore: Math.min(5, Math.round(s.cutPercent / 20)),
      };
    });

    try {
      // Use a short TTL so the PricesTab client-side fetch always gets
      // near-current data after the hourly deals worker writes new snapshots.
      await cacheSet(cacheKey, { data: serialized, total }, CACHE_TTL.SHORT);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(
      successResponse(serialized, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
