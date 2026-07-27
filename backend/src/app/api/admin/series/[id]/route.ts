import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function serializeSeries(s: any) {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    coverImageUrl: s.coverImageUrl,
    isComplete: s.isComplete,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    authorName: s.Author?.displayName ?? null,
    entries: (s.Entries ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((e: any) => ({
        id: e.id,
        position: e.position,
        displayTitle: e.displayTitle,
        article: e.Article
          ? {
              id: e.Article.id,
              title: e.Article.title,
              slug: e.Article.slug,
              status: e.Article.status,
              contentType: e.Article.contentType,
              featuredImageUrl: e.Article.featuredImageUrl,
              publishedAt: e.Article.publishedAt,
              excerpt: e.Article.excerpt,
            }
          : null,
      })),
  };
}

/** GET /api/admin/series/[id] */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;

    const series = await withRetry(() =>
      prisma.articleSeries.findUnique({
        where: { id },
        include: {
          Author: { select: { displayName: true } },
          Entries: {
            include: {
              Article: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  status: true,
                  contentType: true,
                  featuredImageUrl: true,
                  publishedAt: true,
                  excerpt: true,
                },
              },
            },
            orderBy: { position: "asc" },
          },
        },
      })
    );

    if (!series) {
      return NextResponse.json(errorResponse("Series not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(serializeSeries(series)));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/** PUT /api/admin/series/[id] — update series + manage entries */
export async function PUT(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;

    const series = await withRetry(() =>
      prisma.articleSeries.findUnique({ where: { id } })
    );
    if (!series) {
      return NextResponse.json(errorResponse("Series not found"), { status: 404 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(errorResponse("Invalid JSON body"), { status: 400 });
    }

    const {
      name,
      description,
      coverImageUrl,
      isComplete,
      // entries: [{ articleId, position, displayTitle }]
      entries,
      // addArticleId: string | null — add a new article
      addArticleId,
      // removeEntryId: string | null — remove an entry
      removeEntryId,
    } = body;

    // Update series fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl || null;
    if (isComplete !== undefined) updateData.isComplete = Boolean(isComplete);

    if (Object.keys(updateData).length > 0) {
      await withRetry(() =>
        prisma.articleSeries.update({ where: { id }, data: updateData })
      );
    }

    // Reorder entries (full position array)
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry.id && typeof entry.position === "number") {
          await withRetry(() =>
            prisma.articleSeriesEntry.update({
              where: { id: entry.id },
              data: {
                position: entry.position,
                displayTitle: entry.displayTitle ?? null,
              },
            })
          );
        }
      }
    }

    // Add a new article to the series
    if (addArticleId && typeof addArticleId === "string") {
      const existingCount = await withRetry(() =>
        prisma.articleSeriesEntry.count({ where: { seriesId: id } })
      );
      // Check if article already in series
      const alreadyIn = await withRetry(() =>
        prisma.articleSeriesEntry.findUnique({ where: { articleId: addArticleId } })
      );
      if (!alreadyIn) {
        await withRetry(() =>
          prisma.articleSeriesEntry.create({
            data: {
              seriesId: id,
              articleId: addArticleId,
              position: existingCount + 1,
            },
          })
        );
      }
    }

    // Remove an entry
    if (removeEntryId && typeof removeEntryId === "string") {
      await withRetry(() =>
        prisma.articleSeriesEntry.delete({ where: { id: removeEntryId } }).catch(() => null)
      );
    }

    // Return updated series
    const updated = await withRetry(() =>
      prisma.articleSeries.findUnique({
        where: { id },
        include: {
          Author: { select: { displayName: true } },
          Entries: {
            include: {
              Article: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  status: true,
                  contentType: true,
                  featuredImageUrl: true,
                  publishedAt: true,
                  excerpt: true,
                },
              },
            },
            orderBy: { position: "asc" },
          },
        },
      })
    );

    return NextResponse.json(successResponse(serializeSeries(updated!), "Series updated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/** DELETE /api/admin/series/[id] */
export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;

    const series = await withRetry(() =>
      prisma.articleSeries.findUnique({ where: { id } })
    );
    if (!series) {
      return NextResponse.json(errorResponse("Series not found"), { status: 404 });
    }

    await withRetry(() => prisma.articleSeries.delete({ where: { id } }));

    return NextResponse.json(successResponse(null, "Series deleted"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
