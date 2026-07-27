import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { createModGuideSchema } from "@/validators";
import { generateUniqueSlug } from "@/lib/slug";
import { captureError } from "@/lib/sentry";
import {
  parsePagination,
  buildPaginationMeta,
  successResponse,
  errorResponse,
  serializeArticle,
} from "@/types";
import type { Prisma } from "@/generated/prisma";
import { csrfProtection } from "@/middleware/csrfProtection";
import { withRetry } from "@/lib/withRetry";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const where: Prisma.ArticleWhereInput = { status: "PUBLISHED", contentType: "MOD_GUIDE" };
    const game = searchParams.get("game");
    if (game) where.ModGuide = { Game: { slug: game } };
    const difficulty = searchParams.get("difficulty");
    if (difficulty)
      where.ModGuide = {
        ...(where.ModGuide as object),
        difficulty: difficulty as "EASY" | "INTERMEDIATE" | "ADVANCED",
      };

    const sort = searchParams.get("sort");
    let orderBy: any[] = [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    if (sort === "oldest") orderBy = [{ publishedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }];
    if (sort === "alphabetical") orderBy = [{ title: "asc" }];
    if (sort === "updated") orderBy = [{ updatedAt: "desc" }];
    if (sort === "popular") orderBy = [{ viewCount: "desc" }];

    const [guides, total] = await withRetry(() =>
      Promise.all([
        prisma.article.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            User_Article_authorIdToUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            ModGuide: true,
          },
        }),
        prisma.article.count({ where }),
      ])
    );

    return NextResponse.json(
      successResponse(
        guides.map(serializeArticle),
        undefined,
        buildPaginationMeta(page, limit, total)
      )
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;
    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const { data, error } = await validateBody(request, createModGuideSchema);
    if (error) return error;

    if (data.pendingDraftId) {
      try {
        await (await import("@/lib/redis")).redis.del(`autosave:pending:${data.pendingDraftId}`);
      } catch (e) {}
    }

    const slug = data.slug
      ? await generateUniqueSlug(data.slug)
      : await generateUniqueSlug(data.title);

    const result = await withRetry(() =>
      prisma.article.create({
        data: {
          title: data.title,
          slug,
          content: data.content as Prisma.InputJsonValue,
          excerpt: data.excerpt,
          featuredImageUrl: data.featuredImageUrl,
          featuredImageCredit: data.featuredImageCredit,
          contentType: "MOD_GUIDE",
          authorId: session!.user.id,
          status: data.status || "DRAFT",
          featured: data.featured,
          isBreaking: data.isBreaking,
          isSponsored: data.isSponsored,
          sponsorName: data.sponsorName,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          embargoUntil: data.embargoUntil ? new Date(data.embargoUntil) : undefined,
          ArticleTag: data.tagIds
            ? { create: data.tagIds.map((id: string) => ({ tagId: id })) }
            : undefined,
          Game: data.gameIds ? { connect: data.gameIds.map((id: string) => ({ id })) } : undefined,
          ModGuide: {
            create: {
              gameName: data.gameName,
              modName: data.modName,
              gameVersionNotes: data.gameVersionNotes,
              gameVersion: data.gameVersion,
              gameVersionDate: data.gameVersionDate ? new Date(data.gameVersionDate) : undefined,
              compatibilityNotes: data.compatibilityNotes,
              difficulty: data.difficulty,
              estimatedInstallMinutes: data.estimatedInstallMinutes,
              prerequisiteList: data.prerequisiteList,
              sections: (data.sections ?? null) as Prisma.InputJsonValue,
              bodyTitle: data.bodyTitle,
              installationTitle: data.installationTitle,
              gameId: data.gameId,
            },
          },
        },
        include: { ModGuide: true },
      })
    );

    return NextResponse.json(successResponse(result, "Mod guide created"), { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
