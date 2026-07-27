import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { fetchGA4Realtime } from "@/lib/ga4";

const CACHE_KEY = "analytics:realtime";
const CACHE_TTL = 30;

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, "READ");
  if (rl) return rl;
  const ae = await requireRole(["ADMIN", "EDITOR"], request);
  if (ae) return ae;

  try {
    try {
      const cached = await cacheGet<Record<string, unknown>>(CACHE_KEY);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {
      /* intentionally empty */
    }

    const result = await fetchGA4Realtime();
    const payload = {
      activeUsers: result?.activeUsers ?? 0,
      topPages: result?.topPages ?? [],
      trafficSources: result?.trafficSources ?? [],
      updatedAt: new Date().toISOString(),
    };

    try {
      await cacheSet(CACHE_KEY, payload, CACHE_TTL);
    } catch {
      /* intentionally empty */
    }
    return NextResponse.json(successResponse(payload));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
