import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse, serializeArticle } from "@/types";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";

const ARTICLE_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  featuredImageUrl: true,
  contentType: true,
  status: true,
  featured: true,
  isBreaking: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  authorId: true,
  User_Article_authorIdToUser: {
    select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
  },
  ArticleTag: {
    select: { Tag: { select: { id: true, name: true, slug: true } } },
  },
  GameReview: {
    select: {
      id: true,
      reviewScore: true,
      verdict: true,
      gameId: true,
      Game: { select: { id: true, title: true, slug: true, coverImageUrl: true } },
    },
  },
  ModGuide: {
    select: {
      id: true,
      gameId: true,
      Game: { select: { id: true, title: true, slug: true } },
      MediaAttachment: {
        select: { id: true, filename: true, fileUrl: true, mimeType: true, fileSizeBytes: true },
      },
    },
  },
  Game: { select: { id: true, title: true } },
  _count: {
    select: {
      Comment: { where: { status: "APPROVED" as const } },
      ArticleReaction: { where: { type: "LIKE" as const } },
    },
  },
};

const CACHE_KEY = "homepage:data";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const bust = new URL(request.url).searchParams.get('bust') === '1';
    if (!bust) {
      try {
        const cached = await cacheGet<object>(CACHE_KEY);
        if (cached) return NextResponse.json(successResponse(cached));
      } catch {
        /* intentionally empty */
      }
    }

    const [featured, breaking, latest, news, walkthroughs, modGuides, reviews, popular, deals, listicles, features, opinions, homepagePoll1, homepagePoll2] =
      await withRetry(() =>
        Promise.all([
          prisma.article.findMany({
            where: { status: "PUBLISHED", featured: true },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 5,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED", isBreaking: true },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 10,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED" },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 12,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED", contentType: "NEWS" },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 15,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED", contentType: "WALKTHROUGH" },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 10,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED", contentType: "MOD_GUIDE" },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 10,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED", contentType: "REVIEW" },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 15,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED" },
            select: ARTICLE_SELECT,
            orderBy: { viewCount: "desc" },
            take: 9,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED", contentType: "DEAL" },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 10,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED", contentType: "LISTICLE" },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 10,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED", contentType: "FEATURE" },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 10,
          }),
          prisma.article.findMany({
            where: { status: "PUBLISHED", contentType: "OPINION" },
            select: ARTICLE_SELECT,
            orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
            take: 10,
          }),
          prisma.poll.findFirst({
            where: { homepageSlot: 1, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            select: { id: true },
          }),
          prisma.poll.findFirst({
            where: { homepageSlot: 2, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            select: { id: true },
          }),
        ])
      );

    const payload = {
      featured: featured.map(serializeArticle),
      breaking: breaking.map(serializeArticle),
      latest: latest.map(serializeArticle),
      news: news.map(serializeArticle),
      walkthroughs: walkthroughs.map(serializeArticle),
      modGuides: modGuides.map(serializeArticle),
      reviews: reviews.map(serializeArticle),
      popular: popular.map(serializeArticle),
      deals: deals.map(serializeArticle),
      listicles: listicles.map(serializeArticle),
      features: features.map(serializeArticle),
      opinions: opinions.map(serializeArticle),
      homepagePollId: homepagePoll1?.id ?? null,
      homepagePoll2Id: homepagePoll2?.id ?? null,
    };

    try {
      await cacheSet(CACHE_KEY, payload, CACHE_TTL.MEDIUM);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(payload));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE() {
  try {
    await cacheDelete(CACHE_KEY);
    return NextResponse.json({ ok: true, message: 'Homepage cache cleared' });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse('Failed to clear cache'), { status: 500 });
  }
}
