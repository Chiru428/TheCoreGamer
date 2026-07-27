import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { url, store, articleSlug, gameSlug, ipAddress, userAgent, referrer } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(errorResponse("url is required"), { status: 400 });
    }
    if (!store || typeof store !== "string") {
      return NextResponse.json(errorResponse("store is required"), { status: 400 });
    }
    if (!ipAddress) {
      return NextResponse.json(errorResponse("ipAddress is required"), { status: 400 });
    }

    // Resolve slugs to IDs in parallel
    const [articleRecord, gameRecord] = await Promise.all([
      articleSlug
        ? prisma.article.findUnique({ where: { slug: String(articleSlug) }, select: { id: true } })
        : Promise.resolve(null),
      gameSlug
        ? prisma.game.findUnique({ where: { slug: String(gameSlug) }, select: { id: true } })
        : Promise.resolve(null),
    ]);

    const utmCampaign = store.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    const session = await auth();
    const userId = session?.user?.id ?? null;

    await withRetry(() =>
      prisma.affiliateClick.create({
        data: {
          url: String(url).slice(0, 2000),
          store: String(store).slice(0, 100),
          articleId: articleRecord?.id ?? null,
          gameId: gameRecord?.id ?? null,
          userId,
          utmCampaign,
          ipAddress: String(ipAddress).slice(0, 100),
          userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
          referrer: referrer ? String(referrer).slice(0, 500) : null,
        },
      })
    );

    return NextResponse.json(successResponse(null, "Click recorded"));
  } catch (err) {
    try {
      captureError(err, { route: "POST /api/analytics/affiliate-click" });
    } catch {
      /* intentionally empty */
    }
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
