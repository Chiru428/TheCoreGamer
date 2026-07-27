import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { validateBody } from "@/middleware/validateBody";
import { createTagSchema } from "@/validators";
import { generateUniqueSlug } from "@/lib/slug";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet, cacheDeletePattern } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const cacheKey = "tags:all";
    try {
      const cached = await cacheGet<any>(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    const tags = await withRetry(() =>
      prisma.tag.findMany({
        orderBy: { ArticleTag: { _count: "desc" } },
        include: { _count: { select: { ArticleTag: true } } },
      })
    );

    try {
      await cacheSet(cacheKey, tags, CACHE_TTL.HOUR);
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(tags));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, createTagSchema);
    if (error) return error;

    const slug = await generateUniqueSlug(data.name, "tag");
    let tag;
    try {
      tag = await withRetry(() =>
        prisma.tag.create({
          data: {
            name: data.name,
            slug,
            description: data.description,
            color: data.color,
          },
        })
      );
    } catch (createErr: any) {
      // P2002 = unique constraint violation (duplicate tag name)
      if (createErr?.code === "P2002") {
        return NextResponse.json(errorResponse("A tag with this name already exists"), {
          status: 409,
        });
      }
      throw createErr;
    }

    try {
      await cacheDeletePattern("tags:*");
      await cacheDeletePattern("posts:list:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(tag, "Tag created"), { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
