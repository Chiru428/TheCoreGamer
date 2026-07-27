import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole, requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet, cacheDeletePattern, cacheDelete } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { createPollSchema } from "@/validators";
import { csrfProtection } from "@/middleware/csrfProtection";

/**
 * GET /api/polls?articleId=&active=true
 * List polls, optionally filtered by article or active status.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const articleId = searchParams.get("articleId");
    const activeOnly = searchParams.get("active") !== "false";

    // Determine viewer for user vote lookup
    let viewerId: string | null = null;
    try {
      const { session } = await requireAuth();
      viewerId = session?.user?.id ?? null;
    } catch {
      /* intentionally empty */
    }

    const cacheKey = `polls:list:a${articleId ?? "all"}:active${activeOnly}`;

    try {
      const cached = await cacheGet<unknown[]>(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {
      /* intentionally empty */
    }

    const where: Record<string, unknown> = {};
    if (articleId) where.articleId = articleId;
    if (activeOnly) where.isActive = true;
    // Exclude expired polls
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];

    const polls = await withRetry(() =>
      prisma.poll.findMany({
        where,
        include: {
          Options: { orderBy: { id: "asc" } },
          Votes: viewerId ? { where: { userId: viewerId }, select: { optionId: true } } : false,
          Article: { select: { title: true, slug: true, contentType: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    );

    // For each poll, find articles that embed it inline in their content JSON
    // (separate from the poll's own optional `articleId` FK) so the admin list
    // can flag polls created from an inline-poll block in an article.
    const inlineArticlesByPoll = await withRetry(() =>
      Promise.all(
        polls.map((p) =>
          prisma.article.findMany({
            where: { content: { path: [], string_contains: p.id } },
            select: { id: true, title: true, slug: true, contentType: true },
            take: 3,
          })
        )
      )
    );

    const result = polls.map((p, i) => ({
      ...p,
      totalVotes: p.voterCount,
      userVotes: p.Votes ? p.Votes.map((v) => (v as { optionId: string }).optionId) : [],
      Votes: undefined,
      inlineArticles: inlineArticlesByPoll[i],
    }));

    try {
      await cacheSet(cacheKey, result, CACHE_TTL.SHORT);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/**
 * POST /api/polls
 * Create a new poll. Requires EDITOR or ADMIN role.
 * Body: { question, options: string[], articleId?, expiresAt? }
 */
export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, createPollSchema);
    if (error) return error;

    const { session } = await requireAuth();

    const poll = await withRetry(() =>
      prisma.$transaction(async (tx) => {
        // Clear existing poll in the same slot before assigning
        if (data.homepageSlot != null) {
          await tx.poll.updateMany({
            where: { homepageSlot: data.homepageSlot },
            data: { homepageSlot: null },
          });
        }
        return tx.poll.create({
          data: {
            question: data.question,
            articleId: data.articleId ?? null,
            createdById: session!.user.id,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            allowMultiple: data.allowMultiple ?? false,
            homepageSlot: data.homepageSlot ?? null,
            Options: {
              create: data.options.map((opt: { text: string; allowCustomInput?: boolean }) => ({
                text: opt.text,
                allowCustomInput: opt.allowCustomInput ?? false,
              })),
            },
          },
          include: { Options: true },
        });
      })
    );

    try {
      const invalidations: Promise<unknown>[] = [cacheDeletePattern("polls:list:*")];
      if (data.homepageSlot != null) invalidations.push(cacheDelete("homepage:data"));
      await Promise.all(invalidations);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(
      successResponse({ ...poll, totalVotes: 0, userVotes: [] }, "Poll created"),
      { status: 201 }
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
