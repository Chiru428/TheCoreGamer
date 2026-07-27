import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { generateBaseSlug } from "@/lib/slug";

/** GET /api/admin/series — list all series */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const series = await withRetry(() =>
      prisma.articleSeries.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          Author: { select: { displayName: true } },
          _count: { select: { Entries: true } },
        },
      })
    );

    return NextResponse.json(
      successResponse(
        series.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          description: s.description,
          coverImageUrl: s.coverImageUrl,
          isComplete: s.isComplete,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          authorName: s.Author?.displayName ?? null,
          articleCount: s._count.Entries,
        }))
      )
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/** POST /api/admin/series — create a new series */
export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(errorResponse("Invalid JSON body"), { status: 400 });
    }

    const { name, slug, description, coverImageUrl, isComplete } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(errorResponse("Series name is required"), { status: 400 });
    }

    const finalSlug = (slug && typeof slug === "string" && slug.trim())
      ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      : generateBaseSlug(name);

    // Check uniqueness
    const existing = await withRetry(() =>
      prisma.articleSeries.findUnique({ where: { slug: finalSlug } })
    );
    if (existing) {
      return NextResponse.json(errorResponse("A series with this slug already exists"), { status: 409 });
    }

    const series = await withRetry(() =>
      prisma.articleSeries.create({
        data: {
          name: name.trim(),
          slug: finalSlug,
          description: description || null,
          coverImageUrl: coverImageUrl || null,
          isComplete: Boolean(isComplete),
        },
      })
    );

    return NextResponse.json(successResponse(series, "Series created"), { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
