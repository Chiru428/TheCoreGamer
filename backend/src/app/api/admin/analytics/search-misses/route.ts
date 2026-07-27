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
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const misses = await prisma.searchMiss.groupBy({
      by: ["query"],
      where: { createdAt: { gte: since } },
      _count: { query: true },
      _max: { createdAt: true },
      orderBy: { _count: { query: "desc" } },
      take: 50,
    });
    return NextResponse.json(
      successResponse(
        misses.map((m: any) => ({
          query: m.query,
          count: m._count.query,
          lastSearchedAt: m._max.createdAt,
        }))
      )
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
