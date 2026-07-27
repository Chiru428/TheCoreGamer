import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const type = request.nextUrl.searchParams.get("type") || "traffic";
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    if (type === "traffic") {
      // Export article view data as CSV
      const where: Record<string, unknown> = { status: "PUBLISHED" };
      if (from) where.publishedAt = { ...(where.publishedAt as object), gte: new Date(from) };
      if (to) where.publishedAt = { ...(where.publishedAt as object), lte: new Date(to) };

      const articles = await prisma.article.findMany({
        where,
        orderBy: { viewCount: "desc" },
        select: { title: true, slug: true, viewCount: true, publishedAt: true, contentType: true },
      });

      const csv = [
        "Title,Slug,Views,Published,Type",
        ...articles.map(
          (a) =>
            `"${a.title}",${a.slug},${a.viewCount},${a.publishedAt?.toISOString() || ""},${a.contentType}`
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="traffic-export-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(errorResponse("Unsupported export type"), { status: 400 });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
